import { CircleAlert, Inbox } from "lucide-react";
import { useMemo, useState } from "react";

import { isEmailLabel } from "@/components/blur-email";
import { CopyButton } from "@/components/copy-button";
import { usePrivacyStore } from "@/hooks/use-privacy";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PaginationControls } from "@/features/dashboard/components/filters/pagination-controls";
import type { AccountSummary, RequestLog } from "@/features/dashboard/schemas";
import { REQUEST_STATUS_LABELS } from "@/utils/constants";
import { cn } from "@/lib/utils";
import { formatCompactNumber, formatCurrency, formatModelLabel, formatSlug, formatTimeLong, formatDateTimeInline } from "@/utils/formatters";

const STATUS_CLASS_MAP: Record<string, string> = {
  ok: "bg-emerald-500/15 text-emerald-700 border-emerald-500/20 hover:bg-emerald-500/20 dark:text-emerald-400",
  rate_limit: "bg-orange-500/15 text-orange-700 border-orange-500/20 hover:bg-orange-500/20 dark:text-orange-400",
  quota: "bg-red-500/15 text-red-700 border-red-500/20 hover:bg-red-500/20 dark:text-red-400",
  error: "bg-zinc-500/15 text-zinc-700 border-zinc-500/20 hover:bg-zinc-500/20 dark:text-zinc-400",
};

const TRANSPORT_LABELS: Record<string, string> = {
  http: "HTTP",
  websocket: "WS",
};

const TRANSPORT_CLASS_MAP: Record<string, string> = {
  http: "bg-slate-500/10 text-slate-700 border-slate-500/20 hover:bg-slate-500/15 dark:text-slate-300",
  websocket: "bg-sky-500/15 text-sky-700 border-sky-500/20 hover:bg-sky-500/20 dark:text-sky-300",
};

const PLAN_CLASS_MAP: Record<string, string> = {
  free: "bg-zinc-500/10 text-zinc-700 border-zinc-500/20 hover:bg-zinc-500/15 dark:text-zinc-300",
  plus: "bg-emerald-500/15 text-emerald-700 border-emerald-500/20 hover:bg-emerald-500/20 dark:text-emerald-400",
  team: "bg-sky-500/15 text-sky-700 border-sky-500/20 hover:bg-sky-500/20 dark:text-sky-300",
  pro: "bg-violet-500/15 text-violet-700 border-violet-500/20 hover:bg-violet-500/20 dark:text-violet-300",
};

