import { Pause, Play, RefreshCw, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { AccountSummary } from "@/features/accounts/schemas";

export type AccountActionsProps = {
  account: AccountSummary;
  busy: boolean;
  onPause: (accountId: string) => void;
  onResume: (accountId: string) => void;
  onDelete: (accountId: string) => void;
  onReauth: () => void;
};

export function AccountActions({
  account,
  busy,
  onPause,
  onResume,
  onDelete,
  onReauth,
}: AccountActionsProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 pt-2">
      {account.status === "paused" ? (
        <Button
          type="button"
          className="gap-2 rounded-xl"
          onClick={() => onResume(account.accountId)}
          disabled={busy}
        >
          <Play className="size-4" />
          Resume
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="gap-2 rounded-xl border-border/60 hover:bg-muted/50"
          onClick={() => onPause(account.accountId)}
          disabled={busy}
        >
          <Pause className="size-4" />
          Pause
        </Button>
      )}

      {account.status === "deactivated" ? (
        <Button
          type="button"
          variant="outline"
          className="gap-2 rounded-xl border-border/60 hover:bg-muted/50"
          onClick={onReauth}
          disabled={busy}
        >
          <RefreshCw className="size-4" />
          Re-authenticate
        </Button>
      ) : null}

      <Button
        type="button"
        variant="destructive"
        className="gap-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:text-red-400 border border-red-500/20 shadow-none"
        onClick={() => onDelete(account.accountId)}
        disabled={busy}
      >
        <Trash2 className="size-4" />
        Delete
      </Button>
    </div>
  );
}
