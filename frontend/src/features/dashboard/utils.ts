import { Activity, Coins, DollarSign, type LucideIcon } from "lucide-react";

import type {
  AccountSummary,
  DashboardOverview,
  Depletion,
  RequestLog,
  TokenRunwayEstimate,
  TrendPoint,
  UsageWindow,
} from "@/features/dashboard/schemas";
import { buildDuplicateAccountIdSet, formatCompactAccountId } from "@/utils/account-identifiers";
import { buildDonutPalette } from "@/utils/colors";
import {
  formatCachedTokensMeta,
  formatCompactNumber,
  formatCurrency,
  formatWindowMinutes,
} from "@/utils/formatters";

export type RemainingItem = {
  accountId: string;
  label: string;
  /** Suffix appended after the label (e.g. compact account ID for duplicates). Not blurred. */
  labelSuffix: string;
  /** True when the displayed label is the account email (should be blurred in privacy mode). */
  isEmail: boolean;
  value: number;
  remainingPercent: number | null;
  color: string;
};

export type DashboardStat = {
  label: string;
  value: string;
  meta?: string;
  icon: LucideIcon;
  trend: { value: number }[];
  trendColor: string;
};

export type DashboardPosture = {
  level: "ready" | "watch" | "blocked" | "monitoring";
  label: string;
  summary: string;
  detail: string;
  errorRate: number | null;
  errorCount: number;
  constrainedAccounts: number;
};

export interface SafeLineView {
  safePercent: number;
  riskLevel: "safe" | "warning" | "danger" | "critical";
}

export type DashboardView = {
  stats: DashboardStat[];
  posture: DashboardPosture;
  primaryUsageItems: RemainingItem[];
  secondaryUsageItems: RemainingItem[];
  /** Sum of visible primary remaining items shown in the donut center label. */
  primaryTotal: number;
  /** Sum of visible secondary remaining items shown in the donut center label. */
  secondaryTotal: number;
  /** Estimated primary token capacity for the donut's used-vs-left denominator. */
  primaryCapacityTotal: number;
  /** Estimated secondary token capacity for the donut's used-vs-left denominator. */
  secondaryCapacityTotal: number;
  requestLogs: RequestLog[];
  safeLinePrimary: SafeLineView | null;
  safeLineSecondary: SafeLineView | null;
  tokenRunwayPrimary: TokenRunwayEstimate | null;
  tokenRunwaySecondary: TokenRunwayEstimate | null;
};

export function buildDepletionView(depletion: Depletion | null | undefined): SafeLineView | null {
  if (!depletion || depletion.riskLevel === "safe") return null;
  return { safePercent: depletion.safeUsagePercent, riskLevel: depletion.riskLevel };
}

const PLAN_TOKEN_BUDGET = 600_000_000;

function buildWindowIndex(window: UsageWindow | null): Map<string, number> {
  const index = new Map<string, number>();
  if (!window) {
    return index;
  }
  for (const entry of window.accounts) {
    if (entry.remainingPercentAvg == null && entry.remainingCredits <= 0) {
      continue;
    }
    if (Number.isFinite(entry.remainingCredits)) {
      index.set(entry.accountId, entry.remainingCredits);
    }
  }
  return index;
}

function isWeeklyOnlyAccount(account: AccountSummary): boolean {
  return account.windowMinutesPrimary == null && account.windowMinutesSecondary != null;
}

function accountRemainingPercent(account: AccountSummary, windowKey: "primary" | "secondary"): number | null {
  if (windowKey === "secondary") {
    return account.usage?.secondaryRemainingPercent ?? null;
  }
  return account.usage?.primaryRemainingPercent ?? null;
}

/**
 * Cap primary (5h) remaining by secondary (7d) absolute credits.
 *
 * The 7d window is a hard quota gate — when its remaining credits are lower
 * than the 5h remaining credits, the account can only use up to the 7d amount
 * regardless of 5h headroom.  Comparing absolute credits (not percentages) is
 * essential because the two windows have vastly different capacities
 * (e.g. 225 vs 7 560 for Plus plans).
 */
