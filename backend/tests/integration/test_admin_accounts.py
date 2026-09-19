"""Accounts made on someone's behalf, and self-registration beside them (2026-09-18).

The client's sign-up decisions: anyone signs themselves up as a candidate, an
employer or a college, by email and password; and staff can create any of the
three from the console, in which case Cognito emails a temporary password, the
person changes it at first sign-in, and onboards as usual. An owner adding a
colleague gets the same email.

Cognito is the `LocalAccountDirectory` here (the switch is the same one that
selects the local token verifier), which records every invitation it was asked
to send. The first sign-in is a locally minted token carrying the address --
the same path a real Cognito token takes through `resolve_or_create_user`.
"""

from __future__ import annotations

import uuid
from typing import Any

import pytest
from sqlalchemy import text

from app.core.auth.directory import DirectoryError, LocalAccountDirectory, get_account_directory
from tests.conftest import _seed_url, sessions
from tests.integration.test_admin_console import _audit_rows, _staff

pytestmark = pytest.mark.integration

API = "/api/v1"
ADMIN = f"{API}/admin"
ME = f"{API}/auth/me"


def _email() -> str:
    return f"acct-{uuid.uuid4().hex[:12]}@example.test"


def _directory() -> LocalAccountDirectory:
    directory = get_account_directory()
    assert isinstance(directory, LocalAccountDirectory)
    return directory


def _invited(pool: str, email: str, kind: str = "INVITE") -> bool:
    return {"pool": pool, "email": email, "kind": kind} in _directory().sent


async def _user(email: str) -> dict[str, Any] | None:
    async with sessions(_seed_url())() as session:
        row = (
            (
                await session.execute(
                    text("SELECT id, pool, cognito_sub, status FROM users WHERE email = :e"),
                    {"e": email},
                )
            )
            .mappings()
            .first()
        )
    return dict(row) if row else None


# ===========================================================================
# Staff create a candidate
# ===========================================================================
async def test_staff_create_a_candidate_who_is_emailed_and_claims_the_account_at_first_sign_in(
    client: Any, mint_token: Any
) -> None:
    admin = await _staff(mint_token)
    email = _email()

    created = await client.post(
        f"{ADMIN}/accounts/candidates", json={"email": email}, headers=admin["headers"]
    )
    assert created.status_code == 201, created.text
    body = created.json()
    assert body["kind"] == "CANDIDATE" and body["invitation"] == "SENT"
    assert "email" not in body, "the address is not echoed back"
    assert _invited("CANDIDATE", email)

    row = await _user(email)
    assert row is not None and row["pool"] == "CANDIDATE" and row["cognito_sub"] is None
    assert str(row["id"]) == body["user_id"]
    assert await _audit_rows("account_provisioned", admin["user_id"], body["user_id"]) == 1

    # First sign-in with the emailed password: Cognito's token names the
    # address, and the row staff made is adopted rather than a second made.
    headers, _ = mint_token(pool="CANDIDATE", email=email)
    me = await client.get(ME, headers=headers)
    assert me.status_code == 200, me.text
    assert me.json()["user_id"] == body["user_id"] and me.json()["role"] == "CANDIDATE"


async def test_staff_cannot_make_a_second_account_for_an_address(
    client: Any, mint_token: Any
) -> None:
    admin = await _staff(mint_token)
    email = _email()
    first = await client.post(
        f"{ADMIN}/accounts/candidates", json={"email": email}, headers=admin["headers"]
    )
    assert first.status_code == 201
    again = await client.post(
        f"{ADMIN}/accounts/candidates", json={"email": email.upper()}, headers=admin["headers"]
    )
    assert again.status_code == 409
    assert again.json()["code"] == "identity_account_exists"


