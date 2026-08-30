from pydantic import BaseModel, ConfigDict, EmailStr, Field


class RegisterRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr
    password: str = Field(min_length=10)
    full_name: str = Field(min_length=1, max_length=120)
    phone: str | None = None
class LoginRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr
    password: str

class RefreshRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    refresh_token: str

class LogoutRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    refresh_token: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class RegisterResponse(BaseModel):
    message: str
    guest_id: int
    email: EmailStr
    full_name: str
    role: str

class MessageResponse(BaseModel):
    message: str
class CurrentUserResponse(BaseModel):
    account_id: int
    email: EmailStr
    role: str
    guest_id: int | None = None
    property_id: int | None = None