export type RecentRequestsTableProps = {
  requests: RequestLog[];
  accounts: AccountSummary[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  onLimitChange: (limit: number) => void;
  onOffsetChange: (offset: number) => void;
};

export function RecentRequestsTable({
  requests,
  accounts,
  total,
  limit,
  offset,
  hasMore,
  onLimitChange,
  onOffsetChange,
}: RecentRequestsTableProps) {
  const [selectedRequest, setSelectedRequest] = useState<RequestLog | null>(null);
  const blurred = usePrivacyStore((s) => s.blurred);

  const accountLabelMap = useMemo(() => {
    const index = new Map<string, string>();
    for (const account of accounts) {
      index.set(account.accountId, account.displayName || account.email || account.accountId);
    }
    return index;
  }, [accounts]);

  /** Account IDs whose label is an email. */
  const emailLabelIds = useMemo(() => {
    const ids = new Set<string>();
    for (const account of accounts) {
      const label = account.displayName || account.email;
      if (isEmailLabel(label, account.email)) {
        ids.add(account.accountId);
      }
    }
    return ids;
  }, [accounts]);

  if (requests.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title="No request logs"
        description="No request logs match the current filters."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-clip rounded-2xl border border-border/50 bg-gradient-to-b from-card/80 to-background shadow-[var(--shadow-sm)] backdrop-blur-sm">
        <div className="relative overflow-x-auto">
          <Table className="min-w-[1240px] table-fixed">
            <TableHeader className="bg-muted/20">
              <TableRow className="border-border/40 hover:bg-transparent">
                <TableHead className="w-28 pl-6 h-12 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Time</TableHead>
                <TableHead className="h-12 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Account</TableHead>
                <TableHead className="w-24 h-12 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Plan</TableHead>
                <TableHead className="h-12 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">API Key</TableHead>
                <TableHead className="h-12 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Model</TableHead>
                <TableHead className="w-20 h-12 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Transport</TableHead>
                <TableHead className="w-24 h-12 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Status</TableHead>
                <TableHead className="w-28 h-12 text-right text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Tokens</TableHead>
                <TableHead className="w-20 h-12 pr-6 text-right text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((request) => {
                const time = formatTimeLong(request.requestedAt);
                const accountLabel = request.accountId ? (accountLabelMap.get(request.accountId) ?? request.accountId) : "—";
                const isEmailLabel = !!(request.accountId && emailLabelIds.has(request.accountId));
                const errorPreview = request.errorMessage || request.errorCode || "No error detail recorded.";
                const hasError = !!(request.errorCode || request.errorMessage);
                const visibleServiceTier = request.actualServiceTier ?? request.serviceTier;
                const showRequestedTier =
                  !!request.requestedServiceTier && request.requestedServiceTier !== visibleServiceTier;
                const planType = request.planType?.trim().toLowerCase() || null;
                const planLabel = planType ? formatSlug(planType) : "--";

                return (
                  <TableRow key={request.requestId} className="group border-border/40 transition-colors hover:bg-muted/30">
                    <TableCell className="pl-6 py-3 align-top">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium tracking-tight text-foreground">{time.time}</span>
                        <span className="text-[11px] text-muted-foreground">{time.date}</span>
                      </div>
                    </TableCell>
                    <TableCell className="truncate py-3 align-top text-sm font-medium text-foreground/90">
                      {isEmailLabel && blurred ? (
                        <span className="privacy-blur">{accountLabel}</span>
                      ) : (
                        accountLabel
                      )}
                    </TableCell>
                    <TableCell className="py-3 align-top">
                      {planType ? (
                        <Badge
                          variant="outline"
                          className={cn("rounded-md px-2 py-0.5 text-[10px] font-semibold tracking-wide", PLAN_CLASS_MAP[planType] ?? PLAN_CLASS_MAP.free)}
                        >
                          {planLabel}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">--</span>
                      )}
                    </TableCell>
                    <TableCell className="truncate py-3 align-top text-xs font-medium text-muted-foreground group-hover:text-foreground/80 transition-colors">
                      {request.apiKeyName || "--"}
                    </TableCell>
                    <TableCell className="truncate py-3 align-top">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-mono text-xs font-medium text-foreground/90">
                          {formatModelLabel(request.model, request.reasoningEffort, visibleServiceTier)}
                        </span>
                        {showRequestedTier ? (
                          <span className="text-[10px] font-medium tracking-wide text-amber-600 dark:text-amber-400/80">
                            Requested {request.requestedServiceTier}
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="py-3 align-top">
                      {request.transport ? (
                        <Badge
                          variant="outline"
                          className={cn("rounded-md px-2 py-0.5 text-[10px] font-semibold", TRANSPORT_CLASS_MAP[request.transport] ?? TRANSPORT_CLASS_MAP.http)}
                        >
                          {TRANSPORT_LABELS[request.transport] ?? request.transport}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">--</span>
                      )}
                    </TableCell>
                    <TableCell className="py-3 align-top">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={cn("rounded-md px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider", STATUS_CLASS_MAP[request.status] ?? STATUS_CLASS_MAP.error)}
                        >
                          {REQUEST_STATUS_LABELS[request.status] ?? request.status}
                        </Badge>
                        {hasError ? (
                          <button
                            type="button"
                            aria-label={`Show error details: ${errorPreview}`}
                            title={errorPreview}
                            className="group/error inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-red-500/25 bg-red-500/10 text-red-500 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-red-500/45 hover:bg-red-500/15 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/35"
                            onClick={() => setSelectedRequest(request)}
                          >
                            <CircleAlert className="h-3.5 w-3.5 transition-transform duration-200 group-hover/error:scale-110" aria-hidden="true" />
                          </button>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-right py-3 align-top font-mono text-[13px] tracking-tight text-foreground/90">
                      <div className="flex flex-col gap-0.5 justify-end">
                        <span className="font-semibold">{formatCompactNumber(request.tokens)}</span>
                        {request.cachedInputTokens != null && request.cachedInputTokens > 0 && (
                          <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400/80 uppercase tracking-widest">
                            {formatCompactNumber(request.cachedInputTokens)} Cached
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="pr-6 text-right py-3 align-top font-mono text-[13px] font-bold tracking-tight text-foreground">
                      {formatCurrency(request.costUsd)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="flex justify-end">
        <PaginationControls
          total={total}
          limit={limit}
          offset={offset}
          hasMore={hasMore}
          onLimitChange={onLimitChange}
          onOffsetChange={onOffsetChange}
        />
      </div>

      <Dialog open={selectedRequest !== null} onOpenChange={(open) => { if (!open) setSelectedRequest(null); }}>
        <DialogContent className="max-h-[85vh] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Request Details</DialogTitle>
            <DialogDescription>Inspect request metadata and copy the fields you need.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 overflow-y-auto">
            <div className="space-y-3 rounded-md border bg-muted/30 p-4">
              <RequestDetailField
                label="Request ID"
                value={selectedRequest?.requestId ?? "—"}
                mono
                copyValue={selectedRequest?.requestId ?? ""}
                copyLabel="Copy Request ID"
                compactCopy
              />
              <div className="grid gap-3 sm:grid-cols-3">
                <RequestDetailField label="Status" value={selectedRequest ? (REQUEST_STATUS_LABELS[selectedRequest.status] ?? selectedRequest.status) : "—"} />
                <RequestDetailField label="Model" value={selectedRequest ? formatModelLabel(selectedRequest.model, selectedRequest.reasoningEffort, selectedRequest.actualServiceTier ?? selectedRequest.serviceTier) : "—"} mono />
                <RequestDetailField label="Plan" value={selectedRequest?.planType ? formatSlug(selectedRequest.planType) : "—"} />
                <RequestDetailField label="Transport" value={selectedRequest?.transport ? (TRANSPORT_LABELS[selectedRequest.transport] ?? selectedRequest.transport) : "—"} />
                <RequestDetailField label="Time" value={selectedRequest ? formatDateTimeInline(selectedRequest.requestedAt) : "—"} />
                <RequestDetailField label="Error Code" value={selectedRequest?.errorCode ?? "—"} mono />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium">Full Error</h3>
                {selectedRequest?.errorMessage ? (
                  <CopyButton value={selectedRequest.errorMessage} label="Copy Error" iconOnly />
                ) : null}
              </div>
              <div className="max-h-[36vh] overflow-y-auto rounded-md bg-muted/50 p-3">
                <p className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed">
                  {selectedRequest?.errorMessage ?? selectedRequest?.errorCode ?? "No error detail recorded."}
                </p>
              </div>
            </div>
          </div>
          <DialogFooter showCloseButton />
        </DialogContent>
      </Dialog>
    </div>
  );
}

type RequestDetailFieldProps = {
  label: string;
  value: string;
  mono?: boolean;
  copyValue?: string;
  copyLabel?: string;
  compactCopy?: boolean;
};

function RequestDetailField({
  label,
  value,
  mono = false,
  copyValue,
  copyLabel = "Copy",
  compactCopy = false,
}: RequestDetailFieldProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/80">
          {label}
        </div>
        {copyValue ? (
          <CopyButton value={copyValue} label={copyLabel} iconOnly={compactCopy} />
        ) : null}
      </div>
      <div className="flex flex-col items-start gap-2">
        <p className={`min-w-0 flex-1 break-all text-sm leading-relaxed ${mono ? "font-mono" : ""}`}>
          {value}
        </p>
      </div>
    </div>
  );
}
