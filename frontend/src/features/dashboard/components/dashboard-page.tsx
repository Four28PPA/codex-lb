import { useCallback, useMemo, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Activity, AlertTriangle, CheckCircle2, Gauge, ShieldAlert, type LucideIcon } from "lucide-react";

import { AlertMessage } from "@/components/alert-message";
import { Badge } from "@/components/ui/badge";
import { useAccountMutations } from "@/features/accounts/hooks/use-accounts";
import { AccountCards } from "@/features/dashboard/components/account-cards";
import { DashboardSkeleton } from "@/features/dashboard/components/dashboard-skeleton";
import { RequestFilters } from "@/features/dashboard/components/filters/request-filters";
import { RecentRequestsTable } from "@/features/dashboard/components/recent-requests-table";
import { StatsGrid } from "@/features/dashboard/components/stats-grid";
import { UsageDonuts } from "@/features/dashboard/components/usage-donuts";
import { useDashboard } from "@/features/dashboard/hooks/use-dashboard";
import { useRequestLogs } from "@/features/dashboard/hooks/use-request-logs";
import { buildDashboardView, type DashboardPosture } from "@/features/dashboard/utils";
import {
  parseOverviewTimeframe,
  type AccountSummary,
} from "@/features/dashboard/schemas";
import { useThemeStore } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";
import { REQUEST_STATUS_LABELS } from "@/utils/constants";
import { formatModelLabel, formatRate, formatSlug } from "@/utils/formatters";

const MODEL_OPTION_DELIMITER = ":::";

const POSTURE_STYLES: Record<DashboardPosture["level"], {
  icon: LucideIcon;
  eyebrow: string;
  badge: string;
  glow: string;
}> = {
  ready: {
    icon: CheckCircle2,
    eyebrow: "Traffic ready",
    badge: "border-emerald-500/25 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    glow: "from-emerald-500/25 via-primary/10 to-transparent",
  },
  watch: {
    icon: Gauge,
    eyebrow: "Capacity watch",
    badge: "border-amber-500/25 bg-amber-500/15 text-amber-700 dark:text-amber-300",
    glow: "from-amber-500/25 via-primary/10 to-transparent",
  },
  blocked: {
    icon: ShieldAlert,
    eyebrow: "Action needed",
    badge: "border-red-500/25 bg-red-500/15 text-red-700 dark:text-red-300",
    glow: "from-red-500/25 via-primary/10 to-transparent",
  },
  monitoring: {
    icon: Activity,
    eyebrow: "Monitoring",
    badge: "border-sky-500/25 bg-sky-500/15 text-sky-700 dark:text-sky-300",
    glow: "from-sky-500/25 via-primary/10 to-transparent",
  },
};

function PostureCard({ posture }: { posture: DashboardPosture }) {
  const style = POSTURE_STYLES[posture.level];
  const Icon = style.icon;
  return (
    <article className="group relative flex flex-col justify-between overflow-clip rounded-2xl border border-border/60 bg-gradient-to-b from-card to-background p-6 shadow-[var(--shadow-sm)] transition-all duration-300 hover:border-primary/20 hover:shadow-[var(--shadow-md)] motion-reduce:transition-none lg:col-span-4">
      <div className={cn("pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-gradient-to-br opacity-20 blur-3xl transition-opacity duration-500 group-hover:opacity-40", style.glow)} />
      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{style.eyebrow}</p>
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-3xl font-bold tracking-tight">{posture.label}</h2>
              {posture.errorRate != null && posture.errorRate > 0 && (
                <Badge variant="outline" className={cn("h-6 rounded-full px-2 text-[10px] font-medium", style.badge)}>
                  {formatRate(posture.errorRate)} errors
                </Badge>
              )}
            </div>
          </div>
          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-background/50 backdrop-blur-sm transition-[transform,box-shadow] duration-300 group-hover:scale-105 group-hover:shadow-[0_0_24px_rgba(79,70,229,0.18)] motion-reduce:transition-none", style.badge)}>
            <Icon className="h-4 w-4" aria-hidden="true" />
          </div>
        </div>
      </div>
      <div className="relative mt-6">
        <p className="text-sm text-muted-foreground">{posture.summary}</p>
      </div>
    </article>
  );
}