export function applySecondaryConstraint(
  primaryItems: RemainingItem[],
  secondaryItems: RemainingItem[],
): RemainingItem[] {
  const secondaryByAccount = new Map<string, RemainingItem>();
  for (const item of secondaryItems) {
    secondaryByAccount.set(item.accountId, item);
  }

  return primaryItems.map((item) => {
    const secondaryItem = secondaryByAccount.get(item.accountId);
    if (!secondaryItem) return item;
    if (secondaryItem.remainingPercent == null) return item;
    if (secondaryItem.value >= item.value) return item;

    const effectivePercent =
      item.remainingPercent != null && item.value > 0
        ? item.remainingPercent * (secondaryItem.value / item.value)
        : item.remainingPercent;

    return {
      ...item,
      value: Math.max(0, secondaryItem.value),
      remainingPercent: effectivePercent != null ? Math.max(0, effectivePercent) : null,
    };
  });
}

export function buildRemainingItems(
  accounts: AccountSummary[],
  window: UsageWindow | null,
  windowKey: "primary" | "secondary",
  isDark = false,
  fallbackRemainingTotal?: number | null,
): RemainingItem[] {
  const usageIndex = buildWindowIndex(window);
  const palette = buildDonutPalette(accounts.length, isDark);
  const duplicateAccountIds = buildDuplicateAccountIdSet(accounts);
  const visibleAccounts = accounts.filter((account) => !(windowKey === "primary" && isWeeklyOnlyAccount(account)));
  const hasWindowRows = usageIndex.size > 0;
  const shouldUseSingleAccountSummaryFallback =
    !hasWindowRows &&
    visibleAccounts.length === 1 &&
    fallbackRemainingTotal != null &&
    Number.isFinite(fallbackRemainingTotal);

  return visibleAccounts
    .map((account, index) => {
      const remaining = usageIndex.get(account.accountId)
        ?? (shouldUseSingleAccountSummaryFallback ? Math.max(0, fallbackRemainingTotal) : 0);
      const rawLabel = account.displayName || account.email || account.accountId;
      const labelIsEmail = !!account.email && rawLabel === account.email;
      const labelSuffix = duplicateAccountIds.has(account.accountId)
        ? ` (${formatCompactAccountId(account.accountId, 5, 4)})`
        : "";
      return {
        accountId: account.accountId,
        label: rawLabel,
        labelSuffix,
        isEmail: labelIsEmail,
        value: remaining,
        remainingPercent: accountRemainingPercent(account, windowKey),
        color: palette[index % palette.length],
      };
    });
}

function tokenBudgetForAccount(): number {
  return PLAN_TOKEN_BUDGET;
}

export function buildTokenRemainingItems(
  accounts: AccountSummary[],
  windowKey: "primary" | "secondary",
  isDark = false,
): RemainingItem[] {
  const palette = buildDonutPalette(accounts.length, isDark);
  const duplicateAccountIds = buildDuplicateAccountIdSet(accounts);
  const visibleAccounts = accounts.filter((account) => !(windowKey === "primary" && isWeeklyOnlyAccount(account)));

  return visibleAccounts.map((account, index) => {
    const remainingPercent = accountRemainingPercent(account, windowKey);
    const tokenBudget = tokenBudgetForAccount();
    const remainingTokens = remainingPercent == null ? 0 : (tokenBudget * Math.max(0, Math.min(100, remainingPercent))) / 100;
    const rawLabel = account.displayName || account.email || account.accountId;
    const labelIsEmail = !!account.email && rawLabel === account.email;
    const labelSuffix = duplicateAccountIds.has(account.accountId)
      ? ` (${formatCompactAccountId(account.accountId, 5, 4)})`
      : "";

    return {
      accountId: account.accountId,
      label: rawLabel,
      labelSuffix,
      isEmail: labelIsEmail,
      value: remainingTokens,
      remainingPercent,
      color: palette[index % palette.length],
    };
  });
}

