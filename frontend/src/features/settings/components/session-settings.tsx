import { useState } from "react";
import { TimerReset } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buildSettingsUpdateRequest } from "@/features/settings/payload";
import type { DashboardSettings, SettingsUpdateRequest } from "@/features/settings/schemas";

export type SessionSettingsProps = {
  settings: DashboardSettings;
  busy: boolean;
  onSave: (payload: SettingsUpdateRequest) => Promise<void>;
};

const MIN_TTL_SECONDS = 3600;
const WARNING_THRESHOLD_SECONDS = 30 * 24 * 60 * 60;
const INTEGER_HOURS_PATTERN = /^\d+$/;

function formatStoredHours(ttlSeconds: number): string {
  const hours = ttlSeconds / 3600;
  // Preserve sub-hour TTLs without silently rounding them when the backend
  // already accepts any value >= MIN_TTL_SECONDS.
  return Number.isInteger(hours) ? String(hours) : hours.toFixed(2);
}

export function SessionSettings({ settings, busy, onSave }: SessionSettingsProps) {
  const [sessionHours, setSessionHours] = useState(formatStoredHours(settings.dashboardSessionTtlSeconds));

  const trimmed = sessionHours.trim();
  const isInteger = INTEGER_HOURS_PATTERN.test(trimmed);
  const parsedHours = isInteger ? Number.parseInt(trimmed, 10) : Number.NaN;
  const parsedSeconds = parsedHours * 3600;
  const valid = isInteger && Number.isFinite(parsedHours) && parsedHours > 0 && parsedSeconds >= MIN_TTL_SECONDS;
  const changed = valid && parsedSeconds !== settings.dashboardSessionTtlSeconds;
  const showLongSessionWarning = valid && parsedSeconds > WARNING_THRESHOLD_SECONDS;
  const showInvalidInputWarning = trimmed !== "" && !valid;

  const save = () =>
    void onSave(buildSettingsUpdateRequest(settings, { dashboardSessionTtlSeconds: parsedSeconds }));

  return (
    <section className="rounded-xl border bg-card p-4 shadow-[var(--shadow-xs)]">
      <div className="space-y-3">
        <div className="flex items-start gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <TimerReset className="h-4 w-4 text-primary" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold">Session</h3>
            <p className="text-xs text-muted-foreground">
              Password session lifetime.
            </p>
          </div>
        </div>

        <div className="rounded-lg border bg-muted/25 p-3">
          <div className="mb-2">
            <p className="text-sm font-medium">Dashboard lifetime</p>
            <p className="text-xs text-muted-foreground">
              New password sessions only.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              value={sessionHours}
              disabled={busy}
              onChange={(event) => setSessionHours(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && changed) {
                  save();
                }
              }}
              className="h-8 w-24 text-xs"
              aria-label="Dashboard session lifetime"
            />
            <span className="text-xs text-muted-foreground">hours</span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              disabled={busy || !changed}
              onClick={save}
            >
              Save lifetime
            </Button>
          </div>
        </div>

        {showInvalidInputWarning ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
            Enter a whole number of hours (1 or more). Decimals such as <code>1.5</code> are not accepted.
          </div>
        ) : null}
        {showLongSessionWarning ? (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs font-medium text-foreground">
            Lifetimes over 30 days keep admin sessions valid for a long time. That may be acceptable on a personal
            laptop, but it increases the impact of a leaked browser profile or stolen cookie.
          </div>
        ) : null}
      </div>
    </section>
  );
}
