from __future__ import annotations

import bisect
import logging
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Literal

from app.core import usage as usage_core
from app.core.usage.logs import total_tokens_from_log
from app.db.models import Account, RequestLog, UsageHistory

logger = logging.getLogger(__name__)

TokenRunwayConfidence = Literal["learning", "low", "medium", "high"]

_MIN_CREDIT_DELTA = 0.0001


@dataclass(frozen=True)
class TokenRunwayEstimate:
    window_key: str
    estimated_tokens_remaining: int | None
    tokens_per_credit: float | None
    observed_tokens: int
    observed_credit_delta: float
    samples: int
    confidence: TokenRunwayConfidence
    last_learned_at: datetime | None


def build_token_runway_estimate(
    *,
    window_key: str,
    accounts: list[Account],
    usage_history: dict[str, list[UsageHistory]],
    request_logs: list[RequestLog],
    remaining_credits: float,
) -> TokenRunwayEstimate:
    """Estimate remaining tokens from locally observed quota movement.

    Cursor's public plan docs describe usage pools, but the local quota-window
    credits reported by this app are not a documented token exchange rate.  This
    estimator only learns from intervals where this proxy has both real request
    tokens and a matching positive quota movement for the same account/window.
    """

    account_map = {account.id: account for account in accounts}
    log_index = _TokenLogIndex(request_logs)

    observed_tokens = 0
    observed_credit_delta = 0.0
    samples = 0
    last_learned_at: datetime | None = None

    for account_id, rows in usage_history.items():
        account = account_map.get(account_id)
        capacity = usage_core.capacity_for_plan(account.plan_type if account else None, window_key)
        if capacity is None or capacity <= 0:
            continue

        ordered_rows = sorted(rows, key=lambda row: (_normalize_datetime(row.recorded_at) or datetime.min, row.id or 0))
        account_samples = 0
        for previous, current in zip(ordered_rows, ordered_rows[1:]):
            sample = _sample_from_pair(
                account_id=account_id,
                previous=previous,
                current=current,
                capacity=float(capacity),
                log_index=log_index,
            )
            if sample is None:
                continue

            token_delta, credit_delta, learned_at = sample
            observed_tokens += token_delta
            observed_credit_delta += credit_delta
            samples += 1
            account_samples += 1
            if last_learned_at is None or learned_at > last_learned_at:
                last_learned_at = learned_at

        if account_samples == 0:
            current_window_sample = _sample_from_current_window(
                account_id=account_id,
                rows=ordered_rows,
                capacity=float(capacity),
                log_index=log_index,
            )
            if current_window_sample is not None:
                token_delta, credit_delta, learned_at = current_window_sample
                observed_tokens += token_delta
                observed_credit_delta += credit_delta
                samples += 1
                if last_learned_at is None or learned_at > last_learned_at:
                    last_learned_at = learned_at

    if observed_tokens <= 0 or observed_credit_delta <= 0:
        logger.info(
            "dashboard_token_runway_learning",
            extra={
                "window_key": window_key,
                "samples": samples,
                "observed_tokens": observed_tokens,
                "observed_credit_delta": observed_credit_delta,
            },
        )
        return TokenRunwayEstimate(
            window_key=window_key,
            estimated_tokens_remaining=None,
            tokens_per_credit=None,
            observed_tokens=observed_tokens,
            observed_credit_delta=round(observed_credit_delta, 6),
            samples=samples,
            confidence="learning",
            last_learned_at=last_learned_at,
        )

    tokens_per_credit = observed_tokens / observed_credit_delta
    estimated_remaining = max(0, int(round(max(0.0, remaining_credits) * tokens_per_credit)))
    confidence = _confidence_for_samples(samples)

    logger.info(
        "dashboard_token_runway_estimated",
        extra={
            "window_key": window_key,
            "samples": samples,
            "confidence": confidence,
            "tokens_per_credit": round(tokens_per_credit, 2),
            "observed_tokens": observed_tokens,
            "observed_credit_delta": round(observed_credit_delta, 6),
            "estimated_tokens_remaining": estimated_remaining,
        },
    )

    return TokenRunwayEstimate(
        window_key=window_key,
        estimated_tokens_remaining=estimated_remaining,
        tokens_per_credit=tokens_per_credit,
        observed_tokens=observed_tokens,
        observed_credit_delta=round(observed_credit_delta, 6),
        samples=samples,
        confidence=confidence,
        last_learned_at=last_learned_at,
    )


