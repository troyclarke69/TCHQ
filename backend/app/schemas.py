import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class ProjectOut(BaseModel):
    id: uuid.UUID
    title: str
    summary: str
    tech: list[str]
    href: str | None
    featured: bool


class ProjectIn(BaseModel):
    title: str = Field(min_length=2, max_length=120)
    summary: str = Field(min_length=5, max_length=280)
    tech: list[str] = Field(default_factory=list)
    href: str | None = Field(default=None, max_length=300)
    featured: bool = False


class TestimonialOut(BaseModel):
    id: uuid.UUID
    name: str
    role: str | None
    company: str | None
    quote: str


class TestimonialIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    role: str | None = Field(default=None, max_length=120)
    company: str | None = Field(default=None, max_length=120)
    quote: str = Field(min_length=10)


class ContactIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    message: str = Field(min_length=10)


class ContactOut(BaseModel):
    id: uuid.UUID
    created_at: datetime


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=200)

