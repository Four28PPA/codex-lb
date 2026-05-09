import { Gauge } from "lucide-react";

import { DonutChart } from "@/components/donut-chart";
import type { TokenRunwayEstimate } from "@/features/dashboard/schemas";
import type { RemainingItem, SafeLineView } from "@/features/dashboard/utils";
import { cn } from "@/lib/utils";
import { formatCompactNumber, formatPercentNullable } from "@/utils/formatters";

export type UsageDonutsProps = {
	primaryItems: RemainingItem[];
	secondaryItems: RemainingItem[];
	primaryTotal: number;
	secondaryTotal: number;
	primaryCenterValue?: number;
	secondaryCenterValue?: number;
	tokenRunwayPrimary?: TokenRunwayEstimate | null;
	tokenRunwaySecondary?: TokenRunwayEstimate | null;
	safeLinePrimary?: SafeLineView | null;
	safeLineSecondary?: SafeLineView | null;
};

type TokenWindowCardProps = {
	title: string;
	eyebrow: string;
	items: RemainingItem[];
	total: number;
	remaining: number;
	tokenRunway?: TokenRunwayEstimate | null;
	safeLine?: SafeLineView | null;
	accent: "primary" | "secondary";
};

const ACCENT_STYLES: Record<TokenWindowCardProps["accent"], {
	glow: string;
	chip: string;
	icon: string;
}> = {
	primary: {
		glow: "from-amber-500/18 via-primary/10 to-transparent",
		chip: "border-amber-500/25 bg-amber-500/10 text-amber-300",
		icon: "text-amber-300",
	},
	secondary: {
		glow: "from-violet-500/22 via-sky-500/10 to-transparent",
		chip: "border-violet-500/25 bg-violet-500/10 text-violet-300",
		icon: "text-violet-300",
	},
};

function tokenScale(tokenRunway: TokenRunwayEstimate | null | undefined) {
	return tokenRunway?.tokensPerCredit && tokenRunway.tokensPerCredit > 0 ? tokenRunway.tokensPerCredit : 1;
}

function shouldScaleItems(tokenRunway: TokenRunwayEstimate | null | undefined) {
	return !!tokenRunway?.tokensPerCredit && tokenRunway.tokensPerCredit > 0;
}

function scaleItems(items: RemainingItem[], scale: number) {
	if (scale === 1) return items;
	return items.map((item) => ({ ...item, value: item.value * scale }));
}

function chartItems(items: RemainingItem[]) {
	return items.map((item) => ({
		id: item.accountId,
		label: item.label,
		labelSuffix: item.labelSuffix,
		isEmail: item.isEmail,
		value: item.value,
		color: item.color,
	}));
}

function formatLearnedTokenValue(tokenRunway: TokenRunwayEstimate | null | undefined, fallbackTokens: number) {
	if (tokenRunway?.estimatedTokensRemaining != null && tokenRunway.confidence !== "learning") {
		return formatCompactNumber(tokenRunway.estimatedTokensRemaining);
	}
	if (fallbackTokens > 0) {
		return formatCompactNumber(fallbackTokens);
	}
	return "No usage yet";
}

function learnedTokenMeta(tokenRunway: TokenRunwayEstimate | null | undefined) {
	if (!tokenRunway || tokenRunway.confidence === "learning" || tokenRunway.samples <= 0) {
		return null;
	}
	return `${tokenRunway.confidence} confidence · ${tokenRunway.samples} interval${tokenRunway.samples === 1 ? "" : "s"}`;
}

function TokenWindowCard({
	title,
	eyebrow,
	items,
	total,
	remaining,
	tokenRunway,
	safeLine,
	accent,
}: TokenWindowCardProps) {
	const styles = ACCENT_STYLES[accent];
	const scale = tokenScale(tokenRunway);
	const scaleFromCredits = shouldScaleItems(tokenRunway);
	const tokenItems = scaleFromCredits ? scaleItems(items, scale) : items;
	const tokenTotal = scaleFromCredits ? total * scale : total;
	const tokenRemaining = tokenRunway?.estimatedTokensRemaining ?? (scaleFromCredits ? remaining * scale : remaining);
	const usedTokens = Math.max(0, tokenTotal - tokenRemaining);
	const usedPercent = tokenTotal > 0 ? (usedTokens / tokenTotal) * 100 : 0;
	const remainingPercent = tokenTotal > 0 ? (tokenRemaining / tokenTotal) * 100 : 0;
	const chart = chartItems(tokenItems);
	const tokenMeta = learnedTokenMeta(tokenRunway);

	return (
		<article className="group relative bg-card p-6 transition-colors duration-200 hover:bg-muted/30">
			<div className="space-y-6">
				<div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
					<div className="min-w-0">
						<p className="text-[10px] font-medium uppercase tracking-[0.22em] text-primary/80">{eyebrow}</p>
						<div className="mt-1 flex flex-wrap items-center gap-2">
							<h3 className="text-xl font-semibold tracking-[-0.035em]">{title}</h3>
							<span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium", styles.chip)}>
								<Gauge className={cn("h-3 w-3", styles.icon)} aria-hidden="true" />
								{formatPercentNullable(remainingPercent)} left
							</span>
						</div>
					</div>

					<div className="shrink-0 border-l border-border/70 pl-4 text-left sm:min-w-40 sm:text-right">
						<p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Tokens left</p>
						<p className="mt-0.5 text-2xl font-semibold tracking-[-0.045em] tabular-nums">
							{formatLearnedTokenValue(tokenRunway, tokenRemaining)}
						</p>
						{tokenMeta ? <p className="mt-0.5 text-[11px] text-muted-foreground">{tokenMeta}</p> : null}
					</div>
				</div>

				<DonutChart
					title="Tokens used vs tokens left"
					subtitle={`${formatCompactNumber(usedTokens)} used · ${formatPercentNullable(usedPercent)}`}
					items={chart}
					total={tokenTotal}
					centerValue={tokenRemaining}
					safeLine={safeLine}
				/>
			</div>
		</article>
	);
}

export function UsageDonuts({
	primaryItems,
	secondaryItems,
	primaryTotal,
	secondaryTotal,
	primaryCenterValue,
	secondaryCenterValue,
	tokenRunwayPrimary,
	tokenRunwaySecondary,
	safeLinePrimary,
	safeLineSecondary,
}: UsageDonutsProps) {
	const primaryRemaining = primaryCenterValue ?? primaryItems.reduce((total, item) => total + Math.max(0, item.value), 0);
	const secondaryRemaining = secondaryCenterValue ?? secondaryItems.reduce((total, item) => total + Math.max(0, item.value), 0);

	return (
		<div className="grid grid-cols-1 xl:grid-cols-2 divide-y xl:divide-y-0 xl:divide-x divide-border/40 overflow-hidden rounded-2xl border bg-card shadow-[var(--shadow-sm)]">
			<TokenWindowCard
				eyebrow="5h local window"
				title="Short-term token runway"
				items={primaryItems}
				total={primaryTotal}
				remaining={primaryRemaining}
				tokenRunway={tokenRunwayPrimary}
				safeLine={safeLinePrimary}
				accent="primary"
			/>
			<TokenWindowCard
				eyebrow="Weekly token window"
				title="Weekly token runway"
				items={secondaryItems}
				total={secondaryTotal}
				remaining={secondaryRemaining}
				tokenRunway={tokenRunwaySecondary}
				safeLine={safeLineSecondary}
				accent="secondary"
			/>
		</div>
	);
}
