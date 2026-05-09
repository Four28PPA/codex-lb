import {
	Ellipsis,
	KeyRound,
	Pencil,
	Play,
	RefreshCw,
	Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { AlertMessage } from "@/components/alert-message";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import type { ApiKey } from "@/features/api-keys/schemas";
import { ApiKeyInfo } from "@/features/apis/components/api-key-info";
import { ApiTrendChart } from "@/features/apis/components/api-trend-chart";
import type { ApiKeyUsage7DayResponse } from "@/features/apis/schemas";

export type ApiDetailProps = {
	apiKey: ApiKey | null;
	trends?: {
		cost: { t: string; v: number }[];
		tokens: { t: string; v: number }[];
	} | null;
	usage7Day?: ApiKeyUsage7DayResponse | null;
	usage7DayLoading?: boolean;
	usage7DayError?: string | null;
	busy: boolean;
	onEdit: (apiKey: ApiKey) => void;
	onDelete: (apiKey: ApiKey) => void;
	onRegenerate: (apiKey: ApiKey) => void;
	onToggleActive: (apiKey: ApiKey) => void;
};

function accumulateData(
	data: { t: string; v: number }[],
): { t: string; v: number }[] {
	let sum = 0;
	return data.map((point) => {
		sum += point.v;
		return { t: point.t, v: sum };
	});
}

export function ApiDetail({
	apiKey,
	trends,
	usage7Day,
	usage7DayLoading = false,
	usage7DayError = null,
	busy,
	onEdit,
	onDelete,
	onRegenerate,
	onToggleActive,
}: ApiDetailProps) {
	const [showAccumulated, setShowAccumulated] = useState(false);

	const chartData = useMemo(() => {
		if (!trends) return null;
		if (!showAccumulated) return trends;
		return {
			cost: accumulateData(trends.cost),
			tokens: accumulateData(trends.tokens),
		};
	}, [trends, showAccumulated]);

	const usageSummary = useMemo(() => {
		if (!usage7Day) return null;
		return {
			requestCount: usage7Day.totalRequests,
			totalTokens: usage7Day.totalTokens,
			cachedInputTokens: usage7Day.cachedInputTokens,
			totalCostUsd: usage7Day.totalCostUsd,
		};
	}, [usage7Day]);

	const usageMessage = useMemo(() => {
		if (usage7Day) return null;
		if (usage7DayLoading) return "Loading 7-day usage...";
		if (usage7DayError) return "7-day usage unavailable";
		return null;
	}, [usage7Day, usage7DayError, usage7DayLoading]);

	if (!apiKey) {
		return (
			<div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-12">
				<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
					<KeyRound className="h-5 w-5 text-muted-foreground" />
				</div>
				<p className="mt-3 text-sm font-medium text-muted-foreground">
					Select an API key
				</p>
				<p className="mt-1 text-xs text-muted-foreground/70">
					Choose an API key from the list to view details.
				</p>
			</div>
		);
	}

	const hasTrends =
		trends && (trends.cost.length > 0 || trends.tokens.length > 0);

	return (
		<div
			key={apiKey.id}
			className="animate-fade-in-up space-y-4 rounded-2xl border border-border/50 bg-gradient-to-b from-card/80 to-background p-5 shadow-[var(--shadow-sm)] backdrop-blur-sm"
		>
			<div className="flex items-start justify-between">
				<h2 className="text-xl font-bold tracking-tight">{apiKey.name}</h2>
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
						<DropdownMenuItem onClick={() => onEdit(apiKey)} className="gap-2">
							<Pencil className="size-4" />
							Edit
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => onRegenerate(apiKey)} className="gap-2">
							<RefreshCw className="size-4" />
							Regenerate
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>

			<div className="relative overflow-hidden rounded-xl border border-border/40 bg-card/40 shadow-inner">
				<div className="flex items-center justify-end gap-4 p-4 border-b border-border/30">
					<div className="flex items-center gap-4 text-[11px] font-medium tracking-wide uppercase text-muted-foreground">
						<span className="flex items-center gap-1.5">
							Tokens
							<span className="inline-block h-2.5 w-2.5 rounded-full bg-chart-2 shadow-sm" />
						</span>
						<span className="flex items-center gap-1.5">
							Cost
							<span className="inline-block h-2.5 w-2.5 rounded-full bg-chart-1 shadow-sm" />
						</span>
					</div>
					<div className="h-4 w-px bg-border/50" />
					<div className="flex items-center gap-2">
						<span className="text-[11px] font-medium tracking-wide uppercase text-muted-foreground">Accumulated</span>
						<Switch
							size="sm"
							checked={showAccumulated}
							onCheckedChange={setShowAccumulated}
						/>
					</div>
				</div>

				<div className="p-4">
					{hasTrends && chartData && (
						<ApiTrendChart cost={chartData.cost} tokens={chartData.tokens} />
					)}
				</div>
			</div>

			{usage7DayError ? (
				<AlertMessage variant="error">{usage7DayError}</AlertMessage>
			) : null}

			<ApiKeyInfo
				apiKey={apiKey}
				usageSummary={usageSummary}
				usageMessage={usageMessage}
				allowUsageSummaryFallback={false}
			/>

			<div className="flex flex-wrap items-center gap-2 pt-2">
				{apiKey.isActive ? (
					<Button
						type="button"
						variant="outline"
						className="h-8 gap-2 rounded-lg border-border/60 hover:bg-muted/50"
						onClick={() => onToggleActive(apiKey)}
						disabled={busy}
					>
						<Ellipsis className="size-3.5" />
						Disable Key
					</Button>
				) : (
					<Button
						type="button"
						className="h-8 gap-2 rounded-lg"
						onClick={() => onToggleActive(apiKey)}
						disabled={busy}
					>
						<Play className="size-3.5" />
						Enable Key
					</Button>
				)}
				<Button
					type="button"
					variant="destructive"
					className="h-8 gap-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:text-red-400 border border-red-500/20 shadow-none"
					onClick={() => onDelete(apiKey)}
					disabled={busy}
				>
					<Trash2 className="size-3.5" />
					Delete Key
				</Button>
			</div>
		</div>
	);
}
