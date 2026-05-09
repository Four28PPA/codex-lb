from __future__ import annotations

from datetime import datetime, timedelta

import pytest

from app.db.models import Account, RequestLog, UsageHistory
from app.modules.dashboard.token_runway import build_token_runway_estimate


@pytest.fixture
def account() -> Account:
    return Account(
        id="acc_1",
        email="one@example.com",
        plan_type="plus",
        access_token_encrypted=b"access",
        refresh_token_encrypted=b"refresh",
        id_token_encrypted=b"id",
        last_refresh=datetime(2026, 1, 1, 0, 0, 0),
    )


def usage(account_id: str, used_percent: float, recorded_at: datetime, *, reset_at: int = 1) -> UsageHistory:
    return UsageHistory(
        id=0,
        account_id=account_id,
        used_percent=used_percent,
        window="secondary",
        recorded_at=recorded_at,
        reset_at=reset_at,
    )


def log(account_id: str, requested_at: datetime, input_tokens: int, output_tokens: int) -> RequestLog:
    return RequestLog(
        account_id=account_id,
        request_id=f"req_{requested_at.timestamp()}",
        requested_at=requested_at,
        model="gpt-5.1",
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        status="success",
        error_code=None,
    )


def test_token_runway_estimate_learns_from_quota_deltas(account: Account):
    start = datetime(2026, 1, 1, 0, 0, 0)
    history = [
        usage("acc_1", 20.0, start),
        usage("acc_1", 30.0, start + timedelta(hours=1)),
    ]
    logs = [
        log("acc_1", start + timedelta(minutes=15), 600, 400),
        log("acc_1", start + timedelta(minutes=45), 500, 500),
    ]

    estimate = build_token_runway_estimate(
        window_key="secondary",
        accounts=[account],
        usage_history={"acc_1": history},
        request_logs=logs,
        remaining_credits=378.0,
    )

    assert estimate.confidence == "low"
    assert estimate.samples == 1
    assert estimate.observed_tokens == 2000
    assert estimate.observed_credit_delta == pytest.approx(756.0)
    assert estimate.tokens_per_credit == pytest.approx(2000 / 756)
    assert estimate.estimated_tokens_remaining == 1000
    assert estimate.last_learned_at == start + timedelta(hours=1)


def test_token_runway_estimate_learns_from_current_window_percent(account: Account):
    start = datetime(2026, 1, 1, 0, 0, 0)
    history = [
        usage("acc_1", 2.0, start + timedelta(hours=1)),
    ]
    logs = [
        log("acc_1", start + timedelta(minutes=15), 10_000_000, 10_000_000),
    ]

    estimate = build_token_runway_estimate(
        window_key="secondary",
        accounts=[account],
        usage_history={"acc_1": history},
        request_logs=logs,
        remaining_credits=7408.8,
    )

    assert estimate.confidence == "low"
    assert estimate.samples == 1
    assert estimate.observed_tokens == 20_000_000
    assert estimate.observed_credit_delta == pytest.approx(151.2)
    assert estimate.tokens_per_credit == pytest.approx(20_000_000 / 151.2)
    assert estimate.estimated_tokens_remaining == 980_000_000
    assert estimate.last_learned_at == start + timedelta(hours=1)


def test_token_runway_estimate_uses_current_window_when_no_new_delta(account: Account):
    start = datetime(2026, 1, 1, 0, 0, 0)
    history = [
        usage("acc_1", 20.0, start),
        usage("acc_1", 20.0, start + timedelta(hours=1)),
    ]
    logs = [log("acc_1", start + timedelta(minutes=30), 1000, 1000)]

    estimate = build_token_runway_estimate(
        window_key="secondary",
        accounts=[account],
        usage_history={"acc_1": history},
        request_logs=logs,
        remaining_credits=378.0,
    )

    assert estimate.confidence == "low"
    assert estimate.samples == 1
    assert estimate.observed_tokens == 2000
    assert estimate.observed_credit_delta == pytest.approx(1512.0)
    assert estimate.estimated_tokens_remaining == 500


def test_token_runway_estimate_waits_without_token_signal(account: Account):
    start = datetime(2026, 1, 1, 0, 0, 0)
    history = [
        usage("acc_1", 20.0, start),
    ]
    logs: list[RequestLog] = []

    estimate = build_token_runway_estimate(
        window_key="secondary",
        accounts=[account],
        usage_history={"acc_1": history},
        request_logs=logs,
        remaining_credits=378.0,
    )

    assert estimate.confidence == "learning"
    assert estimate.samples == 0
    assert estimate.estimated_tokens_remaining is None
    assert estimate.tokens_per_credit is None


def test_token_runway_estimate_skips_delta_across_reset_but_uses_current_window(account: Account):
    start = datetime(2026, 1, 1, 0, 0, 0)
    history = [
        usage("acc_1", 95.0, start, reset_at=1),
        usage("acc_1", 5.0, start + timedelta(hours=1), reset_at=2),
    ]
    logs = [log("acc_1", start + timedelta(minutes=30), 1000, 1000)]

    estimate = build_token_runway_estimate(
        window_key="secondary",
        accounts=[account],
        usage_history={"acc_1": history},
        request_logs=logs,
        remaining_credits=378.0,
    )

    assert estimate.confidence == "low"
    assert estimate.samples == 1
    assert estimate.observed_tokens == 2000
    assert estimate.observed_credit_delta == pytest.approx(378.0)
    assert estimate.estimated_tokens_remaining == 2000


def test_token_runway_estimate_confidence_increases_with_samples(account: Account):
    start = datetime(2026, 1, 1, 0, 0, 0)
    history = [usage("acc_1", float(index), start + timedelta(hours=index)) for index in range(10)]
    logs = [log("acc_1", start + timedelta(hours=index, minutes=30), 100, 100) for index in range(9)]

    estimate = build_token_runway_estimate(
        window_key="secondary",
        accounts=[account],
        usage_history={"acc_1": history},
        request_logs=logs,
        remaining_credits=100.0,
    )

    assert estimate.confidence == "high"
    assert estimate.samples == 9
    assert estimate.observed_tokens == 1800
