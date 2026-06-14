import uuid

from fastapi import Depends, FastAPI, Header, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from . import models, schemas
from .db import engine, get_session
from .security import create_access_token
from .settings import settings


app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def _startup() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(models.Base.metadata.create_all)

    # Seed example data if empty
    async with AsyncSession(engine) as session:
        res = await session.execute(select(models.Project.id).limit(1))
        if res.scalar_one_or_none() is None:
            session.add_all(
                [
                    models.Project(
                        title="SaaS onboarding redesign",
                        summary="Reduced time-to-value with a streamlined flow and telemetry.",
                        tech=["React", "TypeScript", "Tailwind", "FastAPI", "Postgres"],
                        href=None,
                        featured=True,
                    ),
                    models.Project(
                        title="Internal tools platform",
                        summary="Unified admin workflows and improved data integrity across services.",
                        tech=["FastAPI", "Postgres", "SQLAlchemy", "Docker"],
                        href=None,
                        featured=True,
                    ),
                ]
            )
            session.add(
                models.Testimonial(
                    name="Alex Morgan",
                    role="Product Lead",
                    company="Acme Co",
                    quote="Clear communication, crisp execution, and thoughtful trade-offs. Would hire again.",
                )
            )
            await session.commit()


def require_admin(authorization: str | None = Header(default=None)) -> None:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing token")
    token = authorization.split(" ", 1)[1].strip()
    from .security import decode_token

    sub = decode_token(token)
    if sub != settings.admin_email:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")


@app.get("/api/health")
async def health() -> dict:
    return {"ok": True}


@app.get("/api/projects", response_model=list[schemas.ProjectOut])
async def list_projects(session: AsyncSession = Depends(get_session)) -> list[schemas.ProjectOut]:
    res = await session.execute(select(models.Project).order_by(models.Project.created_at.desc()))
    rows = res.scalars().all()
    return [
        schemas.ProjectOut(
            id=r.id,
            title=r.title,
            summary=r.summary,
            tech=r.tech,
            href=r.href,
            featured=r.featured,
        )
        for r in rows
    ]


@app.get("/api/testimonials", response_model=list[schemas.TestimonialOut])
async def list_testimonials(
    session: AsyncSession = Depends(get_session),
) -> list[schemas.TestimonialOut]:
    res = await session.execute(select(models.Testimonial).order_by(models.Testimonial.created_at.desc()))
    rows = res.scalars().all()
    return [
        schemas.TestimonialOut(id=r.id, name=r.name, role=r.role, company=r.company, quote=r.quote)
        for r in rows
    ]


@app.post("/api/contact", response_model=schemas.ContactOut, status_code=201)
async def create_contact(
    payload: schemas.ContactIn,
    session: AsyncSession = Depends(get_session),
) -> schemas.ContactOut:
    msg = models.ContactMessage(name=payload.name, email=str(payload.email), message=payload.message)
    session.add(msg)
    await session.commit()
    await session.refresh(msg)
    return schemas.ContactOut(id=msg.id, created_at=msg.created_at)


@app.post("/api/admin/login", response_model=schemas.TokenOut)
async def admin_login(payload: schemas.LoginIn) -> schemas.TokenOut:
    if payload.email != settings.admin_email or payload.password != settings.admin_password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return schemas.TokenOut(access_token=create_access_token(settings.admin_email))


@app.post("/api/admin/projects", dependencies=[Depends(require_admin)], response_model=schemas.ProjectOut)
async def admin_create_project(
    payload: schemas.ProjectIn,
    session: AsyncSession = Depends(get_session),
) -> schemas.ProjectOut:
    p = models.Project(**payload.model_dump())
    session.add(p)
    await session.commit()
    await session.refresh(p)
    return schemas.ProjectOut(id=p.id, title=p.title, summary=p.summary, tech=p.tech, href=p.href, featured=p.featured)


@app.delete("/api/admin/projects/{project_id}", dependencies=[Depends(require_admin)], status_code=204)
async def admin_delete_project(
    project_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
) -> None:
    await session.execute(delete(models.Project).where(models.Project.id == project_id))
    await session.commit()
    return None


@app.post(
    "/api/admin/testimonials",
    dependencies=[Depends(require_admin)],
    response_model=schemas.TestimonialOut,
)
async def admin_create_testimonial(
    payload: schemas.TestimonialIn,
    session: AsyncSession = Depends(get_session),
) -> schemas.TestimonialOut:
    t = models.Testimonial(**payload.model_dump())
    session.add(t)
    await session.commit()
    await session.refresh(t)
    return schemas.TestimonialOut(id=t.id, name=t.name, role=t.role, company=t.company, quote=t.quote)


@app.delete("/api/admin/testimonials/{testimonial_id}", dependencies=[Depends(require_admin)], status_code=204)
async def admin_delete_testimonial(
    testimonial_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
) -> None:
    await session.execute(delete(models.Testimonial).where(models.Testimonial.id == testimonial_id))
    await session.commit()
    return None

