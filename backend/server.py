from dotenv import load_dotenv
load_dotenv()

import os
import uuid
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field
from motor.motor_asyncio import AsyncIOMotorClient

# ---------- Config ----------
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_DAYS = 7

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="USA Puzzle Tour API")
api = APIRouter(prefix="/api")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------- Worlds & Levels ----------
WORLDS = [
    {"id": "miami",      "ordinal": 1, "name": "Miami",        "subtitle": "Neon Beach",        "primary": "#FF2A6D", "secondary": "#05D9E8", "unlock_stars": 0},
    {"id": "vegas",      "ordinal": 2, "name": "Las Vegas",    "subtitle": "City of Lights",    "primary": "#FFD700", "secondary": "#E5E5E5", "unlock_stars": 20},
    {"id": "la",         "ordinal": 3, "name": "Los Angeles",  "subtitle": "Sunset Strip",      "primary": "#FF5E00", "secondary": "#C026D3", "unlock_stars": 45},
    {"id": "california", "ordinal": 4, "name": "California",   "subtitle": "Golden Coast",      "primary": "#3EB489", "secondary": "#F4E4C1", "unlock_stars": 70},
    {"id": "newyork",    "ordinal": 5, "name": "New York",     "subtitle": "Empire Rush",       "primary": "#FFCC00", "secondary": "#0047AB", "unlock_stars": 95},
]
LEVELS_PER_WORLD = 20

def game_type_for_level(level: int) -> str:
    """Every 5 levels rotates puzzle type."""
    if level <= 5:   return "match3"
    if level <= 10:  return "memory"
    if level <= 15:  return "slide"
    return "wordsearch"


# ---------- Models ----------
class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    name: Optional[str] = None

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class CompleteLevelIn(BaseModel):
    world_id: str
    level: int = Field(ge=1, le=LEVELS_PER_WORLD)
    stars: int = Field(ge=0, le=3)
    score: int = 0
    moves: int = 0
    time_seconds: int = 0


# ---------- Helpers ----------
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False

def create_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(days=ACCESS_TOKEN_DAYS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request) -> dict:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = auth[7:]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"id": payload["sub"]})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    user.pop("password_hash", None)
    user.pop("_id", None)
    return user

def public_user(user: dict) -> dict:
    return {
        "id": user["id"],
        "email": user["email"],
        "name": user.get("name") or user["email"].split("@")[0],
        "created_at": user.get("created_at"),
    }


