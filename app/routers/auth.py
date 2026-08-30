from datetime import datetime, timedelta, timezone
import hashlib

from fastapi import APIRouter, Depends, HTTPException, status
from passlib.context import CryptContext
from jose import jwt

from app.database import get_connection
from app.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    RefreshRequest,
    LogoutRequest,
    TokenResponse,
    RegisterResponse,
    MessageResponse,
    CurrentUserResponse
)
from app.settings import settings
from app.dependencies import (
    get_current_user,
    require_roles
)
router = APIRouter(
    prefix="/auth",
    tags=["auth"]
)


pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto"
)
def create_token(
    account_id: int,
    role: str,
    token_type: str,
    expires_delta: timedelta
):
    expire = datetime.now(timezone.utc) + expires_delta

    payload = {
        "sub": str(account_id),
        "role": role,
        "type": token_type,
        "exp": expire
    }

    return jwt.encode(
        payload,
        settings.secret_key,
        algorithm=settings.jwt_algorithm
    )
def hash_token(token: str) -> str:
    return hashlib.sha256(
        token.encode("utf-8")
    ).hexdigest()

@router.post(
    "/register",
    response_model=RegisterResponse,
    status_code=status.HTTP_201_CREATED
)
def register(user: RegisterRequest):

    password_hash = pwd_context.hash(user.password)

    connection = get_connection()

    try:
        cursor = connection.cursor()

        # Create guest
        cursor.execute(
            """
            INSERT INTO guest (name, email, phone)
            VALUES (%s, %s, %s)
            RETURNING guest_id;
            """,
            (
                user.full_name,
                user.email,
                user.phone
            )
        )

        guest_id = cursor.fetchone()[0]

        # Create account
        cursor.execute(
            """
            INSERT INTO account (
                email,
                password_hash,
                role,
                guest_id,
                property_id
            )
            VALUES (%s, %s, 'guest', %s, NULL);
            """,
            (
                user.email,
                password_hash,
                guest_id
            )
        )

        connection.commit()

        return {
            "message": "Guest account created successfully",
            "guest_id": guest_id,
            "email": user.email,
            "full_name": user.full_name,
            "role": "guest"
        }

    except Exception:
        connection.rollback()
        raise

    finally:
        cursor.close()
        connection.close()
@router.post(
    "/login",
    response_model=TokenResponse
)
def login(user: LoginRequest):

    connection = get_connection()

    try:
        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT
                account_id,
                email,
                password_hash,
                role
            FROM account
            WHERE LOWER(email) = LOWER(%s);
            """,
            (user.email,)
        )

        account = cursor.fetchone()

        if account is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )

        account_id, email, password_hash, role = account

        if not pwd_context.verify(
            user.password,
            password_hash
        ):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )

        access_token = create_token(
            account_id=account_id,
            role=role,
            token_type="access",
            expires_delta=timedelta(
                minutes=settings.access_token_expire_minutes
            )
        )

        refresh_token = create_token(
            account_id=account_id,
            role=role,
            token_type="refresh",
            expires_delta=timedelta(
                days=settings.refresh_token_expire_days
            )
        )
        refresh_token_hash = hash_token(refresh_token)

        refresh_expires_at = (
            datetime.now(timezone.utc)
            + timedelta(days=settings.refresh_token_expire_days)
        )

        cursor.execute(
            """
            INSERT INTO refresh_token (
                account_id,
                token_hash,
                expires_at
            )
            VALUES (%s, %s, %s);
            """,
            (
                account_id,
                refresh_token_hash,
                refresh_expires_at
            )
        )

        connection.commit()

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer"
        }

    finally:
        cursor.close()
        connection.close()

@router.post(
    "/refresh",
    response_model=TokenResponse
)
def refresh_token(request: RefreshRequest):

    # Decode the refresh JWT
    try:
        payload = jwt.decode(
            request.refresh_token,
            settings.secret_key,
            algorithms=[settings.jwt_algorithm]
        )

    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )

    # Make sure this is actually a refresh token
    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )

    account_id = payload.get("sub")

    if not account_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )

    try:
        account_id = int(account_id)
    except (TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )

    # Hash the received refresh token
    token_hash = hash_token(request.refresh_token)

    connection = get_connection()

    try:
        cursor = connection.cursor()

        # Find the stored refresh token
        cursor.execute(
            """
            SELECT
                token_id,
                expires_at,
                revoked
            FROM refresh_token
            WHERE account_id = %s
              AND token_hash = %s;
            """,
            (
                account_id,
                token_hash
            )
        )

        stored_token = cursor.fetchone()

        if stored_token is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )

        token_id, expires_at, revoked = stored_token

        # Check whether token has already been revoked
        if revoked:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token has been revoked"
            )

        # Check database expiry
        if expires_at <= datetime.now(timezone.utc):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token has expired"
            )

        # Get current account information
        cursor.execute(
            """
            SELECT
                account_id,
                role
            FROM account
            WHERE account_id = %s;
            """,
            (account_id,)
        )

        account = cursor.fetchone()

        if account is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Account not found"
            )

        account_id, role = account

        # Revoke old refresh token
        cursor.execute(
            """
            UPDATE refresh_token
            SET revoked = TRUE
            WHERE token_id = %s;
            """,
            (token_id,)
        )

        # Create new access token
        access_token = create_token(
            account_id=account_id,
            role=role,
            token_type="access",
            expires_delta=timedelta(
                minutes=settings.access_token_expire_minutes
            )
        )

        # Create new refresh token
        new_refresh_token = create_token(
            account_id=account_id,
            role=role,
            token_type="refresh",
            expires_delta=timedelta(
                days=settings.refresh_token_expire_days
            )
        )

        # Store hash of new refresh token
        new_refresh_token_hash = hash_token(
            new_refresh_token
        )

        new_refresh_expires_at = (
            datetime.now(timezone.utc)
            + timedelta(
                days=settings.refresh_token_expire_days
            )
        )

        cursor.execute(
            """
            INSERT INTO refresh_token (
                account_id,
                token_hash,
                expires_at
            )
            VALUES (%s, %s, %s);
            """,
            (
                account_id,
                new_refresh_token_hash,
                new_refresh_expires_at
            )
        )

        connection.commit()

        return {
            "access_token": access_token,
            "refresh_token": new_refresh_token,
            "token_type": "bearer"
        }

    except HTTPException:
        connection.rollback()
        raise

    except Exception:
        connection.rollback()
        raise

    finally:
        cursor.close()
        connection.close()

@router.post(
        "/logout",
        response_model=MessageResponse
        )
def logout(request: LogoutRequest):

    token_hash = hash_token(request.refresh_token)

    connection = get_connection()

    try:
        cursor = connection.cursor()

        cursor.execute(
            """
            UPDATE refresh_token
            SET revoked = TRUE
            WHERE token_hash = %s
              AND revoked = FALSE
            RETURNING token_id;
            """,
            (token_hash,)
        )

        result = cursor.fetchone()

        if result is None:
            connection.rollback()

            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or already revoked refresh token"
            )

        connection.commit()

        return {
            "message": "Logged out successfully"
        }

    except HTTPException:
        raise

    except Exception:
        connection.rollback()
        raise

    finally:
        cursor.close()
        connection.close()
@router.get(
    "/me",
    response_model=CurrentUserResponse
)
def me(current_user=Depends(get_current_user)):
    return current_user