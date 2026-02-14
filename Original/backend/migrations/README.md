# Database Migrations

Alembic migration scaffolding target.

Current runtime still uses schema bootstrap in `app/database.py` for v0.

Planned next step:
1. Initialize Alembic.
2. Export current schema as baseline revision.
3. Move schema changes to revision scripts.
