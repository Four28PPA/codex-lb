import { Ellipsis, Play, Pause, RefreshCw, Trash2, User } from "lucide-react";

import { isEmailLabel } from "@/components/blur-email";
import { usePrivacyStore } from "@/hooks/use-privacy";
import { AccountTokenInfo } from "@/features/accounts/components/account-token-info";
import { AccountUsagePanel } from "@/features/accounts/components/account-usage-panel";
import type { AccountSummary } from "@/features/accounts/schemas";
import { useAccountTrends } from "@/features/accounts/hooks/use-accounts";
import { formatCompactAccountId } from "@/utils/account-identifiers";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type AccountDetailProps = {
  account: AccountSummary | null;
  showAccountId?: boolean;
  busy: boolean;
  onPause: (accountId: string) => void;
  onResume: (accountId: string) => void;
  onDelete: (accountId: string) => void;
  onReauth: () => void;
};

export function AccountDetail({
  account,
  showAccountId = false,
  busy,
  onPause,
  onResume,
  onDelete,
  onReauth,
}: AccountDetailProps) {
  const { data: trends } = useAccountTrends(account?.accountId ?? null);
  const blurred = usePrivacyStore((s) => s.blurred);

  if (!account) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-12">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
          <User className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="mt-3 text-sm font-medium text-muted-foreground">Select an account</p>
        <p className="mt-1 text-xs text-muted-foreground/70">Choose an account from the list to view details.</p>
      </div>
    );
  }

  const title = account.displayName || account.email;
  const titleIsEmail = isEmailLabel(title, account.email);
  const compactId = formatCompactAccountId(account.accountId);
  const emailSubtitle = account.displayName && account.displayName !== account.email
    ? account.email
    : null;
  const idSuffix = showAccountId ? ` (${compactId})` : "";

	return (
		<div
			key={account.accountId}
			className="animate-fade-in-up space-y-6 rounded-2xl border border-border/50 bg-gradient-to-b from-card/80 to-background p-6 shadow-[var(--shadow-sm)] backdrop-blur-sm"
		>
			{/* Account header */}
			<div className="flex items-start justify-between">
				<div>
					<h2 className="text-xl font-bold tracking-tight">
						{titleIsEmail ? <><span className={blurred ? "privacy-blur" : ""}>{title}</span>{idSuffix}</> : <>{title}{!emailSubtitle ? idSuffix : ""}</>}
					</h2>
					{emailSubtitle ? (
						<p className="mt-0.5 text-sm font-medium text-muted-foreground" title={showAccountId ? `Account ID ${account.accountId}` : undefined}>
							<span className={blurred ? "privacy-blur" : ""}>{emailSubtitle}</span>{showAccountId ? ` | ID ${compactId}` : ""}
						</p>
					) : null}
				</div>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							type="button"
							size="icon"
							variant="ghost"
							className="h-8 w-8 rounded-full"
							disabled={busy}
						>
							<Ellipsis className="size-4" />
							<span className="sr-only">Actions</span>
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="rounded-xl">
						{account.status === "paused" ? (
							<DropdownMenuItem onClick={() => onResume(account.accountId)} className="gap-2">
								<Play className="size-4" />
								Resume account
							</DropdownMenuItem>
						) : (
							<DropdownMenuItem onClick={() => onPause(account.accountId)} className="gap-2">
								<Pause className="size-4" />
								Pause account
							</DropdownMenuItem>
						)}
						{account.status === "deactivated" ? (
							<DropdownMenuItem onClick={onReauth} className="gap-2">
								<RefreshCw className="size-4" />
								Re-authenticate
							</DropdownMenuItem>
						) : null}
						<DropdownMenuItem onClick={() => onDelete(account.accountId)} className="gap-2 text-red-500 focus:text-red-500 focus:bg-red-500/10">
							<Trash2 className="size-4" />
							Delete account
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>

			<AccountUsagePanel account={account} trends={trends} />
			<AccountTokenInfo account={account} />
		</div>
	);
}
