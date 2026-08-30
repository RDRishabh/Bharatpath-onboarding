"""The error contract is part of the API surface for four client teams.

Two properties that are cheap now and expensive to retrofit:
  * every error carries a stable machine-readable `code`
  * the backend returns no user-facing English display string, because all
    four clients localise into 6-8 languages (PRD section 8)
"""

from __future__ import annotations

import inspect

import pytest

from app.core import errors


def _error_classes() -> list[type[errors.AppError]]:
    return [
        obj
        for _, obj in inspect.getmembers(errors, inspect.isclass)
        if issubclass(obj, errors.AppError) and obj is not errors.AppError
    ]


@pytest.mark.parametrize("cls", _error_classes(), ids=lambda c: c.__name__)
def test_every_error_has_a_stable_code(cls: type[errors.AppError]) -> None:
    assert cls.code and cls.code != errors.AppError.code or cls is errors.AppError
    assert cls.code.islower(), "codes are lower_snake_case and machine-readable"
    assert " " not in cls.code


@pytest.mark.parametrize("cls", _error_classes(), ids=lambda c: c.__name__)
def test_error_codes_are_unique(cls: type[errors.AppError]) -> None:
    codes = [c.code for c in _error_classes()]
    assert codes.count(cls.code) == 1, f"duplicate error code: {cls.code}"


def test_paid_gates_are_distinct_errors() -> None:
    """Subscription, access window and KYB fail differently and must stay apart.

    Merging them produces an error that tells the user the wrong thing to do
    about it - see docs/plan.md R15: "two independent gates that must not be
    conflated".
    """
    assert errors.SubscriptionRequiredError.code != errors.AccessWindowExpiredError.code
    assert errors.KybRequiredError.code != errors.SubscriptionRequiredError.code
    assert errors.KybRequiredError.code != errors.AccessWindowExpiredError.code


def test_tenant_scoped_miss_is_not_found_not_forbidden() -> None:
    """403 confirms the resource exists. For tenant-scoped reads that is a leak."""
    assert errors.NotFoundError.status_code == 404