function SectionFrame({
  eyebrow,
  title,
  description,
  children,
  className,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("relative", className)}>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-primary/80">{eyebrow}</p>
          <h2 className="mt-1 text-xl font-semibold tracking-[-0.025em]">{title}</h2>
          {description ? <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p> : null}
        </div>
      </div>
      <div>{children}</div>
    </section>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isDark = useThemeStore((s) => s.theme === "dark");
  const overviewTimeframe = useMemo(
    () => parseOverviewTimeframe(searchParams.get("overviewTimeframe")),
    [searchParams],
  );
  const dashboardQuery = useDashboard(overviewTimeframe);
  const { filters, logsQuery, optionsQuery, updateFilters } = useRequestLogs();
  const { resumeMutation } = useAccountMutations();
  const handleAccountAction = useCallback(
    (account: AccountSummary, action: string) => {
      switch (action) {
        case "details":
          navigate(`/access/accounts?selected=${account.accountId}`);
          break;
        case "resume":
          void resumeMutation.mutateAsync(account.accountId);
          break;
        case "reauth":
          navigate(`/access/accounts?selected=${account.accountId}`);
          break;
      }
    },
    [navigate, resumeMutation],
  );

  const overview = dashboardQuery.data;
  const logPage = logsQuery.data;

  const view = useMemo(() => {
    if (!overview || !logPage) {
      return null;
    }
    return buildDashboardView(overview, logPage.requests, isDark);
  }, [overview, logPage, isDark]);

  const accountOptions = useMemo(() => {
    const entries = new Map<string, { label: string; isEmail: boolean }>();
    for (const account of overview?.accounts ?? []) {
      const raw = account.displayName || account.email || account.accountId;
      const isEmail = !!account.email && raw === account.email;
      entries.set(account.accountId, { label: raw, isEmail });
    }
    return (optionsQuery.data?.accountIds ?? []).map((accountId) => {
      const entry = entries.get(accountId);
      return {
        value: accountId,
        label: entry?.label ?? accountId,
        isEmail: entry?.isEmail ?? false,
      };
    });
  }, [optionsQuery.data?.accountIds, overview?.accounts]);

  const apiKeyOptions = useMemo(
    () =>
      (optionsQuery.data?.apiKeys ?? []).map((option) => ({
        value: option.id,
        label: option.keyPrefix ? `${option.name} · ${option.keyPrefix}` : option.name,
      })),
    [optionsQuery.data?.apiKeys],
  );

  const modelOptions = useMemo(
    () =>
      (optionsQuery.data?.modelOptions ?? []).map((option) => ({
        value: `${option.model}${MODEL_OPTION_DELIMITER}${option.reasoningEffort ?? ""}`,
        label: formatModelLabel(option.model, option.reasoningEffort),
      })),
    [optionsQuery.data?.modelOptions],
  );

  const statusOptions = useMemo(
    () =>
      (optionsQuery.data?.statuses ?? []).map((status) => ({
        value: status,
        label: REQUEST_STATUS_LABELS[status] ?? formatSlug(status),
      })),
    [optionsQuery.data?.statuses],
  );

  const errorMessage =
    (dashboardQuery.error instanceof Error && dashboardQuery.error.message) ||
    (logsQuery.error instanceof Error && logsQuery.error.message) ||
    (optionsQuery.error instanceof Error && optionsQuery.error.message) ||
    null;

  return (
    <div className="space-y-8 animate-fade-in-up">
      {errorMessage ? (
        <AlertMessage variant="error">
          <span className="inline-flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            {errorMessage}
          </span>
        </AlertMessage>
      ) : null}

      {!view ? (
        <DashboardSkeleton />
      ) : (
        <>
          <section className="grid gap-4 lg:grid-cols-12">
            <PostureCard posture={view.posture} />
            <StatsGrid stats={view.stats} className="lg:col-span-8" />
          </section>

          <section className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <UsageDonuts
                primaryItems={view.primaryUsageItems}
                secondaryItems={view.secondaryUsageItems}
                primaryTotal={view.primaryCapacityTotal}
                secondaryTotal={view.secondaryCapacityTotal}
                primaryCenterValue={view.primaryTotal}
                secondaryCenterValue={view.secondaryTotal}
                tokenRunwayPrimary={view.tokenRunwayPrimary}
                tokenRunwaySecondary={view.tokenRunwaySecondary}
                safeLinePrimary={view.safeLinePrimary}
                safeLineSecondary={view.safeLineSecondary}
              />
            </div>
            <div className="lg:col-span-4 flex flex-col">
              <div className="flex-1 rounded-2xl border bg-card/50 p-2 shadow-[var(--shadow-sm)]">
                <AccountCards accounts={overview?.accounts ?? []} onAction={handleAccountAction} />
              </div>
            </div>
          </section>

          <SectionFrame
            eyebrow="Request evidence"
            title="Routing audit trail"
            description="Filter recent traffic by account, key, model, and status while keeping request rows in a scan-friendly table."
          >
            <div className="space-y-4">
              <RequestFilters
                filters={filters}
                accountOptions={accountOptions}
                apiKeyOptions={apiKeyOptions}
                modelOptions={modelOptions}
                statusOptions={statusOptions}
                onSearchChange={(search) => updateFilters({ search, offset: 0 })}
                onTimeframeChange={(timeframe) => updateFilters({ timeframe, offset: 0 })}
                onAccountChange={(accountIds) => updateFilters({ accountIds, offset: 0 })}
                onApiKeyChange={(apiKeyIds) => updateFilters({ apiKeyIds, offset: 0 })}
                onModelChange={(modelOptionsSelected) =>
                  updateFilters({ modelOptions: modelOptionsSelected, offset: 0 })
                }
                onStatusChange={(statuses) => updateFilters({ statuses, offset: 0 })}
                onReset={() =>
                  updateFilters({
                    search: "",
                    timeframe: "all",
                    accountIds: [],
                    apiKeyIds: [],
                    modelOptions: [],
                    statuses: [],
                    offset: 0,
                  })
                }
              />
              <div className="transition-opacity duration-200">
                <RecentRequestsTable
                  requests={view.requestLogs}
                  accounts={overview?.accounts ?? []}
                  total={logPage?.total ?? 0}
                  limit={filters.limit}
                  offset={filters.offset}
                  hasMore={logPage?.hasMore ?? false}
                  onLimitChange={(limit) => updateFilters({ limit, offset: 0 })}
                  onOffsetChange={(offset) => updateFilters({ offset })}
                />
              </div>
            </div>
          </SectionFrame>
        </>
      )}
    </div>
  );
}
