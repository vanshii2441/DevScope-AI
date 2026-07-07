from fastapi import APIRouter, Depends, HTTPException, status, Request, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
import httpx
import jwt as pyjwt

from app.core.database import get_db
from app.models.repository import Repository
from app.models.user import User
from app.models.chat import Chat
from app.schemas.repository import RepositoryCreate, RepositoryResponse
from app.services.ingestion import process_repository

router = APIRouter()

# ─── Auth ─────────────────────────────────────────────────────────────────────

async def get_current_user_id(request: Request, db: Session = Depends(get_db)) -> str:
    """
    Verify Clerk JWT and return the user's Clerk sub (user_id).
    Also upserts a local User row so FK constraints are satisfied.
    Falls back to X-User-Id header for quick local testing.
    """
    auth_header = request.headers.get("Authorization", "")
    clerk_user_id: str | None = None

    if auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1]
        try:
            # Decode without verification first to get 'iss' / 'kid'
            unverified = pyjwt.decode(token, options={"verify_signature": False})
            issuer = unverified.get("iss", "")

            # Fetch Clerk's public JWKS and verify the token
            jwks_url = f"{issuer}/.well-known/jwks.json"
            async with httpx.AsyncClient() as client:
                jwks_resp = await client.get(jwks_url)
                jwks = jwks_resp.json()

            public_keys = pyjwt.PyJWKClient.__new__(pyjwt.PyJWKClient)
            jwk_set = pyjwt.PyJWKSet.from_dict(jwks)
            header = pyjwt.get_unverified_header(token)
            signing_key = next(
                (k for k in jwk_set.keys if k.key_id == header.get("kid")), None
            )
            if signing_key:
                payload = pyjwt.decode(
                    token,
                    signing_key.key,
                    algorithms=["RS256"],
                    options={"verify_aud": False},
                )
                clerk_user_id = payload.get("sub")
        except Exception:
            pass  # Fall through to header fallback

    # Fallback for local dev: X-User-Id header
    if not clerk_user_id:
        clerk_user_id = request.headers.get("X-User-Id")

    if not clerk_user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    # Upsert user so FK constraint is satisfied
    user = db.query(User).filter(User.id == clerk_user_id).first()
    if not user:
        user = User(id=clerk_user_id, email=f"{clerk_user_id}@clerk.local")
        db.add(user)
        db.commit()

    return clerk_user_id


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/", response_model=RepositoryResponse, status_code=status.HTTP_201_CREATED)
async def create_repository(
    repo_in: RepositoryCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """
    Submit a GitHub repository URL for analysis.
    Creates a repo + a default chat, then triggers ingestion in the background.
    """
    # Check if already exists for this user
    existing_repo = db.query(Repository).filter(
        Repository.url == repo_in.url,
        Repository.user_id == user_id
    ).first()

    if existing_repo:
        raise HTTPException(status_code=400, detail="Repository already added.")

    new_repo = Repository(
        user_id=user_id,
        name=repo_in.name,
        url=repo_in.url
    )
    db.add(new_repo)
    db.flush()  # get new_repo.id without committing

    # Auto-create a default chat for this repo
    new_chat = Chat(
        user_id=user_id,
        repository_id=new_repo.id,
        title=f"Chat — {repo_in.name}",
    )
    db.add(new_chat)
    db.commit()
    db.refresh(new_repo)
    db.refresh(new_chat)

    # Trigger background ingestion
    background_tasks.add_task(process_repository, new_repo.id)

    # Attach chat_id to response (added as non-db attribute)
    new_repo.chat_id = new_chat.id
    return new_repo


@router.get("/", response_model=List[RepositoryResponse])
async def list_repositories(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """
    Get all repositories for the authenticated user.
    """
    repos = db.query(Repository).filter(Repository.user_id == user_id).all()
    # Attach default chat_id for each repo
    for repo in repos:
        chat = db.query(Chat).filter(Chat.repository_id == repo.id).first()
        repo.chat_id = chat.id if chat else None
    return repos


@router.get("/{repo_id}", response_model=RepositoryResponse)
async def get_repository(
    repo_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """
    Get a specific repository's status.
    """
    repo = db.query(Repository).filter(
        Repository.id == repo_id,
        Repository.user_id == user_id
    ).first()

    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found.")

    chat = db.query(Chat).filter(Chat.repository_id == repo.id).first()
    repo.chat_id = chat.id if chat else None
    return repo

