"""Which database hosts get TLS, and against what (`app.core.db.connect_args_for`).

RDS forces TLS and signs with Amazon's own CA. The failure worth a test is the
quiet one: an RDS URL that connects with no verification, or with none at all,
because the host suffix was not recognised.
"""

from __future__ import annotations

import ssl
from types import SimpleNamespace

import certifi
import pytest

from app.core import db

RDS_URL = (
    "postgresql+asyncpg://bharatpath_app:pw@bp.abc123.ap-south-1.rds.amazonaws.com:5432/bharatpath"
)


def _with_root_cert(monkeypatch: pytest.MonkeyPatch, cafile: str | None) -> None:
    monkeypatch.setattr(db, "get_settings", lambda: SimpleNamespace(database_ssl_root_cert=cafile))


def test_local_postgres_gets_no_tls() -> None:
    assert db.connect_args_for("postgresql+asyncpg://u:p@localhost:5432/bharatpath") == {}


def test_rds_verifies_against_the_configured_bundle(monkeypatch: pytest.MonkeyPatch) -> None:
    # Any valid bundle will do: the point is that it is loaded and the context
    # verifies, not which CAs it holds.
    _with_root_cert(monkeypatch, certifi.where())

    args = db.connect_args_for(RDS_URL)

    context = args["ssl"]
    assert isinstance(context, ssl.SSLContext)
    assert context.verify_mode == ssl.CERT_REQUIRED
    assert context.check_hostname is True
    assert context.get_ca_certs()


def test_rds_without_a_bundle_refuses_rather_than_connecting_unverified(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _with_root_cert(monkeypatch, None)

    with pytest.raises(RuntimeError, match="DATABASE_SSL_ROOT_CERT"):
        db.connect_args_for(RDS_URL)
