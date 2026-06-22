from pydantic import BaseModel


class RegisterRequest(BaseModel):
    username: str
    password: str
    role: str = "student"  # "student" or "teacher"


class LoginRequest(BaseModel):
    username: str
    password: str


class AuthUser(BaseModel):
    user_id: str
    username: str
    role: str


class StudentEntry(BaseModel):
    user_id: str
    username: str