function tokenCapacityTotal(accounts: AccountSummary[], windowKey: "primary" | "secondary"): number {
  return accounts
    .filter((account) => !(windowKey === "primary" && isWeeklyOnlyAccount(account)))
    .reduce((total) => total + tokenBudgetForAccount(), 0);
}

function tokenRunwayWithPlanFallback(
  estimate: TokenRunwayEstimate | null | undefined,
  remainingTokens: number,
  windowKey: "primary" | "secondary",
): TokenRunwayEstimate | null {
  if (remainingTokens <= 0) {
    return estimate ?? null;
  }

  return {
    windowKey: estimate?.windowKey ?? windowKey,
    estimatedTokensRemaining: remainingTokens,
    tokensPerCredit: null,
    observedTokens: estimate?.observedTokens ?? 0,
    observedCreditDelta: estimate?.observedCreditDelta ?? 0,
    samples: estimate?.samples ?? 0,
    confidence: estimate?.confidence === "learning" || !estimate ? "low" : estimate.confidence,
    lastLearnedAt: estimate?.lastLearnedAt ?? null,
  };
}

function avgPerUnit(total: number, units: number): number {
  if (!Number.isFinite(total) || total <= 0 || units <= 0) {
    return 0;
  }
  return total / units;
}

function formatCursorPlanEstimate(tokens: number | null | undefined): string {
  const safeTokens = Math.max(0, tokens ?? 0);
  const planCount = safeTokens / 600_000_000;
  return `${planCount.toLocaleString("en-US", { maximumFractionDigits: 2 })} × $200 Cursor plans`;
}

const TREND_COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b"];

function trendPointsToValues(points: TrendPoint[]): { value: number }[] {
  return points.map((p) => ({ value: p.v }));
}

/** Sum the `value` fields of remaining items (clamped to >= 0). */
export function sumRemaining(items: RemainingItem[]): number {
  return items.reduce((sum, item) => sum + Math.max(0, item.value), 0);
}

function countConstrainedAccounts(accounts: AccountSummary[]): number {
  return accounts.filter((account) => {
    const primary = account.usage?.primaryRemainingPercent;
    const secondary = account.usage?.secondaryRemainingPercent;
    return (primary != null && primary < 15) || (secondary != null && secondary < 15);
  }).length;
}

export function buildDashboardPosture(overview: DashboardOverview): DashboardPosture {
  const metrics = overview.summary.metrics;
  const errorRate = metrics?.errorRate ?? null;
  const errorCount = metrics?.errorCount ?? 0;
  const topError = metrics?.topError;
  const constrainedAccounts = countConstrainedAccounts(overview.accounts);
  const depletionLevels = [overview.depletionPrimary?.riskLevel, overview.depletionSecondary?.riskLevel].filter(Boolean);
  const hasCriticalDepletion = depletionLevels.includes("critical") || depletionLevels.includes("danger");
  const hasWarningDepletion = depletionLevels.includes("warning");

  if (errorRate != null && errorRate >= 0.05) {
    return {
      level: "blocked",
      label: "Blocked",
      summary: "Request failures need attention",
      detail: topError ? `Top error: ${topError}` : `${formatCompactNumber(errorCount)} recent errors`,
      errorRate,
      errorCount,
      constrainedAccounts,
    };
  }

  if (hasCriticalDepletion || constrainedAccounts > 0 || (errorRate != null && errorRate >= 0.01)) {
    return {
      level: "watch",
      label: "Watch",
      summary: "Routing is active with capacity pressure",
      detail: constrainedAccounts > 0
        ? `${constrainedAccounts} account${constrainedAccounts === 1 ? "" : "s"} below 15% remaining`
        : topError
          ? `Top error: ${topError}`
          : "Capacity safe line is elevated",
      errorRate,
      errorCount,
      constrainedAccounts,
    };
  }

  if (hasWarningDepletion) {
    return {
      level: "watch",
      label: "Watch",
      summary: "Usage is trending toward the safe line",
      detail: "Monitor the active token window before heavy traffic.",
      errorRate,
      errorCount,
      constrainedAccounts,
    };
  }

  if ((metrics?.requests ?? 0) === 0) {
    return {
      level: "monitoring",
      label: "Monitoring",
      summary: "Waiting for request traffic",
      detail: "Dashboard will populate as proxy traffic arrives.",
      errorRate,
      errorCount,
      constrainedAccounts,
    };
  }

  return {
    level: "ready",
    label: "Ready",
    summary: "Routing posture looks healthy",
    detail: "No immediate token or error pressure detected.",
    errorRate,
    errorCount,
    constrainedAccounts,
  };
}