# ===========================================================================
# Staff create an employer or a college, with its first owner
# ===========================================================================
async def test_staff_create_an_employer_whose_owner_signs_in_to_their_organisation(
    client: Any, mint_token: Any
) -> None:
    admin = await _staff(mint_token)
    email = _email()
    name = f"Provisioned {uuid.uuid4().hex[:6]} Pvt Ltd"

    created = await client.post(
        f"{ADMIN}/accounts/employers",
        json={"owner_email": email, "legal_name": name},
        headers=admin["headers"],
    )
    assert created.status_code == 201, created.text
    body = created.json()
    assert body["kind"] == "EMPLOYER" and body["role"] == "EMPLOYER_OWNER"
    assert body["invitation"] == "SENT" and _invited("BUSINESS", email)

    # Staff did it, so staff are the actor on the organisation's creation.
    assert await _audit_rows("organisation_created", admin["user_id"], body["tenant_id"]) == 1
    assert await _audit_rows("account_provisioned", admin["user_id"], body["user_id"]) == 1

    headers, _ = mint_token(pool="BUSINESS", email=email)
    me = await client.get(ME, headers=headers)
    assert me.status_code == 200, me.text
    assert me.json()["role"] == "EMPLOYER_OWNER" and me.json()["tenant_id"] == body["tenant_id"]
    organisation = await client.get(f"{API}/employer/organisation", headers=headers)
    assert organisation.status_code == 200 and organisation.json()["legal_name"] == name
    # An ordinary organisation: KYB is the owner's to do, like anyone's.
    assert organisation.json()["kyb_status"] == "DRAFT"


async def test_staff_create_a_college_whose_admin_signs_in_to_it(
    client: Any, mint_token: Any
) -> None:
    admin = await _staff(mint_token)
    email = _email()
    created = await client.post(
        f"{ADMIN}/accounts/colleges",
        json={
            "admin_email": email,
            "name": f"College {uuid.uuid4().hex[:6]}",
            "institution_type": "AUTONOMOUS_COLLEGE",
        },
        headers=admin["headers"],
    )
    assert created.status_code == 201, created.text
    assert created.json()["role"] == "COLLEGE_ADMIN"

    headers, _ = mint_token(pool="BUSINESS", email=email)
    me = await client.get(ME, headers=headers)
    assert me.json()["role"] == "COLLEGE_ADMIN"
    assert me.json()["tenant_id"] == created.json()["tenant_id"]


async def test_a_bad_organisation_form_is_a_422_not_a_500(client: Any, mint_token: Any) -> None:
    admin = await _staff(mint_token)
    bad = await client.post(
        f"{ADMIN}/accounts/colleges",
        json={"admin_email": _email(), "name": "A College", "institution_type": "NOT_A_TYPE"},
        headers=admin["headers"],
    )
    assert bad.status_code == 422
    assert bad.json()["code"] == "admin_account_invalid"


async def test_an_address_that_already_runs_an_organisation_cannot_be_given_another(
    client: Any, mint_token: Any
) -> None:
    admin = await _staff(mint_token)
    email = _email()
    first = await client.post(
        f"{ADMIN}/accounts/employers",
        json={"owner_email": email, "legal_name": "First Org Pvt Ltd"},
        headers=admin["headers"],
    )
    assert first.status_code == 201
    second = await client.post(
        f"{ADMIN}/accounts/colleges",
        json={"admin_email": email, "name": "Second Org", "institution_type": "AUTONOMOUS_COLLEGE"},
        headers=admin["headers"],
    )
    assert second.status_code == 409
    assert second.json()["code"] == "identity_already_in_organisation"


async def test_if_cognito_refuses_nothing_is_created(
    client: Any, mint_token: Any, monkeypatch: Any
) -> None:
    """The rows are written first and the invitation last, in one
    transaction: a refusal rolls the organisation back with it."""
    admin = await _staff(mint_token)
    email = _email()

    async def refuse(**_kwargs: Any) -> str:
        raise DirectoryError("cognito_LimitExceededException")

    monkeypatch.setattr(_directory(), "invite", refuse)
    response = await client.post(
        f"{ADMIN}/accounts/employers",
        json={"owner_email": email, "legal_name": "Never Made Pvt Ltd"},
        headers=admin["headers"],
    )
    assert response.status_code == 502
    assert response.json()["code"] == "account_directory_unavailable"
    assert await _user(email) is None


