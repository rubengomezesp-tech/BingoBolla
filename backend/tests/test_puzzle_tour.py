"""USA Puzzle Tour - Backend regression tests
Covers: auth (register/login/me), worlds listing, world levels, progress completion + unlock chain.
"""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://d89fc02a-63bd-432a-ac96-d03eec48a02c.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

TEST_EMAIL = "tester@puzzletour.com"
TEST_PASSWORD = "Test12345"


# -------- fixtures --------
@pytest.fixture(scope="module")
def existing_token():
    r = requests.post(f"{API}/auth/login", json={"email": TEST_EMAIL, "password": TEST_PASSWORD})
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="module")
def fresh_user():
    """Brand new user (no progress) for clean unlock-chain testing."""
    email = f"qa+{int(time.time()*1000)}@puzzletour.com"
    r = requests.post(f"{API}/auth/register", json={"email": email, "password": "Test12345", "name": "QA Bot"})
    assert r.status_code == 200, f"Register failed: {r.status_code} {r.text}"
    body = r.json()
    return {"email": email, "token": body["token"], "user": body["user"]}


def auth(token):
    return {"Authorization": f"Bearer {token}"}


# -------- AUTH --------
class TestAuth:
    def test_register_new_user(self):
        email = f"qa+reg{int(time.time()*1000)}@puzzletour.com"
        r = requests.post(f"{API}/auth/register", json={"email": email, "password": "Test12345"})
        assert r.status_code == 200
        data = r.json()
        assert "token" in data and isinstance(data["token"], str) and len(data["token"]) > 20
        assert data["user"]["email"] == email

    def test_register_duplicate(self):
        r = requests.post(f"{API}/auth/register", json={"email": TEST_EMAIL, "password": "Test12345"})
        assert r.status_code == 400

    def test_login_success(self, existing_token):
        assert existing_token

    def test_login_invalid(self):
        r = requests.post(f"{API}/auth/login", json={"email": TEST_EMAIL, "password": "wrongpass"})
        assert r.status_code == 401

    def test_me_with_token(self, existing_token):
        r = requests.get(f"{API}/auth/me", headers=auth(existing_token))
        assert r.status_code == 200
        body = r.json()
        assert body["email"] == TEST_EMAIL
        assert "id" in body

    def test_me_without_token(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401


# -------- WORLDS --------
class TestWorlds:
    def test_list_worlds(self, fresh_user):
        r = requests.get(f"{API}/worlds", headers=auth(fresh_user["token"]))
        assert r.status_code == 200
        body = r.json()
        worlds = body["worlds"]
        assert len(worlds) == 5
        ids = [w["id"] for w in worlds]
        assert ids == ["miami", "vegas", "la", "california", "newyork"]
        # Fresh user → only Miami unlocked
        assert worlds[0]["unlocked"] is True
        for w in worlds[1:]:
            assert w["unlocked"] is False
        assert body["total_stars"] == 0

    def test_worlds_unauth(self):
        r = requests.get(f"{API}/worlds")
        assert r.status_code == 401

    def test_miami_levels(self, fresh_user):
        r = requests.get(f"{API}/worlds/miami/levels", headers=auth(fresh_user["token"]))
        assert r.status_code == 200
        body = r.json()
        assert len(body["levels"]) == 20
        # First level unlocked, rest locked
        assert body["levels"][0]["unlocked"] is True
        assert body["levels"][0]["completed"] is False
        assert body["levels"][1]["unlocked"] is False
        # Game-type rotation
        assert body["levels"][0]["game_type"] == "match3"
        assert body["levels"][5]["game_type"] == "memory"
        assert body["levels"][10]["game_type"] == "slide"
        assert body["levels"][15]["game_type"] == "wordsearch"

    def test_locked_world_levels_forbidden(self, fresh_user):
        r = requests.get(f"{API}/worlds/vegas/levels", headers=auth(fresh_user["token"]))
        assert r.status_code == 403

    def test_unknown_world(self, fresh_user):
        r = requests.get(f"{API}/worlds/atlantis/levels", headers=auth(fresh_user["token"]))
        assert r.status_code == 404


# -------- PROGRESS --------
class TestProgress:
    def test_complete_level1_unlocks_level2(self, fresh_user):
        token = fresh_user["token"]
        payload = {"world_id": "miami", "level": 1, "stars": 3, "score": 500, "moves": 12, "time_seconds": 30}
        r = requests.post(f"{API}/progress/complete", json=payload, headers=auth(token))
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["ok"] is True
        assert body["stars"] == 3
        assert body["total_stars"] == 3

        # Verify persistence + unlock chain
        r2 = requests.get(f"{API}/worlds/miami/levels", headers=auth(token))
        levels = r2.json()["levels"]
        assert levels[0]["completed"] is True
        assert levels[0]["stars"] == 3
        assert levels[1]["unlocked"] is True
        assert levels[2]["unlocked"] is False

    def test_skip_level_blocked(self, fresh_user):
        # Cannot complete level 5 before levels 2-4
        r = requests.post(
            f"{API}/progress/complete",
            json={"world_id": "miami", "level": 5, "stars": 1, "score": 100},
            headers=auth(fresh_user["token"]),
        )
        assert r.status_code == 403

    def test_idempotent_keeps_max_stars(self, fresh_user):
        token = fresh_user["token"]
        # Re-complete level 1 with fewer stars - should preserve 3
        r = requests.post(
            f"{API}/progress/complete",
            json={"world_id": "miami", "level": 1, "stars": 1, "score": 50},
            headers=auth(token),
        )
        assert r.status_code == 200
        assert r.json()["stars"] == 3  # max preserved

    def test_locked_world_complete_blocked(self, fresh_user):
        r = requests.post(
            f"{API}/progress/complete",
            json={"world_id": "vegas", "level": 1, "stars": 1, "score": 10},
            headers=auth(fresh_user["token"]),
        )
        assert r.status_code == 403

    def test_invalid_payload(self, fresh_user):
        r = requests.post(
            f"{API}/progress/complete",
            json={"world_id": "miami", "level": 99, "stars": 1},
            headers=auth(fresh_user["token"]),
        )
        assert r.status_code == 422  # Pydantic validation

    def test_full_world_completion_unlocks_vegas(self, fresh_user):
        token = fresh_user["token"]
        # Complete remaining levels 2..20 of miami sequentially (level 1 already done)
        for lvl in range(2, 21):
            r = requests.post(
                f"{API}/progress/complete",
                json={"world_id": "miami", "level": lvl, "stars": 3, "score": 500},
                headers=auth(token),
            )
            assert r.status_code == 200, f"Level {lvl} failed: {r.text}"
        # Now total_stars >= 20 → vegas should unlock
        r = requests.get(f"{API}/worlds", headers=auth(token))
        worlds = {w["id"]: w for w in r.json()["worlds"]}
        assert worlds["vegas"]["unlocked"] is True
        # And vegas levels should now be accessible
        r2 = requests.get(f"{API}/worlds/vegas/levels", headers=auth(token))
        assert r2.status_code == 200
