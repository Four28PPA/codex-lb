import type { ApiKey, LimitType } from "@/features/api-keys/schemas";
import { cn } from "@/lib/utils";
import {
	formatCompactNumber,
	formatCurrency,
	formatTimeLong,
} from "@/utils/formatters";

const LIMIT_TYPE_LABEL: Record<LimitType, string> = {
	total_tokens: "Total Tokens",
	input_tokens: "Input Tokens",
	output_tokens: "Output Tokens",
	cost_usd: "Cost (USD)",
	credits: "Credits",
};

export type ApiKeyInfoProps = {
	apiKey: ApiKey;
	usageSummary?: ApiKey["usageSummary"] | null;
	usageMessage?: string | null;
	allowUsageSummaryFallback?: boolean;
};

function formatExpiry(value: string | null): string {
	if (!value) return "Never";
	const parsed = formatTimeLong(value);
	return `${parsed.date} ${parsed.time}`;
}

function isExpired(apiKey: ApiKey): boolean {
	if (!apiKey.expiresAt) return false;
	return new Date(apiKey.expiresAt).getTime() < Date.now();
}

export function ApiKeyInfo({
	apiKey,
	usageSummary,
	usageMessage,
	allowUsageSummaryFallback = true,
}: ApiKeyInfoProps) {
	const expired = isExpired(apiKey);
	const models = apiKey.allowedModels?.join(", ") || "All models";
	const enforcedModel = apiKey.enforcedModel || null;
	const enforcedEffort = apiKey.enforcedReasoningEffort || null;
	const usage = allowUsageSummaryFallback
		? (usageSummary ?? apiKey.usageSummary)
		: (usageSummary ?? null);
	const hasUsage = usage && usage.requestCount > 0;

	return (
		<div className="space-y-4">
			<h3 className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground/80">
				Key Details
			</h3>
			
			<div className="flex flex-wrap gap-3">
				{/* Top Row: Basic Info */}
				<div className="flex-1 min-w-[140px] flex flex-col gap-1 rounded-xl border border-border/40 bg-card/40 p-3 shadow-inner">
					<span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Prefix</span>
					<span className="font-mono text-xs font-bold tracking-tight">{apiKey.keyPrefix}</span>
				</div>
				
				<div className="flex-1 min-w-[140px] flex flex-col gap-1 rounded-xl border border-border/40 bg-card/40 p-3 shadow-inner">
					<span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Models</span>
					<span className="text-xs font-bold tracking-tight">{models}</span>
				</div>

				<div className="flex-1 min-w-[140px] flex flex-col gap-1 rounded-xl border border-border/40 bg-card/40 p-3 shadow-inner">
					<span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Expiry</span>
					<span
						className={cn(
							"text-xs font-bold tracking-tight",
							expired ? "text-red-500 dark:text-red-400" : "",
						)}
					>
						{expired ? "Expired" : formatExpiry(apiKey.expiresAt)}
					</span>
				</div>

				{/* Optional Middle Row: Enforcements */}
				{enforcedModel ? (
					<div className="flex-1 min-w-[140px] flex flex-col gap-1 rounded-xl border border-border/40 bg-card/40 p-3 shadow-inner">
						<span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Enforced Model</span>
						<span className="font-mono text-xs font-bold tracking-tight">{enforcedModel}</span>
					</div>
				) : null}
				
				{enforcedEffort ? (
					<div className="flex-1 min-w-[140px] flex flex-col gap-1 rounded-xl border border-border/40 bg-card/40 p-3 shadow-inner">
						<span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Enforced Effort</span>
						<span className="text-xs font-bold tracking-tight">{enforcedEffort}</span>
					</div>
				) : null}

				{/* Usage */}
				<div className="w-full flex flex-col gap-1 rounded-xl border border-border/40 bg-card/40 p-3 shadow-inner">
					<span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Usage</span>
					<div className="tabular-nums">
						{hasUsage ? (
							<div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
								<span className="font-bold text-foreground/90">
									{formatCompactNumber(usage.totalTokens)} <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Tok</span>
								</span>
								<span className="h-3 w-px bg-border/60" />
								<span className="font-bold text-foreground/90">
									{formatCompactNumber(usage.cachedInputTokens)} <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Cached</span>
								</span>
								<span className="h-3 w-px bg-border/60" />
								<span className="font-bold text-foreground/90">
									{formatCompactNumber(usage.requestCount)} <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Req</span>
								</span>
								<span className="h-3 w-px bg-border/60" />
								<span className="font-bold text-foreground/90">
									{formatCurrency(usage.totalCostUsd)}
								</span>
							</div>
						) : (
							<span className="text-[11px] font-medium text-muted-foreground">
								{usageMessage ?? "No usage recorded"}
							</span>
						)}
					</div>
				</div>

				{/* Limits Section */}
				<div className="w-full flex flex-col gap-3 rounded-xl border border-border/40 bg-card/40 p-4 shadow-inner">
					<div className="flex items-center justify-between">
						<span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Limits</span>
						<span className="text-[11px] font-bold tabular-nums text-muted-foreground">
							{apiKey.limits.length > 0 ? (
								<>{apiKey.limits.length} configured</>
							) : (
								"None"
							)}
						</span>
					</div>
					
					{apiKey.limits.length > 0 && (
						<div className="space-y-3">
							{apiKey.limits.map((limit) => {
								const isCost = limit.limitType === "cost_usd";
								const percent =
									limit.maxValue > 0
										? Math.min(100, (limit.currentValue / limit.maxValue) * 100)
										: 0;
								const current = isCost
									? `$${(limit.currentValue / 1_000_000).toFixed(2)}`
									: formatCompactNumber(limit.currentValue);
								const max = isCost
									? `$${(limit.maxValue / 1_000_000).toFixed(2)}`
									: formatCompactNumber(limit.maxValue);
								const modelFilter = limit.modelFilter || "all";

								return (
									<div key={limit.id} className="space-y-1.5">
										<div className="flex items-center justify-between gap-2 text-[10px] tabular-nums">
											<span className="font-semibold text-muted-foreground uppercase tracking-wider">
												{LIMIT_TYPE_LABEL[limit.limitType]} <span className="opacity-60 lowercase">({limit.limitWindow}, {modelFilter})</span>
											</span>
											<span className="font-bold tracking-tight text-[11px]">
												{current} <span className="opacity-50 font-medium mx-0.5">/</span> {max}
											</span>
										</div>
										<div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/60 shadow-inner">
											<div
												className={cn(
													"h-full rounded-full transition-all duration-500 ease-out",
													percent >= 90
														? "bg-red-500"
														: percent >= 70
															? "bg-amber-500"
															: "bg-primary",
												)}
												style={{ width: `${percent}%` }}
											/>
										</div>
									</div>
								);
							})}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
