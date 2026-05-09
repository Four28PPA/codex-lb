import { RotateCcw, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MultiSelectFilter, type MultiSelectOption } from "@/features/dashboard/components/filters/multi-select-filter";
import { TimeframeSelect } from "@/features/dashboard/components/filters/timeframe-select";
import type { FilterState } from "@/features/dashboard/schemas";

export type RequestFiltersProps = {
  filters: FilterState;
  accountOptions: MultiSelectOption[];
  apiKeyOptions: MultiSelectOption[];
  modelOptions: MultiSelectOption[];
  statusOptions: MultiSelectOption[];
  onSearchChange: (value: string) => void;
  onTimeframeChange: (value: FilterState["timeframe"]) => void;
  onAccountChange: (values: string[]) => void;
  onApiKeyChange: (values: string[]) => void;
  onModelChange: (values: string[]) => void;
  onStatusChange: (values: string[]) => void;
  onReset: () => void;
};

export function RequestFilters({
  filters,
  accountOptions,
  apiKeyOptions,
  modelOptions,
  statusOptions,
  onSearchChange,
  onTimeframeChange,
  onAccountChange,
  onApiKeyChange,
  onModelChange,
  onStatusChange,
  onReset,
}: RequestFiltersProps) {
  return (
    <div className="rounded-xl border border-border/40 bg-card/30 p-2 shadow-[var(--shadow-xs)] backdrop-blur-md transition-colors hover:bg-card/50">
      <div className="grid items-center gap-2 lg:grid-cols-[minmax(16rem,0.8fr)_minmax(0,1.2fr)]">
        <div className="flex min-w-0 items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" aria-hidden="true" />
            <Input
              value={filters.search}
              onChange={(event) => onSearchChange(event.target.value)}
              className="h-8 pl-9 border-border/40 bg-background/50 shadow-none focus-visible:ring-1 focus-visible:bg-background transition-colors hover:border-border/80"
              placeholder="Search requests..."
            />
          </div>
          <TimeframeSelect value={filters.timeframe} onChange={onTimeframeChange} />
        </div>

        <div className="flex min-w-0 flex-wrap items-center justify-start gap-2 lg:justify-end">
          <MultiSelectFilter
            label="Accounts"
            values={filters.accountIds}
            options={accountOptions}
            onChange={onAccountChange}
          />
          <MultiSelectFilter
            label="API Keys"
            values={filters.apiKeyIds}
            options={apiKeyOptions}
            onChange={onApiKeyChange}
          />
          <MultiSelectFilter
            label="Models"
            values={filters.modelOptions}
            options={modelOptions}
            onChange={onModelChange}
          />
          <MultiSelectFilter
            label="Statuses"
            values={filters.statuses}
            options={statusOptions}
            onChange={onStatusChange}
          />

          <Button type="button" variant="ghost" size="sm" onClick={onReset} className="h-8 gap-1.5 px-2 text-xs font-medium text-muted-foreground hover:text-foreground">
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Reset
          </Button>
        </div>
      </div>
    </div>
  );
}
