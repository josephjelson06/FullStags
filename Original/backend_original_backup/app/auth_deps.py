"""Backward compatibility shim — delegates to app.deps.auth."""

from app.deps.auth import (  # noqa: F401
    hash_password,
    verify_password,
    create_token,
    decode_token,
    get_current_user,
    require_role,
)
