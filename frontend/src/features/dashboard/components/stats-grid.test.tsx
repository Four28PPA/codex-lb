import { render, screen } from "@testing-library/react";
import { Activity, Coins, DollarSign } from "lucide-react";
import { describe, expect, it } from "vitest";

import { StatsGrid } from "@/features/dashboard/components/stats-grid";

const EMPTY_TREND: { value: number }[] = [];
const SAMPLE_TREND = [{ value: 1 }, { value: 2 }, { value: 3 }];

describe("StatsGrid", () => {
  it("renders metric cards with values", () => {
    render(
      <StatsGrid
        stats={[
          { label: "Requests (30d)", value: "228", icon: Activity, trend: SAMPLE_TREND, trendColor: "#3b82f6" },
          { label: "Tokens (30d)", value: "45K", icon: Coins, trend: SAMPLE_TREND, trendColor: "#8b5cf6" },
          { label: "Cost (30d)", value: "$89.44", meta: "Estimate 0.45 × $200 Cursor plans", icon: DollarSign, trend: SAMPLE_TREND, trendColor: "#10b981" },
        ]}
      />,
    );

    expect(screen.getByText("Requests (30d)")).toBeInTheDocument();
    expect(screen.getByText("228")).toBeInTheDocument();
    expect(screen.getByText("Tokens (30d)")).toBeInTheDocument();
    expect(screen.getByText("45K")).toBeInTheDocument();
    expect(screen.getByText("Cost (30d)")).toBeInTheDocument();
    expect(screen.getByText("Estimate 0.45 × $200 Cursor plans")).toBeInTheDocument();
    expect(screen.queryByText("Error rate (30d)")).not.toBeInTheDocument();
  });

  it("renders without sparklines when trend is empty", () => {
    render(
      <StatsGrid
        stats={[
          { label: "Empty", value: "0", icon: Activity, trend: EMPTY_TREND, trendColor: "#3b82f6" },
        ]}
      />,
    );

    expect(screen.getByText("Empty")).toBeInTheDocument();
  });
});
