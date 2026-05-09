import { Upload } from "lucide-react";

import { Switch } from "@/components/ui/switch";
import { buildSettingsUpdateRequest } from "@/features/settings/payload";
import type { DashboardSettings, SettingsUpdateRequest } from "@/features/settings/schemas";

export type ImportSettingsProps = {
  settings: DashboardSettings;
  busy: boolean;
  onSave: (payload: SettingsUpdateRequest) => Promise<void>;
};

export function ImportSettings({ settings, busy, onSave }: ImportSettingsProps) {
  const save = (patch: Partial<SettingsUpdateRequest>) =>
    void onSave(buildSettingsUpdateRequest(settings, patch));

  return (
    <section className="rounded-xl border bg-card p-3 shadow-[var(--shadow-xs)]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Upload className="h-4 w-4 text-primary" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold">Import</h3>
            <p className="text-xs text-muted-foreground">Keep duplicate accounts separate.</p>
          </div>
        </div>
        <Switch
          checked={settings.importWithoutOverwrite}
          disabled={busy}
          aria-label="Allow import without overwrite"
          onCheckedChange={(checked) => save({ importWithoutOverwrite: checked })}
        />
      </div>
    </section>
  );
}
