"""admin - Pydantic request/response DTOs

Queues, drill-downs, disputes, suspensions.

Separate Create / Update / Read schemas. ORM models are never exposed
directly - the schema IS the API contract, and for several modules it is also
where an invariant is enforced structurally.

**What the console never shows, by field list rather than by care:**

* **the stored score** -- a drill-down carries `display_value` and `band`, the
  same number the candidate sees (invariant 2), and no field whose name
  contains "raw" (`test_no_employer_response_has_a_field_for_the_raw_score`
  walks `/admin` too);
* **a whole phone number or email** -- `phone_masked`, `email_masked`;
* **a CV** -- a drill-down counts resume versions and never reads one;
* **the provider subject** -- no schema here has a field for it.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

from app.modules.admin.domain import MAX_DISPUTE_DESCRIPTION, MAX_RESOLUTION, DisputeKind


class _Base(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")


# ---------------------------------------------------------------------------
# KYB -- a read-only record while approval is automatic
# ---------------------------------------------------------------------------
class KybSubmissionRow(_Base):
    id: uuid.UUID
    tenant_id: uuid.UUID
    organisation: str
    state: str
    form_version: str | None
    submitted_at: datetime | None
    reviewed_at: datetime | None
    auto_approved: bool
    created_at: datetime


class KybSubmissionsPage(_Base):
    items: list[KybSubmissionRow]
    next_cursor: str | None
    #: `kyb.require_approval`. While false, every submission was approved on
    #: arrival and this list is a record, not a queue (R15).
    review_required: bool


class KybDecisionRequest(_Base):
    decision: Literal["UNDER_REVIEW", "APPROVED", "REJECTED", "MORE_INFO_REQUIRED"]
    reason: str | None = Field(default=None, max_length=1000)


# ---------------------------------------------------------------------------
# Integrity
# ---------------------------------------------------------------------------
class IntegritySignalRow(_Base):
    id: uuid.UUID
    candidate_id: uuid.UUID
    resume_version_id: uuid.UUID | None
    rule_id: str
    rule_version: str
    severity: str
    state: str
    created_at: datetime
    resolved_at: datetime | None


class IntegritySignalsPage(_Base):
    items: list[IntegritySignalRow]
    next_cursor: str | None


class IntegritySignalDetail(IntegritySignalRow):
    thresholds_version: str
    #: What the rule saw. Can quote the CV, which is why opening a signal is
    #: audited and the queue above never carries it.
    evidence: dict[str, Any]
    resolved_by: uuid.UUID | None
    resolution_note: str | None


class ResolveSignalRequest(_Base):
    outcome: Literal["CLEARED", "CONFIRMED"]
    note: str | None = Field(default=None, max_length=2000)


# ---------------------------------------------------------------------------
# Organisations, suspension, seats
# ---------------------------------------------------------------------------
class TenantRow(_Base):
    id: uuid.UUID
    type: str
    name: str
    status: str
    created_at: datetime


class TenantsPage(_Base):
    items: list[TenantRow]
    next_cursor: str | None


class SuspendTenantRequest(_Base):
    #: Kept on the suspension row for whoever lifts it. Never in the audit
    #: metadata or an event: it is free text about a named organisation.
    reason: str = Field(min_length=3, max_length=500)


class SuspensionResponse(_Base):
    id: uuid.UUID
    tenant_id: uuid.UUID
    reason: str
    suspended_by: uuid.UUID
    suspended_at: datetime
    lifted_by: uuid.UUID | None
    lifted_at: datetime | None


class AllocateSeatsRequest(_Base):
    seats: int = Field(ge=0, le=1_000_000)


class SeatAllocationResponse(_Base):
    allocated: int
    used: int
    #: Linked students seated by this change, longest-linked first.
    filled: int


# ---------------------------------------------------------------------------
# Drill-downs -- every open is audited
# ---------------------------------------------------------------------------
class SubscriptionSummary(_Base):
    state: str
    plan_code: str
    current_period_end: datetime | None


class ScoreSummary(_Base):
    display_value: int
    band: str
    computed_at: datetime
    scores_computed: int


class ResumeSummary(_Base):
    files: int
    versions: int
    last_confirmed_at: datetime | None


class SignalCount(_Base):
    severity: str
    state: str
    count: int


class CollegeLinkSummary(_Base):
    tenant_id: uuid.UUID
    college: str
    scope: str
    granted_at: datetime


class CandidateDrilldown(_Base):
    id: uuid.UUID
    status: str
    locale: str
    created_at: datetime
    full_name: str | None
    city: str | None
    state_code: str | None
    phone_masked: str | None
    email_masked: str | None
    score: ScoreSummary | None
    resume: ResumeSummary
    visible_to_employers: bool
    integrity_signals: list[SignalCount]
    applications_by_stage: dict[str, int]
    hire_disputes: int
    subscription: SubscriptionSummary | None
    college_links: list[CollegeLinkSummary]
    seat_held: bool
    disputes_by_state: dict[str, int]


class SuspensionSummary(_Base):
    id: uuid.UUID
    suspended_at: datetime
    suspended_by: uuid.UUID


class KybSummary(_Base):
    id: uuid.UUID
    state: str
    submitted_at: datetime | None
    reviewed_at: datetime | None
    auto_approved: bool


class EmployerDrilldown(_Base):
    tenant_id: uuid.UUID
    name: str
    status: str
    created_at: datetime
    legal_name: str | None
    employer_type: str | None
    industry: str | None
    kyb_status: str | None
    verified_at: datetime | None
    latest_kyb: KybSummary | None
    members_by_role: dict[str, int]
    jobs_by_status: dict[str, int]
    applications_by_stage: dict[str, int]
    subscription: SubscriptionSummary | None
    suspension: SuspensionSummary | None
    #: Distinct candidates opened, not opens (Day 14 counts caps the same way).
    candidates_viewed_last_day: int
    candidates_viewed_last_30_days: int
    view_anomaly_flags_last_30_days: int
    disputes_by_state: dict[str, int]


class SeatSummary(_Base):
    allocated: int
    used: int
    plan_allowance: int | None


class CollegeDrilldown(_Base):
    tenant_id: uuid.UUID
    name: str
    status: str
    created_at: datetime
    institution_type: str | None
    onboarding_submitted_at: datetime | None
    verified_at: datetime | None
    members_by_role: dict[str, int]
    seats: SeatSummary | None
    live_referral_codes: int
    #: Live ROSTER consents: students the college may count.
    connected_students: int
    #: Live INDIVIDUAL consents: students the college may see by name.
    individually_visible: int
    roster_imports_by_state: dict[str, int]
    invitations_by_state: dict[str, int]
    subscription: SubscriptionSummary | None
    suspension: SuspensionSummary | None
    disputes_by_state: dict[str, int]


# ---------------------------------------------------------------------------
# Disputes -- the console's side
# ---------------------------------------------------------------------------
class DisputeRow(_Base):
    id: uuid.UUID
    kind: str
    party: str
    source: str
    raised_by: uuid.UUID
    tenant_id: uuid.UUID | None
    application_id: uuid.UUID | None
    state: str
    assigned_to: uuid.UUID | None
    created_at: datetime
    resolved_at: datetime | None


class DisputesPage(_Base):
    items: list[DisputeRow]
    next_cursor: str | None


class ApplicationLink(_Base):
    id: uuid.UUID
    candidate_id: uuid.UUID
    employer_tenant_id: uuid.UUID
    job_id: uuid.UUID
    stage: str
    employer_confirmed_at: datetime | None
    candidate_confirmed_at: datetime | None
    hire_disputed_at: datetime | None


class DisputeLinks(_Base):
    """Where to go next: the person, the organisation, the application, and
    whether the person's CV is under an integrity signal right now."""

    candidate_id: uuid.UUID | None
    raiser_tenant_id: uuid.UUID | None
    application: ApplicationLink | None
    #: OPEN or CONFIRMED signals on the candidate, by severity.
    live_integrity_signals: dict[str, int]


