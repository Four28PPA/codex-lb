import { useState } from "react";
import { Route } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { buildSettingsUpdateRequest } from "@/features/settings/payload";
import type { DashboardSettings, SettingsUpdateRequest } from "@/features/settings/schemas";

export type RoutingSettingsProps = {
  settings: DashboardSettings;
  busy: boolean;
  onSave: (payload: SettingsUpdateRequest) => Promise<void>;
};

export function RoutingSettings({ settings, busy, onSave }: RoutingSettingsProps) {
  const [cacheAffinityTtl, setCacheAffinityTtl] = useState(
    String(settings.openaiCacheAffinityMaxAgeSeconds),
  );

  const save = (patch: Partial<SettingsUpdateRequest>) =>
    void onSave(buildSettingsUpdateRequest(settings, patch));

  const parsedCacheAffinityTtl = Number.parseInt(cacheAffinityTtl, 10);
  const cacheAffinityTtlValid = Number.isInteger(parsedCacheAffinityTtl) && parsedCacheAffinityTtl > 0;
  const cacheAffinityTtlChanged =
    cacheAffinityTtlValid && parsedCacheAffinityTtl !== settings.openaiCacheAffinityMaxAgeSeconds;

  return (
    <section className="rounded-2xl border border-border/40 bg-card/40 p-5 shadow-sm backdrop-blur-sm transition-all duration-200 hover:bg-card/50">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 shadow-inner">
            <Route className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <div className="min-w-0 pt-0.5">
            <h3 className="text-sm font-semibold tracking-tight text-foreground">Routing</h3>
            <p className="text-xs text-muted-foreground">Distribution, affinity, and reset bias.</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border/30 bg-background/40 p-4 shadow-inner">
            <div className="mb-3">
              <p className="text-sm font-medium">Stream transport</p>
              <p className="text-[11px] text-muted-foreground">
                Upstream connection mode.
              </p>
            </div>
            <Select
              value={settings.upstreamStreamTransport}
              onValueChange={(value) =>
                save({ upstreamStreamTransport: value as "default" | "auto" | "http" | "websocket" })
              }
            >
              <SelectTrigger className="h-9 w-full bg-background/50 text-xs border-border/40 shadow-inner focus-visible:bg-background transition-colors" disabled={busy}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end" className="rounded-xl border-border/40 shadow-md">
                <SelectItem value="default">Server default</SelectItem>
                <SelectItem value="auto">Auto</SelectItem>
                <SelectItem value="http">Responses</SelectItem>
                <SelectItem value="websocket">WebSockets</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-xl border border-border/30 bg-background/40 p-4 shadow-inner">
            <div className="mb-3">
              <p className="text-sm font-medium">Routing strategy</p>
              <p className="text-[11px] text-muted-foreground">Account selection policy.</p>
            </div>
            <Select
              value={settings.routingStrategy}
              onValueChange={(value) => save({ routingStrategy: value as "usage_weighted" | "round_robin" | "capacity_weighted" })}
            >
              <SelectTrigger className="h-9 w-full bg-background/50 text-xs border-border/40 shadow-inner focus-visible:bg-background transition-colors" disabled={busy}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end" className="rounded-xl border-border/40 shadow-md">
                <SelectItem value="capacity_weighted">Capacity weighted</SelectItem>
                <SelectItem value="usage_weighted">Usage weighted</SelectItem>
                <SelectItem value="round_robin">Round robin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-xl border border-border/30 bg-background/40 p-4 shadow-inner">
            <div>
              <p className="text-sm font-medium">Sticky threads</p>
              <p className="text-[11px] text-muted-foreground">Keep related requests on the same account.</p>
            </div>
            <Switch
              checked={settings.stickyThreadsEnabled}
              disabled={busy}
              onCheckedChange={(checked) => save({ stickyThreadsEnabled: checked })}
            />
          </div>

          <div className="flex items-center justify-between gap-3 rounded-xl border border-border/30 bg-background/40 p-4 shadow-inner">
            <div>
              <p className="text-sm font-medium">Prefer earlier reset</p>
              <p className="text-[11px] text-muted-foreground">Bias traffic to accounts with earlier quota reset.</p>
            </div>
            <Switch
              checked={settings.preferEarlierResetAccounts}
              disabled={busy}
              onCheckedChange={(checked) => save({ preferEarlierResetAccounts: checked })}
            />
          </div>

          <div className="rounded-xl border border-border/30 bg-background/40 p-4 shadow-inner sm:col-span-2">
            <div>
              <p className="text-sm font-medium">Prompt-cache affinity TTL</p>
              <p className="text-[11px] text-muted-foreground">
                Keep OpenAI-style prompt-cache mappings warm for a bounded number of seconds.
              </p>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Input
                type="number"
                min={1}
                step={1}
                inputMode="numeric"
                value={cacheAffinityTtl}
                disabled={busy}
                onChange={(event) => setCacheAffinityTtl(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && cacheAffinityTtlChanged) {
                    void save({ openaiCacheAffinityMaxAgeSeconds: parsedCacheAffinityTtl });
                  }
                }}
                className="h-9 w-28 text-xs bg-background/50 border-border/40 shadow-inner focus-visible:bg-background transition-colors"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-9 text-xs"
                disabled={busy || !cacheAffinityTtlChanged}
                onClick={() => void save({ openaiCacheAffinityMaxAgeSeconds: parsedCacheAffinityTtl })}
              >
                Save TTL
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