export function buildDashboardView(
  overview: DashboardOverview,
  requestLogs: RequestLog[],
  isDark = false,
): DashboardView {
  const secondaryWindow = overview.windows.secondary;
  const metrics = overview.summary.metrics;
  const timeframeLabel = (() => {
    const formatted = formatWindowMinutes(overview.timeframe.windowMinutes);
    return formatted === "--" ? overview.timeframe.key : formatted;
  })();
  const timeframeHours = overview.timeframe.windowMinutes / 60;
  const timeframeDays = overview.timeframe.windowMinutes / 1440;
  const requestMeta =
    timeframeHours <= 24
      ? `Avg/hr ${formatCompactNumber(Math.round(avgPerUnit(metrics?.requests ?? 0, timeframeHours)))}`
      : `Avg/day ${formatCompactNumber(Math.round(avgPerUnit(metrics?.requests ?? 0, timeframeDays)))}`;
  const trends = overview.trends;
  const totalTokens = metrics?.tokens ?? 0;

  const stats: DashboardStat[] = [
    {
      label: `Requests (${timeframeLabel})`,
      value: formatCompactNumber(metrics?.requests ?? 0),
      meta: requestMeta,
      icon: Activity,
      trend: trendPointsToValues(trends.requests),
      trendColor: TREND_COLORS[0],
    },
    {
      label: `Tokens (${timeframeLabel})`,
      value: formatCompactNumber(metrics?.tokens ?? 0),
      meta: formatCachedTokensMeta(metrics?.tokens, metrics?.cachedInputTokens),
      icon: Coins,
      trend: trendPointsToValues(trends.tokens),
      trendColor: TREND_COLORS[1],
    },
    {
      label: `Cost (${timeframeLabel})`,
      value: formatCurrency((totalTokens / 600_000_000) * 200),
      meta: `Estimate ${formatCursorPlanEstimate(totalTokens)}`,
      icon: DollarSign,
      trend: trendPointsToValues(trends.tokens).map((point) => ({ value: (point.value / 600_000_000) * 200 })),
      trendColor: TREND_COLORS[2],
    },
  ];

  const rawPrimaryItems = buildTokenRemainingItems(
    overview.accounts,
    "primary",
    isDark,
  );
  const secondaryUsageItems = buildTokenRemainingItems(
    overview.accounts,
    "secondary",
    isDark,
  );
  const primaryUsageItems = secondaryWindow
    ? applySecondaryConstraint(rawPrimaryItems, secondaryUsageItems)
    : rawPrimaryItems;
  const primaryTotal = sumRemaining(primaryUsageItems);
  const secondaryTotal = sumRemaining(secondaryUsageItems);
  const primaryCapacityTotal = tokenCapacityTotal(overview.accounts, "primary");
  const secondaryCapacityTotal = tokenCapacityTotal(overview.accounts, "secondary");

  return {
    stats,
    posture: buildDashboardPosture(overview),
    primaryUsageItems,
    secondaryUsageItems,
    primaryTotal,
    secondaryTotal,
    primaryCapacityTotal,
    secondaryCapacityTotal,
    requestLogs,
    safeLinePrimary: buildDepletionView(overview.depletionPrimary),
    safeLineSecondary: buildDepletionView(overview.depletionSecondary),
    tokenRunwayPrimary: tokenRunwayWithPlanFallback(overview.tokenRunway?.primary ?? null, primaryTotal, "primary"),
    tokenRunwaySecondary: tokenRunwayWithPlanFallback(overview.tokenRunway?.secondary ?? null, secondaryTotal, "secondary"),
  };
}