# ===========================================================================
# Resending the invitation
# ===========================================================================
async def test_an_invitation_can_be_resent_until_the_person_signs_in(
    client: Any, mint_token: Any
) -> None:
    admin = await _staff(mint_token)
    support = await _staff(mint_token, "SUPPORT_AGENT")
    email = _email()
    created = await client.post(
        f"{ADMIN}/accounts/candidates", json={"email": email}, headers=admin["headers"]
    )
    user_id = created.json()["user_id"]

    resent = await client.post(
        f"{ADMIN}/accounts/{user_id}/resend-invitation", headers=support["headers"]
    )
    assert resent.status_code == 200, resent.text
    assert _invited("CANDIDATE", email, kind="RESEND")
    assert await _audit_rows("account_invitation_resent", support["user_id"], user_id) == 1

    headers, _ = mint_token(pool="CANDIDATE", email=email)
    assert (await client.get(ME, headers=headers)).status_code == 200
    after = await client.post(
        f"{ADMIN}/accounts/{user_id}/resend-invitation", headers=support["headers"]
    )
    assert after.status_code == 409
    assert after.json()["code"] == "identity_account_already_active"


# ===========================================================================
# Adding a member to an existing organisation
# ===========================================================================
async def test_staff_add_a_member_of_the_organisations_kind_and_only_that(
    client: Any, mint_token: Any
) -> None:
    from tests.integration.test_college import _college

    admin = await _staff(mint_token)
    college = await _college(client, mint_token, seats_paid=None)
    email = _email()

    added = await client.post(
        f"{ADMIN}/tenants/{college['tenant_id']}/members",
        json={"email": email, "role": "COLLEGE_STAFF"},
        headers=admin["headers"],
    )
    assert added.status_code == 201, added.text
    assert added.json()["invitation"] == "SENT" and _invited("BUSINESS", email)

    wrong_kind = await client.post(
        f"{ADMIN}/tenants/{college['tenant_id']}/members",
        json={"email": _email(), "role": "EMPLOYER_RECRUITER"},
        headers=admin["headers"],
    )
    assert wrong_kind.status_code == 409
    assert wrong_kind.json()["code"] == "identity_cannot_add_member"

    headers, _ = mint_token(pool="BUSINESS", email=email)
    me = await client.get(ME, headers=headers)
    assert me.json()["role"] == "COLLEGE_STAFF"


async def test_an_owner_adding_a_new_colleague_sends_the_cognito_invitation(
    client: Any, mint_token: Any
) -> None:
    from tests.integration.test_candidate_marketplace import _employer

    employer = await _employer(client, mint_token)
    email = _email()
    added = await client.post(
        f"{API}/employer/team",
        json={"email": email, "role": "EMPLOYER_RECRUITER"},
        headers=employer["headers"],
    )
    assert added.status_code == 201, added.text
    assert _invited("BUSINESS", email)


# ===========================================================================
# Self-registration, and the two pools kept apart
# ===========================================================================
async def test_anyone_can_sign_up_as_a_business_and_create_their_organisation(
    client: Any, mint_token: Any
) -> None:
    """Self-registration (closing blockers E7). A new business sign-in belongs
    nowhere, is told so, and creates its organisation; nothing was provisioned."""
    headers, _ = mint_token(pool="BUSINESS", email=_email())
    me = await client.get(ME, headers=headers)
    assert me.status_code == 403 and me.json()["code"] == "no_active_membership"
    created = await client.post(
        f"{API}/college/organisation",
        json={"name": f"Self Serve {uuid.uuid4().hex[:6]}", "institution_type": "UNIVERSITY"},
        headers=headers,
    )
    assert created.status_code == 201, created.text
    assert (await client.get(ME, headers=headers)).json()["role"] == "COLLEGE_ADMIN"


async def test_a_business_sign_in_never_claims_a_candidate_account_made_for_the_same_address(
    client: Any, mint_token: Any
) -> None:
    """Adoption is by email and pool. Claiming across pools would carry a
    candidate into an account with a different authentication model; the
    person is told the address is in use instead of getting a 500."""
    admin = await _staff(mint_token)
    email = _email()
    created = await client.post(
        f"{ADMIN}/accounts/candidates", json={"email": email}, headers=admin["headers"]
    )
    assert created.status_code == 201

    headers, _ = mint_token(pool="BUSINESS", email=email)
    me = await client.get(ME, headers=headers)
    assert me.status_code == 403
    assert me.json()["code"] == "account_contact_in_use"
    row = await _user(email)
    assert row is not None and row["pool"] == "CANDIDATE" and row["cognito_sub"] is None
