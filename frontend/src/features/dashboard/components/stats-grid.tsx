import { SparklineChart } from "@/components/sparkline-chart";
import type { DashboardStat } from "@/features/dashboard/utils";
import { cn } from "@/lib/utils";

const ACCENT_STYLES = [
  "bg-blue-500/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400",
  "bg-violet-500/10 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400",
  "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400",
  "bg-amber-500/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400",
];

export type StatsGridProps = {
  stats: DashboardStat[];
  className?: string;
};

export function StatsGrid({ stats, className }: StatsGridProps) {
  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border/40 overflow-hidden rounded-2xl border bg-card shadow-[var(--shadow-sm)]", className)}>
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        const accent = ACCENT_STYLES[index % ACCENT_STYLES.length];
        return (
          <div
            key={stat.label}
            className="group relative flex flex-col justify-between p-5 transition-colors hover:bg-muted/30"
          >
            <div className="relative flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{stat.label}</span>
                <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg transition-transform group-hover:scale-105", accent)}>
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </div>
              </div>
              <div>
                <p className="text-3xl font-semibold tracking-[-0.03em] tabular-nums">{stat.value}</p>
                {stat.meta ? (
                  <p className="mt-1 text-xs text-muted-foreground">{stat.meta}</p>
                ) : null}
              </div>
            </div>
            {stat.trend.length > 0 ? (
              <div className="mt-4 h-10 w-full opacity-40 transition-opacity duration-500 group-hover:opacity-100">
                <SparklineChart data={stat.trend} color={stat.trendColor} index={index} />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
