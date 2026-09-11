"""Authentication: who the caller is, and what our own tables say they may do.

The split across this package is the design:

  * `tokens`     - what a verified token is, and the provider protocol
  * `cognito`    - the production provider (JWKS, RS256, GetUser)
  * `local`      - the development substitute, refused in staging and prod
  * `provider`   - which one this process uses, chosen once at boot
  * `membership` - role and tenant, read from OUR database, cached 60s

Nothing here reads a role or a tenant from a token claim. That is the point.
"""

from __future__ import annotations

from app.core.auth.provider import dispose_identity_provider, get_identity_provider
from app.core.auth.tokens import (
    IdentityProvider,
    InvalidTokenError,
    Pool,
    ProviderProfile,
    VerifiedToken,
)

__all__ = [
    "IdentityProvider",
    "InvalidTokenError",
    "Pool",
    "ProviderProfile",
    "VerifiedToken",
    "dispose_identity_provider",
    "get_identity_provider",
]
