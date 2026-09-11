"""Which identity provider this process uses, decided once at boot.

The choice is made from configuration, not from a runtime branch inside the
request path. A per-request `if local:` is a per-request opportunity to take
the wrong branch; a single construction at start-up either yields the real
verifier or the process does not serve.
"""

from __future__ import annotations

from app.core.auth.tokens import IdentityProvider
from app.settings import Settings, get_settings

_provider: IdentityProvider | None = None


def get_identity_provider() -> IdentityProvider:
    global _provider
    if _provider is None:
        _provider = _build(get_settings())
    return _provider


def _build(settings: Settings) -> IdentityProvider:
    if settings.auth_allow_local_tokens:
        # Settings refuses to construct with this flag set in staging or prod,
        # so reaching here means local or dev by definition.
        from app.core.auth.local import LocalIdentityProvider

        return LocalIdentityProvider(settings)

    from app.core.auth.cognito import CognitoIdentityProvider

    return CognitoIdentityProvider(settings)


async def dispose_identity_provider() -> None:
    """Release provider connections on shutdown."""
    global _provider
    if _provider is not None:
        await _provider.aclose()
        _provider = None
