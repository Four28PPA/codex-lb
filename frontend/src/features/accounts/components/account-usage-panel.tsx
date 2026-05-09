import { Clock } from "lucide-react";

import { cn } from "@/lib/utils";
import { AccountTrendChart } from "@/features/accounts/components/account-trend-chart";
import type { AccountSummary, AccountTrendsResponse } from "@/features/accounts/schemas";
import { quotaBarColor } from "@/utils/account-status";
import {
  formatCompactNumber,
  formatCurrency,
  formatPercentNullable,
  formatQuotaResetLabel,
} from "@/utils/formatters";

export type AccountUsagePanelProps = {
  account: AccountSummary;
  trends?: AccountTrendsResponse | null;
};

function QuotaRow({
  label,
  percent,
  resetAt,
}: {
  label: string;
  percent: number | null;
  resetAt: string | null | undefined;
}) {
  const clamped = percent === null ? 0 : Math.max(0, Math.min(100, percent));
  const hasPercent = percent !== null;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-wider">
        <span className="font-medium text-muted-foreground">{label} remaining</span>
        <span
          className={cn(
            "tabular-nums font-bold",
            !hasPercent
              ? "text-muted-foreground"
              : clamped >= 70
                ? "text-emerald-500"
                : clamped >= 30
                  ? "text-amber-500"
                  : "text-red-500",
          )}
        >
          {formatPercentNullable(percent)}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/60 shadow-inner">
        <div
          className={cn("h-full rounded-full transition-all duration-500 ease-out", quotaBarColor(clamped))}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <Clock className="h-3 w-3 shrink-0" />
        <span>Reset {formatQuotaResetLabel(resetAt ?? null)}</span>
      </div>
    </div>
  );
}

export function AccountUsagePanel({ account, trends }: AccountUsagePanelProps) {
  const primary = account.usage?.primaryRemainingPercent ?? null;
  const secondary = account.usage?.secondaryRemainingPercent ?? null;
  const requestUsage = account.requestUsage ?? null;
  const hasRequestUsage = (requestUsage?.requestCount ?? 0) > 0;
  const weeklyOnly = account.windowMinutesPrimary == null && account.windowMinutesSecondary != null;
  const hasTrends = trends && (trends.primary.length > 0 || trends.secondary.length > 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {!weeklyOnly && (
          <div className="flex flex-col gap-1.5 rounded-xl border border-border/40 bg-card/40 p-4 shadow-inner">
            <QuotaRow label="5h" percent={primary} resetAt={account.resetAtPrimary} />
          </div>
        )}
        <div className="flex flex-col gap-1.5 rounded-xl border border-border/40 bg-card/40 p-4 shadow-inner">
          <QuotaRow label="Weekly" percent={secondary} resetAt={account.resetAtSecondary} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5 rounded-xl border border-border/40 bg-card/40 p-4 shadow-inner">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Request logs total</span>
        <div className="tabular-nums">
          {hasRequestUsage ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              <span className="font-semibold text-foreground/90">
                {formatCompactNumber(requestUsage?.totalTokens)} <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Tok</span>
              </span>
              <span className="h-3 w-px bg-border/60" />
              <span className="font-semibold text-foreground/90">
                {formatCompactNumber(requestUsage?.cachedInputTokens)} <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Cached</span>
              </span>
              <span className="h-3 w-px bg-border/60" />
              <span className="font-semibold text-foreground/90">
                {formatCompactNumber(requestUsage?.requestCount)} <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Req</span>
              </span>
              <span className="h-3 w-px bg-border/60" />
              <span className="font-semibold text-foreground/90">
                {formatCurrency(requestUsage?.totalCostUsd)}
              </span>
            </div>
          ) : (
            <span className="text-sm font-medium text-muted-foreground">No request usage yet.</span>
          )}
        </div>
      </div>

      {hasTrends && (
        <div className="relative overflow-hidden rounded-xl border border-border/40 bg-card/40 shadow-inner">
          <div className="flex items-center justify-between p-4 border-b border-border/30">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">7-day trend</span>
            <div className="flex items-center gap-4 text-[11px] font-medium tracking-wide uppercase text-muted-foreground">
              <span className="flex items-center gap-1.5">
                5h
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-chart-1 shadow-sm" />
              </span>
              <span className="flex items-center gap-1.5">
                Weekly
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-chart-2 shadow-sm" />
              </span>
            </div>
          </div>
          <div className="p-4">
            <AccountTrendChart primary={trends.primary} secondary={trends.secondary} />
          </div>
        </div>
      )}
    </div>
  );
}