class DisputeDetail(DisputeRow):
    description: str
    resolution: str | None
    resolved_by: uuid.UUID | None
    links: DisputeLinks


class ResolveDisputeRequest(_Base):
    outcome: Literal["RESOLVED", "REJECTED"]
    #: The raiser reads this. Write it for them.
    resolution: str = Field(min_length=1, max_length=MAX_RESOLUTION)


# ---------------------------------------------------------------------------
# Audit search
# ---------------------------------------------------------------------------
class AuditEventRow(_Base):
    id: int
    actor_id: uuid.UUID | None
    actor_role: str
    action: str
    target_type: str
    target_id: str | None
    tenant_id: uuid.UUID | None
    request_id: str | None
    metadata: dict[str, Any]
    occurred_at: datetime


class AuditEventsPage(_Base):
    items: list[AuditEventRow]
    next_cursor: str | None


# ---------------------------------------------------------------------------
# Disputes -- the raiser's side (`/disputes`)
# ---------------------------------------------------------------------------
class RaiseDisputeRequest(_Base):
    kind: DisputeKind
    #: Required for HIRE, refused otherwise. Must be an application the caller
    #: can see: their own, or their organisation's.
    application_id: uuid.UUID | None = None
    description: str = Field(min_length=10, max_length=MAX_DISPUTE_DESCRIPTION)


class MyDisputeResponse(_Base):
    """No `assigned_to` and no `resolved_by`: which member of our staff handled
    it is ours to know, and the answer is the same whoever wrote it."""

    id: uuid.UUID
    kind: str
    source: str
    application_id: uuid.UUID | None
    description: str
    state: str
    resolution: str | None
    created_at: datetime
    resolved_at: datetime | None
