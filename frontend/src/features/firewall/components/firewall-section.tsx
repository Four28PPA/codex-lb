import { useMemo, useState } from "react";
import { Shield } from "lucide-react";

import { AlertMessage } from "@/components/alert-message";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SpinnerBlock } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useFirewall } from "@/features/firewall/hooks/use-firewall";
import { useDialogState } from "@/hooks/use-dialog-state";
import { getErrorMessageOrNull } from "@/utils/errors";
import { formatTimeLong } from "@/utils/formatters";

function modeLabel(mode: "allow_all" | "allowlist_active"): string {
  return mode === "allow_all" ? "Allow all" : "Allowlist active";
}

export function FirewallSection() {
  const [ipAddress, setIpAddress] = useState("");
  const { firewallQuery, createMutation, deleteMutation } = useFirewall();
  const deleteDialog = useDialogState<string>();

  const mutationError = useMemo(
    () =>
      getErrorMessageOrNull(firewallQuery.error) ||
      getErrorMessageOrNull(createMutation.error) ||
      getErrorMessageOrNull(deleteMutation.error),
    [firewallQuery.error, createMutation.error, deleteMutation.error],
  );

  const entries = firewallQuery.data?.entries ?? [];
  const mode = firewallQuery.data?.mode ?? "allow_all";
  const busy = createMutation.isPending || deleteMutation.isPending;

  const handleAdd = async () => {
    const normalized = ipAddress.trim();
    if (!normalized) {
      return;
    }
    await createMutation.mutateAsync(normalized);
    setIpAddress("");
  };

  return (
    <section className="space-y-4 rounded-2xl border border-border/40 bg-card/40 p-5 shadow-sm backdrop-blur-sm transition-all duration-200 hover:bg-card/50">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 shadow-inner">
          <Shield className="h-5 w-5 text-primary" aria-hidden="true" />
        </div>
        <div>
          <h3 className="text-sm font-semibold tracking-tight text-foreground">Firewall</h3>
          <p className="text-xs text-muted-foreground">Restrict proxy APIs to allowed client IPs.</p>
        </div>
      </div>

      {mutationError ? <AlertMessage variant="error">{mutationError}</AlertMessage> : null}

      <div className="flex items-center gap-3 rounded-xl border border-border/30 bg-background/40 px-3 py-2.5 shadow-inner">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground">Mode</span>
          <Badge variant="outline" className="bg-background/50 border-border/40 shadow-inner">{modeLabel(mode)}</Badge>
        </div>
        <div className="h-4 w-px bg-border/50" />
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground">Allowed IPs</span>
          <span className="text-sm font-medium tabular-nums">{entries.length}</span>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={ipAddress}
          onChange={(event) => setIpAddress(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              void handleAdd();
            }
          }}
          placeholder="127.0.0.1 or 2001:db8::1"
          className="h-9 text-xs bg-background/50 border-border/40 shadow-inner focus-visible:bg-background transition-colors"
          disabled={busy}
        />
        <Button
          type="button"
          size="sm"
          className="h-9 text-xs shadow-none"
          onClick={() => void handleAdd()}
          disabled={busy || !ipAddress.trim()}
        >
          Add IP
        </Button>
      </div>

      {firewallQuery.isLoading && !firewallQuery.data ? (
        <div className="py-8">
          <SpinnerBlock />
        </div>
      ) : entries.length === 0 ? (
        <EmptyState
          icon={Shield}
          title="No IPs on the allowlist"
          description="Firewall is currently in allow-all mode."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>IP Address</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[96px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => {
                const created = formatTimeLong(entry.createdAt);
                return (
                  <TableRow key={entry.ipAddress}>
                    <TableCell className="font-mono text-xs">{entry.ipAddress}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {created.date} {created.time}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        disabled={busy}
                        onClick={() => deleteDialog.show(entry.ipAddress)}
                      >
                        Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <ConfirmDialog
        open={deleteDialog.open}
        title="Remove IP from allowlist"
        description={`${deleteDialog.data ?? ""} will no longer be allowed through the firewall.`}
        confirmLabel="Remove"
        onOpenChange={deleteDialog.onOpenChange}
        onConfirm={() => {
          if (!deleteDialog.data) {
            return;
          }
          void deleteMutation.mutateAsync(deleteDialog.data).finally(() => {
            deleteDialog.hide();
          });
        }}
      />
    </section>
  );
}
