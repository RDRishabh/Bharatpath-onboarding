"""GET /candidate/score/scale -- the scale a client draws the score on.

It exists so no client hardcodes 700, 990 or a band edge: the home card once
showed "/ 999". The numbers must be the engine's own, so these tests compare
the response with `scoring.domain` rather than with literals.
"""

from __future__ import annotations

import uuid
from itertools import pairwise
from typing import Any

import pytest

from app.modules.scoring.domain import BANDS, BASE_SCORE, MAX_SCORE, band_for
from tests.integration.test_payments import _candidate

pytestmark = pytest.mark.integration

SCALE = "/api/v1/candidate/score/scale"


async def test_an_unpaid_candidate_gets_the_engine_s_own_scale(
    client: Any, mint_token: Any
) -> None:
    """Not paywalled: the scale is the same for everyone and says nothing
    about this candidate's number, which is still 402 without a subscription."""
    me = await _candidate(mint_token)
    response = await client.get(SCALE, headers=me["headers"])
    assert response.status_code == 200
    body = response.json()
    assert (body["lowest"], body["highest"]) == (BASE_SCORE, MAX_SCORE)
    assert [(b["band"], b["lowest"], b["highest"]) for b in body["bands"]] == [
        (label, low, high) for label, low, high in BANDS
    ]


async def test_the_bands_cover_the_scale_with_no_gap_and_agree_with_band_for(
    client: Any, mint_token: Any
) -> None:
    """A client that colours a score by these ranges must land on the band the
    API reports for it, for every score on the scale."""
    me = await _candidate(mint_token)
    body = (await client.get(SCALE, headers=me["headers"])).json()
    bands = body["bands"]
    assert bands[0]["lowest"] == body["lowest"] and bands[-1]["highest"] == body["highest"]
    for below, above in pairwise(bands):
        assert above["lowest"] == below["highest"] + 1
    for value in range(body["lowest"], body["highest"] + 1):
        (drawn,) = [b["band"] for b in bands if b["lowest"] <= value <= b["highest"]]
        assert drawn == band_for(value)


async def test_a_business_account_is_refused(client: Any, mint_token: Any) -> None:
    headers, _ = mint_token(pool="BUSINESS", email=f"{uuid.uuid4().hex[:12]}@example.test")
    assert (await client.get(SCALE, headers=headers)).status_code == 403
