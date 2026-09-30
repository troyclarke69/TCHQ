"""
One-off sync: pull tech tags (and optionally category/github) from the
`hub` repo's projects.js (https://github.com/troyclarke69/hub) into TCHQ's
own `projects` table.

TCHQ rows are matched to hub entries by title (case/whitespace-insensitive).
If a TCHQ title doesn't line up with hub's title for the same project, add
an entry to TITLE_ALIASES below -- don't touch the matching logic itself.

Usage (run from the backend/ directory, with the venv active, so `app` is
importable):

    # 1. Dry run first -- prints exactly what would change, writes nothing.
    python scripts/sync_hub_tech.py

    # 2. Once the report looks right, write it for real.
    python scripts/sync_hub_tech.py --apply

    # Also sync category / github (both null in TCHQ today), not just tech:
    python scripts/sync_hub_tech.py --apply --fields tech,category,github

--------------------------------------------------------------------------
IMPORTANT -- which database this actually hits
--------------------------------------------------------------------------
This script reuses the exact same DATABASE_URL your FastAPI app reads
from .env (see app/settings.py). If your local .env points at the Docker
Compose `db` service (the usual setup for local dev), running this as-is
updates THAT local database -- not the live Neon database behind
troyclarke2026.netlify.app.

To target Neon specifically, pass DATABASE_URL as a real environment
variable for just this command -- env vars always win over .env values:

    # Windows PowerShell (from backend/):
    $env:DATABASE_URL = "postgresql+asyncpg://<your-neon-connection-string>"
    python scripts/sync_hub_tech.py --apply
    Remove-Item Env:DATABASE_URL   # optional cleanup afterwards

    # bash (from backend/):
    DATABASE_URL="postgresql+asyncpg://<your-neon-connection-string>" \\
        python scripts/sync_hub_tech.py --apply

Use the same connection string that's set as the DATABASE_URL Fly secret
(Neon dashboard -> your project -> Connection Details), just make sure
the scheme is `postgresql+asyncpg://` rather than plain `postgresql://`.

The script prints which host it's about to touch before it does anything,
so double check that line before answering yes to yourself and re-running
with --apply.
"""

from __future__ import annotations

import argparse
import asyncio
import sys
from dataclasses import dataclass, field
from pathlib import Path

from sqlalchemy import select, update

# Make `app` importable regardless of the caller's cwd, as long as this
# file stays at backend/scripts/sync_hub_tech.py.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import models  # noqa: E402
from app.db import engine  # noqa: E402
from app.settings import settings  # noqa: E402


@dataclass(frozen=True)
class HubProject:
    title: str
    category: str
    repo: str
    tech: list[str] = field(default_factory=list)


# --- Snapshot of hub/projects.js, taken 2026-09-28. -----------------------
# If hub gains new projects or a tech list changes, update the matching
# entry here (or add a new one) and re-run.
HUB_PROJECTS: list[HubProject] = [
    HubProject("Freight Audit", "AI", "freight-audit",
               ["TypeScript", "React", "Vite", "Zod", "Claude"]),
    HubProject("ClaimLens", "AI", "claimLens",
               ["TypeScript", "Python", "Angular", "FastAPI", "Pydantic", "Pandas", "NumPy",
                "PyTorch", "Transformers", "PEFT"]),
    HubProject("Job Market Analyzer", "Full-stack", "abrain",
               ["TypeScript", "Python", "React", "Next.js", "Tailwind", "FastAPI", "Pydantic",
                "SQLAlchemy", "Postgres", "dbt", "Pandas", "NextAuth", "JWT", "bcrypt", "Recharts"]),
    HubProject("vibe-agent", "AI", "vibe",
               ["TypeScript", "Python", "React", "Next.js", "Tailwind", "FastAPI", "Express",
                "Pydantic", "Postgres", "MongoDB", "Claude", "OpenAI"]),
    HubProject("smedj", ".NET", "smed",
               ["TypeScript", "C#", "React", "Vite", "Blazor", "Swagger", "FluentValidation",
                "Entity Framework", "Dapper", "SQL Server", "JWT", "bcrypt"]),
    HubProject("RBAC Identity Service", ".NET", "rbac",
               ["C#", "Dapper", "SQL Server", "JWT"]),
    HubProject("RMAP", "Data", "mini-faire",
               ["TypeScript", "Python", "React", "Next.js", "Tailwind", "FastAPI", "Pydantic",
                "WebSockets", "DuckDB", "Polars"]),
    HubProject("PayBuddy", ".NET", "mini-paypal",
               ["TypeScript", "C#", "React", "React Router", "Vite", "Swagger",
                "Entity Framework", "Postgres", "JWT", "bcrypt"]),
    HubProject("Marketing Attribution Engine", "Data", "mini_attribution_engine",
               ["JavaScript", "Python", "React", "Vite", "FastAPI", "Pydantic", "BigQuery",
                "Airflow", "Pandas", "NumPy", "scikit-learn", "Recharts"]),
    HubProject("Triune", "AI", "triune",
               ["TypeScript", "React", "Vite", "Express", "Temporal", "NATS", "WebSockets",
                "Postgres", "Redis"]),
    HubProject("Projectry", "AI", "ProjectSeven",
               ["TypeScript", "React", "Next.js", "Drizzle", "Postgres", "Firebase", "Claude",
                "Gemini", "NextAuth", "bcrypt"]),
    HubProject("BlackJackMatch", "Games", "blackjackmatch-game",
               ["JavaScript", "Capacitor", "Android"]),
    HubProject("SeeYou2", "Windows", "SeeYou2",
               ["TypeScript", "Rust", "React", "React Router", "Tailwind", "Vite", "Tauri"]),
    HubProject("TCRM", ".NET", "tcrm",
               ["TypeScript", "C#", "React", "React Router", "Tailwind", "Vite", "Swagger",
                "Entity Framework", "Postgres", "JWT", "bcrypt"]),
    HubProject("TCHQ Portfolio", "Full-stack", "TCHQ",
               ["TypeScript", "Python", "React", "React Router", "Tailwind", "Vite", "FastAPI",
                "SQLAlchemy", "Postgres", "JWT", "bcrypt"]),
    HubProject("CherryTree", "Full-stack", "CherryTree",
               ["TypeScript", "Python", "React", "Vite", "FastAPI", "Pydantic", "SQLAlchemy",
                "Postgres", "JWT", "bcrypt"]),
    HubProject("VTranslator", "AI", "VTranslator",
               ["Python", "Streamlit", "Gemini"]),
    HubProject("Corona Now", "Full-stack", "ngCorona-v1",
               ["TypeScript", "Angular", "Angular Material", "Bootstrap", "Chart.js", "Google Charts"]),
]

