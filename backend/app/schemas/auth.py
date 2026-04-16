from pydantic import BaseModel, EmailStr

from app.schemas.user import UserRead

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str
    role: str
    user: UserRead

class TokenPayload(BaseModel):
    sub: str = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr
