import type { AccountSummary } from "@/features/accounts/schemas";
import {
  formatAccessTokenLabel,
  formatIdTokenLabel,
  formatRefreshTokenLabel,
} from "@/utils/formatters";

export type AccountTokenInfoProps = {
  account: AccountSummary;
};

function TokenBadge({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border/40 bg-card/40 px-2.5 py-1 text-[11px] font-medium tracking-wide uppercase text-muted-foreground shadow-inner">
      <span>{label}</span>
      <span className="font-bold text-foreground">{value}</span>
    </span>
  );
}

export function AccountTokenInfo({ account }: AccountTokenInfoProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <TokenBadge label="Access" value={formatAccessTokenLabel(account.auth)} />
      <TokenBadge label="Refresh" value={formatRefreshTokenLabel(account.auth)} />
      <TokenBadge label="ID" value={formatIdTokenLabel(account.auth)} />
    </div>
  );
}
