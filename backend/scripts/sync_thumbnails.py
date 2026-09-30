"""
One-off sync: set the `thumbnail` field on TCHQ's `projects` table to the
new logo/photo assets, once you've copied them into the frontend's public
folder for deployment.

Only touches the 14 projects actually shown on the page. CherryTree,
VTranslator and TCHQ Portfolio are intentionally left alone -- CherryTree
isn't included on this page, and VTranslator / TCHQ Portfolio aren't
projects on this page at all (their assets are just kept on hand for
possible future use).

Usage (run from the backend/ directory, with the venv active, so `app` is
importable):

    # 1. Dry run first -- prints exactly what would change, writes nothing.
    python scripts/sync_thumbnails.py

    # 2. Once the report looks right, write it for real.
    python scripts/sync_thumbnails.py --apply

    # If you copied the files into a subfolder of public/ (e.g.
    # frontend/public/thumbnails/...) instead of the public root, pass
    # that prefix so the stored URL matches where Vite actually serves
    # them from:
    python scripts/sync_thumbnails.py --apply --prefix /thumbnails

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
    python scripts/sync_thumbnails.py --apply
    Remove-Item Env:DATABASE_URL   # optional cleanup afterwards

    # bash (from backend/):
    DATABASE_URL="postgresql+asyncpg://<your-neon-connection-string>" \\
        python scripts/sync_thumbnails.py --apply

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
from pathlib import Path

from sqlalchemy import select, update

# Make `app` importable regardless of the caller's cwd, as long as this
# file stays at backend/scripts/sync_thumbnails.py.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import models  # noqa: E402
from app.db import engine  # noqa: E402
from app.settings import settings  # noqa: E402


# TCHQ project title -> filename copied into the public folder.
# Only the 14 projects actually on the page -- CherryTree, VTranslator and
# TCHQ Portfolio are deliberately left out (see module docstring).
THUMBNAILS: dict[str, str] = {
    "Freight Audit": "freight-audit-combo.svg",
    "PayBuddy": "paybuddy-combo.svg",
    "RBAC Identity Service": "rbac-combo.svg",
    "ClaimLens": "claimlens-combo.svg",
    "Job Market Analyzer": "job-market-analyzer-combo.svg",
    "vibe-agent": "vibe-agent-combo.svg",
    "smedj": "smedj-combo.svg",
    "RMAP": "rmap-combo.svg",
    "Marketing Attribution Engine": "marketing-attribution-engine-combo.svg",
    "Triune": "triune-combo.svg",
    "Projectry": "projectry-combo.svg",
    "BlackJackMatch": "blackjackmatch-combo.svg",
    "SeeYou2": "seeyou2-combo.svg",
    "TCRM": "tcrm-combo.svg",
}


def normalize(s: str) -> str:
    return " ".join(s.split()).strip().lower()


THUMBNAILS_BY_TITLE = {normalize(title): filename for title, filename in THUMBNAILS.items()}


async def main(apply: bool, prefix: str) -> None:
    prefix = prefix.rstrip("/")  # so f"{prefix}/{filename}" never double-slashes

    shown = settings.database_url.split("@", 1)[-1] if "@" in settings.database_url else settings.database_url
    print(f"Target database: ...@{shown}")
    print(f"Path prefix    : {prefix or '(public root, i.e. /<filename>)'}")
    print(f"Mode           : {'APPLY -- writing changes' if apply else 'DRY RUN -- no changes will be written'}\n")

    async with engine.begin() as conn:
        result = await conn.execute(
            select(models.Project.id, models.Project.title, models.Project.thumbnail)
        )
        rows = result.all()

        matched_keys: set[str] = set()
        any_changes = False

        for row in rows:
            key = normalize(row.title)
            filename = THUMBNAILS_BY_TITLE.get(key)
            if filename is None:
                continue
            matched_keys.add(key)

            new_thumbnail = f"{prefix}/{filename}"
            if row.thumbnail == new_thumbnail:
                print(f"  = {row.title!r} -- already set to {new_thumbnail!r}")
                continue

            any_changes = True
            print(f"  * {row.title!r}")
            print(f"      thumbnail: {row.thumbnail!r}\n        -> {new_thumbnail!r}")

            if apply:
                await conn.execute(
                    update(models.Project).where(models.Project.id == row.id).values(thumbnail=new_thumbnail)
                )

        missing = set(THUMBNAILS_BY_TITLE) - matched_keys
        if missing:
            print("\nNo project row found for these titles (left untouched -- check for a typo")
            print("or a title that doesn't match Neon exactly):")
            for key in missing:
                original = next(t for t in THUMBNAILS if normalize(t) == key)
                print(f"  - {original!r}")

        if not any_changes:
            print("\nNothing to change.")

    if not apply:
        print("\nDry run only -- nothing was written. Re-run with --apply once this looks right.")
    else:
        print("\nDone -- changes committed.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Set the `thumbnail` field for TCHQ's projects to the new logo/photo assets.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--apply", action="store_true", help="Write changes. Default is a dry run.")
    parser.add_argument(
        "--prefix",
        default="",
        help="Path prefix if the files live in a subfolder of public/ (e.g. /thumbnails). "
        "Default is empty, i.e. served straight from the public root as /<filename>.",
    )
    args = parser.parse_args()
    asyncio.run(main(apply=args.apply, prefix=args.prefix))
