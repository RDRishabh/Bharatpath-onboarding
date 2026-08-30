"""Module registry. The API router walks ALL_MODULES to mount every surface."""

from __future__ import annotations

from types import ModuleType

from . import identity
from . import candidate
from . import resume
from . import scoring
from . import integrity
from . import questionnaire
from . import interview
from . import courses
from . import employer
from . import kyb
from . import jobs
from . import applications
from . import discovery
from . import billing
from . import subscriptions
from . import college
from . import analytics
from . import admin
from . import notifications
from . import privacy

ALL_MODULES: tuple[ModuleType, ...] = (
    identity,
    candidate,
    resume,
    scoring,
    integrity,
    questionnaire,
    interview,
    courses,
    employer,
    kyb,
    jobs,
    applications,
    discovery,
    billing,
    subscriptions,
    college,
    analytics,
    admin,
    notifications,
    privacy,
)