# Map a TCHQ project title to the hub title it corresponds to, only when
# they don't already match case/whitespace-insensitively. Example:
#   TITLE_ALIASES = {"SaaS onboarding redesign": "Job Market Analyzer"}
TITLE_ALIASES: dict[str, str] = {}


def normalize(s: str) -> str:
    return " ".join(s.split()).strip().lower()


HUB_BY_TITLE = {normalize(p.title): p for p in HUB_PROJECTS}


def resolve_hub_match(tchq_title: str) -> HubProject | None:
    alias = TITLE_ALIASES.get(tchq_title)
    key = normalize(alias) if alias else normalize(tchq_title)
    return HUB_BY_TITLE.get(key)


def github_url(repo: str) -> str:
    return f"https://github.com/troyclarke69/{repo}"


async def main(apply: bool, fields: set[str]) -> None:
    bad = fields - {"tech", "category", "github"}
    if bad:
        raise SystemExit(f"Unknown --fields value(s): {', '.join(sorted(bad))}")

    shown = settings.database_url.split("@", 1)[-1] if "@" in settings.database_url else settings.database_url
    print(f"Target database: ...@{shown}")
    print(f"Fields to sync : {', '.join(sorted(fields))}")
    print(f"Mode           : {'APPLY -- writing changes' if apply else 'DRY RUN -- no changes will be written'}\n")

    async with engine.begin() as conn:
        result = await conn.execute(
            select(
                models.Project.id,
                models.Project.title,
                models.Project.tech,
                models.Project.category,
                models.Project.github,
            )
        )
        rows = result.all()

        matched: list[tuple] = []
        unmatched: list[tuple] = []
        for row in rows:
            hub = resolve_hub_match(row.title)
            (matched if hub else unmatched).append((row, hub))

        any_changes = False
        for row, hub in matched:
            changes: dict[str, object] = {}

            if "tech" in fields and sorted(row.tech or []) != sorted(hub.tech):
                changes["tech"] = hub.tech

            if "category" in fields and row.category != hub.category:
                changes["category"] = hub.category

            if "github" in fields:
                url = github_url(hub.repo)
                if row.github != url:
                    changes["github"] = url

            if not changes:
                print(f"  = {row.title!r} -- already matches hub, nothing to do")
                continue

            any_changes = True
            print(f"  * {row.title!r}  (hub: {hub.title!r})")
            for k, v in changes.items():
                print(f"      {k}: {getattr(row, k, None)!r}\n        -> {v!r}")

            if apply:
                await conn.execute(
                    update(models.Project).where(models.Project.id == row.id).values(**changes)
                )

        if unmatched:
            print("\nTCHQ projects with no matching hub title (left untouched):")
            for row, _ in unmatched:
                print(f"  - {row.title!r}")
            print("  If one of these is the same project under a different name in hub,")
            print("  add it to TITLE_ALIASES at the top of this script and re-run.")

        matched_hub_titles = {normalize(hub.title) for _, hub in matched}
        hub_unclaimed = [h for h in HUB_PROJECTS if normalize(h.title) not in matched_hub_titles]
        if hub_unclaimed:
            print("\nhub projects with no row in TCHQ yet (this script only updates existing")
            print("rows -- it never creates new ones):")
            for h in hub_unclaimed:
                print(f"  - {h.title!r}")

        if not any_changes:
            print("\nNothing to change." if matched else "\nNo TCHQ rows matched a hub project.")

    if not apply:
        print("\nDry run only -- nothing was written. Re-run with --apply once this looks right.")
    else:
        print("\nDone -- changes committed.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Sync tech/category/github from hub's projects.js into TCHQ's projects table.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--apply", action="store_true", help="Write changes. Default is a dry run.")
    parser.add_argument(
        "--fields",
        default="tech",
        help="Comma-separated fields to sync: tech,category,github (default: tech).",
    )
    args = parser.parse_args()
    field_set = {f.strip() for f in args.fields.split(",") if f.strip()}
    asyncio.run(main(apply=args.apply, fields=field_set))
