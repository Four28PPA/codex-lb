import { ChevronDown, ChevronUp, Plus, Upload } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AccountListItem } from "@/features/accounts/components/account-list-item";
import { WindowsOauthHelp } from "@/features/accounts/components/windows-oauth-help";
import type { AccountSummary } from "@/features/accounts/schemas";
import { buildDuplicateAccountIdSet } from "@/utils/account-identifiers";
import { formatSlug } from "@/utils/formatters";

const STATUS_FILTER_OPTIONS = ["all", "active", "paused", "rate_limited", "quota_exceeded", "deactivated"];

export type AccountListProps = {
  accounts: AccountSummary[];
  selectedAccountId: string | null;
  onSelect: (accountId: string) => void;
  onOpenImport: () => void;
  onOpenOauth: () => void;
};

export function AccountList({
  accounts,
  selectedAccountId,
  onSelect,
  onOpenImport,
  onOpenOauth,
}: AccountListProps) {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [helpOpen, setHelpOpen] = useState(false);

  const filtered = useMemo(() => {
    return accounts.filter((account) => {
      if (statusFilter !== "all" && account.status !== statusFilter) {
        return false;
      }
      return true;
    });
  }, [accounts, statusFilter]);

  const duplicateAccountIds = useMemo(() => buildDuplicateAccountIdSet(accounts), [accounts]);

	return (
		<div className="space-y-4">
			<div className="flex items-center gap-2">
				<Select value={statusFilter} onValueChange={setStatusFilter}>
					<SelectTrigger size="sm" className="w-full bg-card/40 border-border/40 hover:bg-card/60 transition-colors">
						<SelectValue placeholder="Status" />
					</SelectTrigger>
					<SelectContent className="rounded-xl border-border/40 bg-card/95 backdrop-blur-md shadow-md">
						{STATUS_FILTER_OPTIONS.map((option) => (
							<SelectItem key={option} value={option} className="rounded-lg">
								{option === "all" ? "All statuses" : formatSlug(option)}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<div className="flex gap-2">
				<Button type="button" size="sm" variant="outline" onClick={onOpenImport} className="h-8 flex-1 gap-1.5 text-xs rounded-lg border-border/40 bg-card/40 hover:bg-card/60 shadow-none">
					<Upload className="h-3.5 w-3.5" />
					Import
				</Button>
				<Button type="button" size="sm" onClick={onOpenOauth} className="h-8 flex-1 gap-1.5 text-xs rounded-lg shadow-none">
					<Plus className="h-3.5 w-3.5" />
					Add Account
				</Button>
			</div>

      <div>
        <Button
          type="button"
          variant="link"
          size="sm"
          className="h-auto px-0 text-xs"
          onClick={() => setHelpOpen((current) => !current)}
        >
          Need help?
          {helpOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </Button>
      </div>

      {helpOpen ? <WindowsOauthHelp /> : null}

      <div className="max-h-[calc(100vh-16rem)] space-y-1 overflow-y-auto p-1">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-6 text-center">
            <p className="text-sm font-medium text-muted-foreground">No matching accounts</p>
            <p className="text-xs text-muted-foreground/70">Try adjusting your filters.</p>
          </div>
        ) : (
          filtered.map((account) => (
            <AccountListItem
              key={account.accountId}
              account={account}
              selected={account.accountId === selectedAccountId}
              showAccountId={duplicateAccountIds.has(account.accountId)}
              onSelect={onSelect}
            />
          ))
        )}
      </div>
    </div>
  );
}