# ---------- Auth Endpoints ----------
@api.post("/auth/register")
async def register(payload: RegisterIn):
    email = payload.email.lower().strip()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = str(uuid.uuid4())
    doc = {
        "id": user_id,
        "email": email,
        "password_hash": hash_password(payload.password),
        "name": (payload.name or email.split("@")[0]).strip(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(doc)
    token = create_token(user_id, email)
    return {"token": token, "user": public_user(doc)}

@api.post("/auth/login")
async def login(payload: LoginIn):
    email = payload.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_token(user["id"], email)
    return {"token": token, "user": public_user(user)}

@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return public_user(user)


# ---------- Worlds / Progress Endpoints ----------
async def get_user_progress(user_id: str) -> dict:
    """Returns: {world_id: {level: {stars,score,moves,time}}}"""
    cur = db.progress.find({"user_id": user_id})
    out: dict = {}
    async for row in cur:
        out.setdefault(row["world_id"], {})[str(row["level"])] = {
            "stars": row.get("stars", 0),
            "score": row.get("score", 0),
            "moves": row.get("moves", 0),
            "time_seconds": row.get("time_seconds", 0),
            "completed_at": row.get("completed_at"),
        }
    return out

def total_stars_from_progress(progress: dict) -> int:
    total = 0
    for world in progress.values():
        for lvl in world.values():
            total += int(lvl.get("stars", 0))
    return total

def build_worlds_state(progress: dict) -> list:
    total_stars = total_stars_from_progress(progress)
    out = []
    for w in WORLDS:
        wp = progress.get(w["id"], {})
        completed = len(wp)
        stars = sum(int(v.get("stars", 0)) for v in wp.values())
        unlocked = total_stars >= w["unlock_stars"]
        out.append({
            **w,
            "levels_total": LEVELS_PER_WORLD,
            "levels_completed": completed,
            "stars_earned": stars,
            "stars_max": LEVELS_PER_WORLD * 3,
            "unlocked": unlocked,
        })
    return out

@api.get("/worlds")
async def list_worlds(user: dict = Depends(get_current_user)):
    progress = await get_user_progress(user["id"])
    return {
        "worlds": build_worlds_state(progress),
        "total_stars": total_stars_from_progress(progress),
    }

@api.get("/worlds/{world_id}/levels")
async def world_levels(world_id: str, user: dict = Depends(get_current_user)):
    world = next((w for w in WORLDS if w["id"] == world_id), None)
    if not world:
        raise HTTPException(status_code=404, detail="World not found")
    progress = await get_user_progress(user["id"])
    total_stars = total_stars_from_progress(progress)
    if total_stars < world["unlock_stars"]:
        raise HTTPException(status_code=403, detail=f"Need {world['unlock_stars']} stars to unlock {world['name']}")
    wp = progress.get(world_id, {})
    levels = []
    last_completed = 0
    for i in range(1, LEVELS_PER_WORLD + 1):
        rec = wp.get(str(i))
        if rec:
            last_completed = max(last_completed, i)
        levels.append({
            "level": i,
            "game_type": game_type_for_level(i),
            "stars": int(rec["stars"]) if rec else 0,
            "score": int(rec["score"]) if rec else 0,
            "completed": rec is not None,
        })
    # Unlock rule: first level is always unlocked, each level unlocks after previous is completed
    for i, lvl in enumerate(levels):
        lvl["unlocked"] = (i == 0) or levels[i - 1]["completed"]
    return {
        "world": {**world, "levels_total": LEVELS_PER_WORLD},
        "levels": levels,
    }

@api.post("/progress/complete")
async def complete_level(payload: CompleteLevelIn, user: dict = Depends(get_current_user)):
    world = next((w for w in WORLDS if w["id"] == payload.world_id), None)
    if not world:
        raise HTTPException(status_code=404, detail="World not found")
    # Verify unlock chain
    progress = await get_user_progress(user["id"])
    total_stars = total_stars_from_progress(progress)
    if total_stars < world["unlock_stars"]:
        raise HTTPException(status_code=403, detail="World locked")
    wp = progress.get(payload.world_id, {})
    if payload.level > 1 and str(payload.level - 1) not in wp:
        raise HTTPException(status_code=403, detail="Previous level not completed")

    existing = await db.progress.find_one({
        "user_id": user["id"], "world_id": payload.world_id, "level": payload.level
    })
    new_stars = max(payload.stars, int(existing["stars"]) if existing else 0)
    new_score = max(payload.score, int(existing.get("score", 0)) if existing else 0)
    doc = {
        "user_id": user["id"],
        "world_id": payload.world_id,
        "level": payload.level,
        "stars": new_stars,
        "score": new_score,
        "moves": payload.moves,
        "time_seconds": payload.time_seconds,
        "completed_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.progress.update_one(
        {"user_id": user["id"], "world_id": payload.world_id, "level": payload.level},
        {"$set": doc},
        upsert=True,
    )
    # Recompute global totals
    progress = await get_user_progress(user["id"])
    new_total = total_stars_from_progress(progress)
    newly_unlocked = []
    for w in WORLDS:
        if w["unlock_stars"] > total_stars and w["unlock_stars"] <= new_total:
            newly_unlocked.append({"id": w["id"], "name": w["name"]})
    return {
        "ok": True,
        "stars": new_stars,
        "score": new_score,
        "total_stars": new_total,
        "newly_unlocked": newly_unlocked,
    }


# ---------- Misc ----------
@api.get("/")
async def root():
    return {"ok": True, "service": "USA Puzzle Tour API"}

@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.progress.create_index([("user_id", 1), ("world_id", 1), ("level", 1)], unique=True)

app.include_router(api)