def _sample_from_current_window(
    *,
    account_id: str,
    rows: list[UsageHistory],
    capacity: float,
    log_index: "_TokenLogIndex",
) -> tuple[int, float, datetime] | None:
    current = rows[-1] if rows else None
    current_at = _normalize_datetime(current.recorded_at) if current else None
    if current is None or current_at is None:
        return None

    used_percent = float(current.used_percent)
    if used_percent <= 0:
        return None

    start_at = _window_start_for_row(current, current_at)
    token_delta = log_index.sum_tokens(account_id, start_at, current_at)
    if token_delta <= 0:
        return None

    credit_delta = (capacity * used_percent) / 100.0
    if credit_delta < _MIN_CREDIT_DELTA:
        return None

    return token_delta, credit_delta, current_at


def _sample_from_pair(
    *,
    account_id: str,
    previous: UsageHistory,
    current: UsageHistory,
    capacity: float,
    log_index: "_TokenLogIndex",
) -> tuple[int, float, datetime] | None:
    previous_at = _normalize_datetime(previous.recorded_at)
    current_at = _normalize_datetime(current.recorded_at)
    if previous_at is None or current_at is None or current_at <= previous_at:
        return None

    if previous.reset_at is not None and current.reset_at is not None and previous.reset_at != current.reset_at:
        return None

    percent_delta = float(current.used_percent) - float(previous.used_percent)
    if percent_delta <= 0:
        return None

    credit_delta = (capacity * percent_delta) / 100.0
    if credit_delta < _MIN_CREDIT_DELTA:
        return None

    token_delta = log_index.sum_tokens(account_id, previous_at, current_at)
    if token_delta <= 0:
        return None

    return token_delta, credit_delta, current_at


def _confidence_for_samples(samples: int) -> TokenRunwayConfidence:
    if samples >= 8:
        return "high"
    if samples >= 3:
        return "medium"
    if samples >= 1:
        return "low"
    return "learning"


def _normalize_datetime(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value
    return value.astimezone(timezone.utc).replace(tzinfo=None)


def _window_start_for_row(row: UsageHistory, current_at: datetime) -> datetime:
    if row.reset_at is not None:
        try:
            reset_at = datetime.fromtimestamp(float(row.reset_at), tz=timezone.utc).replace(tzinfo=None)
            if reset_at < current_at:
                return reset_at
        except (OSError, OverflowError, ValueError):
            pass

    window_minutes = row.window_minutes
    if window_minutes is not None and window_minutes > 0:
        return current_at - timedelta(minutes=int(window_minutes))

    return datetime.min


class _TokenLogIndex:
    def __init__(self, request_logs: list[RequestLog]) -> None:
        grouped: dict[str, list[tuple[datetime, int]]] = {}
        for log in request_logs:
            account_id = log.account_id
            requested_at = _normalize_datetime(log.requested_at)
            if account_id is None or requested_at is None:
                continue
            tokens = total_tokens_from_log(log) or 0
            if tokens <= 0:
                continue
            grouped.setdefault(account_id, []).append((requested_at, int(tokens)))

        self._timestamps: dict[str, list[datetime]] = {}
        self._prefix_totals: dict[str, list[int]] = {}
        for account_id, rows in grouped.items():
            rows.sort(key=lambda row: row[0])
            timestamps: list[datetime] = []
            prefix = [0]
            running = 0
            for requested_at, tokens in rows:
                timestamps.append(requested_at)
                running += tokens
                prefix.append(running)
            self._timestamps[account_id] = timestamps
            self._prefix_totals[account_id] = prefix

    def sum_tokens(self, account_id: str, start_exclusive: datetime, end_inclusive: datetime) -> int:
        timestamps = self._timestamps.get(account_id)
        prefix = self._prefix_totals.get(account_id)
        if not timestamps or not prefix:
            return 0
        start_index = bisect.bisect_right(timestamps, start_exclusive)
        end_index = bisect.bisect_right(timestamps, end_inclusive)
        if end_index <= start_index:
            return 0
        return prefix[end_index] - prefix[start_index]
