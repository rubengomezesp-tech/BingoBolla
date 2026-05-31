# Test Credentials — USA Puzzle Tour

## Test user (verified working — POST /api/auth/login returns JWT)
- Email: `tester@puzzletour.com`
- Password: `Test12345`

## Demo user (legacy, may exist)
- Email: `demo@puzzletour.com`
- Password: `Demo12345`

## Endpoints
- Backend base: read from `/app/frontend/.env` → `REACT_APP_BACKEND_URL`
- Register: `POST /api/auth/register` { email, password }
- Login: `POST /api/auth/login` { email, password } → `{ token, user }`
- Auth header: `Authorization: Bearer <token>`
