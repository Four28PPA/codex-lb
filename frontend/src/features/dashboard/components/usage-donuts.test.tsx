import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { UsageDonuts } from "@/features/dashboard/components/usage-donuts";

/** Helper to build a minimal RemainingItem for tests. */
function item(overrides: { accountId: string; label: string; value: number; remainingPercent: number; color: string }) {
  return { ...overrides, labelSuffix: "", isEmail: true };
}

describe("UsageDonuts", () => {
  it("renders primary and secondary donut panels with legends", () => {
    render(
      <UsageDonuts
        primaryItems={[item({ accountId: "acc-1", label: "primary@example.com", value: 120, remainingPercent: 60, color: "#7bb661" })]}
        secondaryItems={[item({ accountId: "acc-2", label: "secondary@example.com", value: 80, remainingPercent: 40, color: "#d9a441" })]}
        primaryTotal={200}
        secondaryTotal={200}
      />,
    );

    expect(screen.getByText("Short-term token runway")).toBeInTheDocument();
    expect(screen.getByText("Weekly token runway")).toBeInTheDocument();
    expect(screen.getByText("primary@example.com")).toBeInTheDocument();
    expect(screen.getByText("secondary@example.com")).toBeInTheDocument();
  });

  it("handles empty data gracefully", () => {
    render(
      <UsageDonuts
        primaryItems={[]}
        secondaryItems={[]}
        primaryTotal={0}
        secondaryTotal={0}
      />,
    );

    expect(screen.getByText("Short-term token runway")).toBeInTheDocument();
    expect(screen.getByText("Weekly token runway")).toBeInTheDocument();
    expect(screen.getAllByText("Tokens left").length).toBeGreaterThanOrEqual(2);
  });

  it("renders safe line only for the primary donut", () => {
    render(
      <UsageDonuts
        primaryItems={[item({ accountId: "acc-1", label: "primary@example.com", value: 120, remainingPercent: 60, color: "#7bb661" })]}
        secondaryItems={[item({ accountId: "acc-2", label: "secondary@example.com", value: 80, remainingPercent: 40, color: "#d9a441" })]}
        primaryTotal={200}
        secondaryTotal={200}
        safeLinePrimary={{ safePercent: 60, riskLevel: "warning" }}
      />,
    );

    expect(screen.getAllByTestId("safe-line-tick")).toHaveLength(1);
  });

  it("renders safe line on both donuts when both have depletion", () => {
    render(
      <UsageDonuts
        primaryItems={[item({ accountId: "acc-1", label: "primary@example.com", value: 120, remainingPercent: 60, color: "#7bb661" })]}
        secondaryItems={[item({ accountId: "acc-2", label: "secondary@example.com", value: 80, remainingPercent: 40, color: "#d9a441" })]}
        primaryTotal={200}
        secondaryTotal={200}
        safeLinePrimary={{ safePercent: 60, riskLevel: "warning" }}
        safeLineSecondary={{ safePercent: 40, riskLevel: "danger" }}
      />,
    );

    expect(screen.getAllByTestId("safe-line-tick")).toHaveLength(2);
  });

  it("renders safe line only on secondary donut for weekly-only plans", () => {
    render(
      <UsageDonuts
        primaryItems={[]}
        secondaryItems={[item({ accountId: "acc-1", label: "weekly@example.com", value: 80, remainingPercent: 40, color: "#d9a441" })]}
        primaryTotal={0}
        secondaryTotal={200}
        safeLineSecondary={{ safePercent: 60, riskLevel: "warning" }}
      />,
    );

    expect(screen.getAllByTestId("safe-line-tick")).toHaveLength(1);
  });

  it("shows remaining totals in the center while donut totals can use capacity", () => {
    const { container } = render(
      <UsageDonuts
        primaryItems={[item({ accountId: "acc-1", label: "primary@example.com", value: 120, remainingPercent: 60, color: "#7bb661" })]}
        secondaryItems={[item({ accountId: "acc-2", label: "secondary@example.com", value: 80, remainingPercent: 40, color: "#d9a441" })]}
        primaryTotal={225}
        secondaryTotal={7560}
        primaryCenterValue={120}
        secondaryCenterValue={80}
      />,
    );

    const centerValues = [...container.querySelectorAll<HTMLElement>(".text-2xl.font-semibold.tabular-nums")]
      .filter((node) => node.closest(".relative")?.className.includes("h-[192px]"))
      .map((node) => node.textContent);
    expect(centerValues).toEqual(["120", "80"]);
  });

  it("renders token totals without repeated credit metric cards", () => {
    render(
      <UsageDonuts
        primaryItems={[item({ accountId: "acc-1", label: "primary@example.com", value: 105.75, remainingPercent: 47, color: "#7bb661" })]}
        secondaryItems={[item({ accountId: "acc-2", label: "secondary@example.com", value: 4536, remainingPercent: 60, color: "#d9a441" })]}
        primaryTotal={225}
        secondaryTotal={7560}
        primaryCenterValue={105.75}
        secondaryCenterValue={4536}
        tokenRunwayPrimary={{
          windowKey: "primary",
          estimatedTokensRemaining: 1_200_000,
          tokensPerCredit: 10_000,
          observedTokens: 3_000_000,
          observedCreditDelta: 300,
          samples: 3,
          confidence: "medium",
          lastLearnedAt: "2026-01-01T00:00:00Z",
        }}
        tokenRunwaySecondary={{
          windowKey: "secondary",
          estimatedTokensRemaining: 45_360_000,
          tokensPerCredit: 10_000,
          observedTokens: 20_000_000,
          observedCreditDelta: 2_000,
          samples: 1,
          confidence: "low",
          lastLearnedAt: "2026-01-01T00:00:00Z",
        }}
      />,
    );

    expect(screen.queryByText("Credits left")).not.toBeInTheDocument();
    expect(screen.queryByText("Credits used")).not.toBeInTheDocument();
    expect(screen.getAllByText("Tokens left")).toHaveLength(4);
    expect(screen.getAllByText("1.2M").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("45.36M").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("Learning")).not.toBeInTheDocument();
    expect(screen.getByText("medium confidence · 3 intervals")).toBeInTheDocument();
    expect(screen.getByText("low confidence · 1 interval")).toBeInTheDocument();
    expect(screen.getAllByText("Tokens used vs tokens left")).toHaveLength(2);
    expect(screen.queryByText("105.75")).not.toBeInTheDocument();
    expect(screen.queryByText("4.54K")).not.toBeInTheDocument();
  });
});
