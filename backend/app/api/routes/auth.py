from datetime import timedelta
from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from backend.app.core.config import settings
from backend.app.core.security import verify_password, get_password_hash, create_access_token, decode_access_token
from backend.app.models.schemas import LoginRequest, TokenResponse, UserResponse, UserCreate
from backend.app.db.mongodb import db_manager

router = APIRouter(prefix="/auth", tags=["Authentication"])
security_bearer = HTTPBearer(auto_error=False)

# Seed default users
DEFAULT_USERS = [
    {
        "user_id": "USR_ADMIN_01",
        "username": "admin@riskshield.ai",
        "email": "admin@riskshield.ai",
        "role": "ADMIN",
        "hashed_password": get_password_hash("admin123")
    },
    {
        "user_id": "USR_ANALYST_01",
        "username": "analyst@riskshield.ai",
        "email": "analyst@riskshield.ai",
        "role": "ANALYST",
        "hashed_password": get_password_hash("analyst123")
    }
]


async def ensure_default_users():
    coll = db_manager.get_collection("users")
    for u in DEFAULT_USERS:
        existing = await coll.find_one({"username": u["username"]})
        if not existing:
            await coll.insert_one(u)


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security_bearer)) -> UserResponse:
    if not credentials:
        # For seamless demo experience, default to active Analyst session if no token passed
        return UserResponse(
            user_id="USR_ANALYST_01",
            username="analyst@riskshield.ai",
            email="analyst@riskshield.ai",
            role="ANALYST",
            created_at="2026-01-01T00:00:00Z"
        )

    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication credentials"
        )
    username = payload.get("sub")
    coll = db_manager.get_collection("users")
    user = await coll.find_one({"username": username})
    if not user:
        return UserResponse(
            user_id="USR_DEMO",
            username=username or "analyst@riskshield.ai",
            email=username or "analyst@riskshield.ai",
            role=payload.get("role", "ANALYST"),
            created_at="2026-01-01T00:00:00Z"
        )
    return UserResponse(
        user_id=user["user_id"],
        username=user["username"],
        email=user["email"],
        role=user["role"],
        created_at=user.get("created_at", "2026-01-01T00:00:00Z")
    )


@router.post("/login", response_model=TokenResponse)
async def login(credentials: LoginRequest):
    await ensure_default_users()
    coll = db_manager.get_collection("users")
    user = await coll.find_one({"username": credentials.username})
    
    if not user:
        # Check standard demo credentials directly
        if credentials.username in ["admin@riskshield.ai", "admin"] and credentials.password == "admin123":
            user = DEFAULT_USERS[0]
        elif credentials.username in ["analyst@riskshield.ai", "analyst"] and credentials.password == "analyst123":
            user = DEFAULT_USERS[1]
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )

    # Verify password
    if not verify_password(credentials.password, user.get("hashed_password", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    token = create_access_token({
        "sub": user["username"],
        "user_id": user["user_id"],
        "role": user["role"]
    })

    user_resp = UserResponse(
        user_id=user["user_id"],
        username=user["username"],
        email=user.get("email", user["username"]),
        role=user["role"],
        created_at=user.get("created_at", "2026-01-01T00:00:00Z")
    )

    return TokenResponse(access_token=token, token_type="bearer", user=user_resp)


@router.get("/me", response_model=UserResponse)
async def get_profile(current_user: UserResponse = Depends(get_current_user)):
    return current_user
