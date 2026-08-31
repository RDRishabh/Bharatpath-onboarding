"""admin - HTTP layer

Queues, drill-downs, disputes, suspensions.

Routes only. No business logic, no repository access.
import-linter enforces the second half of that sentence.
"""

from __future__ import annotations

from fastapi import APIRouter

router = APIRouter()

# Endpoints land on the day this module is scheduled in docs/plan.md section 8.
