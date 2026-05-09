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
    <section className="rounded-2xl border border-border/40 bg-card/40 p-5 shadow-sm backdrop-blur-sm transition-all duration-200 hover:bg-card/50">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 shadow-inner">
            <Upload className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <div className="min-w-0 pt-0.5">
            <h3 className="text-sm font-semibold tracking-tight text-foreground">Import</h3>
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
