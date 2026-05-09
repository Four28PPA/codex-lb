import { describe, expect, it } from "vitest";

import type { AccountSummary, Depletion } from "@/features/dashboard/schemas";
import {
  applySecondaryConstraint,
  buildDashboardPosture,
  buildDashboardView,
  buildDepletionView,
  buildRemainingItems,
  buildTokenRemainingItems,
  sumRemaining,
  type RemainingItem,
} from "@/features/dashboard/utils";
import { createDashboardOverview, createDefaultRequestLogs } from "@/test/mocks/factories";
import { formatCompactAccountId } from "@/utils/account-identifiers";

function account(overrides: Partial<AccountSummary> & Pick<AccountSummary, "accountId" | "email">): AccountSummary {
  return {
    accountId: overrides.accountId,
    email: overrides.email,
    displayName: overrides.displayName ?? overrides.email,
    planType: overrides.planType ?? "plus",
    status: overrides.status ?? "active",
    usage: overrides.usage ?? null,
    resetAtPrimary: overrides.resetAtPrimary ?? null,
    resetAtSecondary: overrides.resetAtSecondary ?? null,
    auth: overrides.auth ?? null,
    additionalQuotas: overrides.additionalQuotas ?? [],
  };
}

describe("buildDepletionView", () => {
  it("returns null for null depletion", () => {
    expect(buildDepletionView(null)).toBeNull();
  });

  it("returns null for undefined depletion", () => {
    expect(buildDepletionView(undefined)).toBeNull();
  });

  it("returns null for safe risk level", () => {
    const depletion: Depletion = {
      risk: 0.1,
      riskLevel: "safe",
      burnRate: 0.5,
      safeUsagePercent: 90,
    };
    expect(buildDepletionView(depletion)).toBeNull();
  });

  it("returns view for warning risk level", () => {
    const depletion: Depletion = {
      risk: 0.5,
      riskLevel: "warning",
      burnRate: 1.5,
      safeUsagePercent: 45,
    };
    const view = buildDepletionView(depletion);
    expect(view).toEqual({
      safePercent: 45,
      riskLevel: "warning",
    });
  });

  it("returns view for danger risk level", () => {
    const depletion: Depletion = {
      risk: 0.75,
      riskLevel: "danger",
      burnRate: 2.5,
      safeUsagePercent: 30,
    };
    const view = buildDepletionView(depletion);
    expect(view).toEqual({
      safePercent: 30,
      riskLevel: "danger",
    });
  });

  it("returns view for critical risk level", () => {
    const depletion: Depletion = {
      risk: 0.95,
      riskLevel: "critical",
      burnRate: 5.0,
      safeUsagePercent: 20,
    };
    const view = buildDepletionView(depletion);
    expect(view).toEqual({
      safePercent: 20,
      riskLevel: "critical",
    });
  });
});

function remainingItem(overrides: Partial<RemainingItem> & Pick<RemainingItem, "accountId">): RemainingItem {
  return {
    accountId: overrides.accountId,
    label: overrides.label ?? overrides.accountId,
    labelSuffix: overrides.labelSuffix ?? "",
    isEmail: overrides.isEmail ?? false,
    value: overrides.value ?? 100,
    remainingPercent: overrides.remainingPercent === undefined ? 80 : overrides.remainingPercent,
    color: overrides.color ?? "#aaa",
  };
}

describe("applySecondaryConstraint", () => {
  it("no-op when 7d remaining credits >= 5h remaining credits", () => {
    const primary = [remainingItem({ accountId: "acc-1", value: 180, remainingPercent: 80 })];
    const secondary = [remainingItem({ accountId: "acc-1", value: 6000, remainingPercent: 79 })];

    const result = applySecondaryConstraint(primary, secondary);

    expect(result[0].value).toBe(180);
    expect(result[0].remainingPercent).toBe(80);
  });

  it("caps 5h to 7d absolute credits when 7d remaining < 5h remaining", () => {
    const primary = [remainingItem({ accountId: "acc-1", value: 200, remainingPercent: 90 })];
    const secondary = [remainingItem({ accountId: "acc-1", value: 75, remainingPercent: 1 })];

    const result = applySecondaryConstraint(primary, secondary);

    expect(result[0].value).toBe(75);
    expect(result[0].remainingPercent).toBeCloseTo(90 * (75 / 200));
  });

  it("zeros 5h when 7d is fully depleted", () => {
    const primary = [remainingItem({ accountId: "acc-1", value: 200, remainingPercent: 90 })];
    const secondary = [remainingItem({ accountId: "acc-1", value: 0, remainingPercent: 0 })];

    const result = applySecondaryConstraint(primary, secondary);

    expect(result[0].value).toBe(0);
    expect(result[0].remainingPercent).toBe(0);
  });

  it("no-op when 7d has plenty even with low percent (different capacity scales)", () => {
    const primary = [remainingItem({ accountId: "acc-1", value: 200, remainingPercent: 90 })];
    const secondary = [remainingItem({ accountId: "acc-1", value: 3780, remainingPercent: 50 })];

    const result = applySecondaryConstraint(primary, secondary);

    expect(result[0].value).toBe(200);
    expect(result[0].remainingPercent).toBe(90);
  });

  it("preserves null remainingPercent on capped items", () => {
    const primary = [remainingItem({ accountId: "acc-1", value: 200, remainingPercent: null })];
    const secondary = [remainingItem({ accountId: "acc-1", value: 50 })];

    const result = applySecondaryConstraint(primary, secondary);

    expect(result[0].value).toBe(50);
    expect(result[0].remainingPercent).toBeNull();
  });

  it("returns primary unchanged when no matching secondary account exists", () => {
    const primary = [remainingItem({ accountId: "acc-1", value: 200, remainingPercent: 90 })];
    const secondary = [remainingItem({ accountId: "acc-2", value: 0, remainingPercent: 0 })];

    const result = applySecondaryConstraint(primary, secondary);

    expect(result[0].value).toBe(200);
    expect(result[0].remainingPercent).toBe(90);
  });

  it("does not clamp primary when secondary data is missing", () => {
    const primary = [remainingItem({ accountId: "acc-1", value: 200, remainingPercent: 90 })];
    const secondary = [remainingItem({ accountId: "acc-1", value: 0, remainingPercent: null })];

    const result = applySecondaryConstraint(primary, secondary);

    expect(result[0].value).toBe(200);
    expect(result[0].remainingPercent).toBe(90);
  });

  it("handles multiple accounts independently", () => {
    const primary = [
      remainingItem({ accountId: "acc-1", value: 200, remainingPercent: 90 }),
      remainingItem({ accountId: "acc-2", value: 150, remainingPercent: 60 }),
    ];
    const secondary = [
      remainingItem({ accountId: "acc-1", value: 75, remainingPercent: 1 }),
      remainingItem({ accountId: "acc-2", value: 5000, remainingPercent: 70 }),
    ];

    const result = applySecondaryConstraint(primary, secondary);

    expect(result[0].value).toBe(75);
    expect(result[0].remainingPercent).toBeCloseTo(90 * (75 / 200));
    expect(result[1].value).toBe(150);
    expect(result[1].remainingPercent).toBe(60);
  });

  it("returns empty array when primary is empty", () => {
    const result = applySecondaryConstraint([], [remainingItem({ accountId: "acc-1" })]);
    expect(result).toEqual([]);
  });

  it("does not mutate original primary items", () => {
    const primary = [remainingItem({ accountId: "acc-1", value: 200, remainingPercent: 90 })];
    const secondary = [remainingItem({ accountId: "acc-1", value: 0, remainingPercent: 0 })];

    applySecondaryConstraint(primary, secondary);

    expect(primary[0].value).toBe(200);
    expect(primary[0].remainingPercent).toBe(90);
  });

  it("caps to zero when secondary items are all zero-valued", () => {
    const primary = [
      remainingItem({ accountId: "acc-1", value: 200, remainingPercent: 90 }),
      remainingItem({ accountId: "acc-2", value: 150, remainingPercent: 60 }),
    ];
    const secondary = [
      remainingItem({ accountId: "acc-1", value: 0, remainingPercent: 0 }),
      remainingItem({ accountId: "acc-2", value: 0, remainingPercent: 0 }),
    ];

    const result = applySecondaryConstraint(primary, secondary);

    expect(result[0].value).toBe(0);
    expect(result[1].value).toBe(0);
  });
});

describe("buildRemainingItems", () => {
  it("keeps default labels for non-duplicate accounts", () => {
    const items = buildRemainingItems(
      [
        account({ accountId: "acc-1", email: "one@example.com" }),
        account({ accountId: "acc-2", email: "two@example.com" }),
      ],
      null,
      "primary",
    );

    expect(items[0].label).toBe("one@example.com");
    expect(items[1].label).toBe("two@example.com");
  });

  it("appends compact account id only for duplicate emails", () => {
    const duplicateA = "d48f0bfc-8ea6-48a7-8d76-d0e5ef1816c5_6f12b5d5";
    const duplicateB = "7f9de2ad-7621-4a6f-88bc-ec7f3d914701_91a95cee";
    const items = buildRemainingItems(
      [
        account({ accountId: duplicateA, email: "dup@example.com" }),
        account({ accountId: duplicateB, email: "dup@example.com" }),
        account({ accountId: "acc-3", email: "unique@example.com" }),
      ],
      null,
      "primary",
    );

    expect(items[0].label).toBe("dup@example.com");
    expect(items[0].labelSuffix).toBe(` (${formatCompactAccountId(duplicateA, 5, 4)})`);
    expect(items[0].isEmail).toBe(true);
    expect(items[1].label).toBe("dup@example.com");
    expect(items[1].labelSuffix).toBe(` (${formatCompactAccountId(duplicateB, 5, 4)})`);
    expect(items[1].isEmail).toBe(true);
    expect(items[2].label).toBe("unique@example.com");
    expect(items[2].labelSuffix).toBe("");
    expect(items[2].isEmail).toBe(true);
  });
});

describe("sumRemaining", () => {
  it("returns 0 for empty array", () => {
    expect(sumRemaining([])).toBe(0);
  });

  it("sums positive values", () => {
    const items = [
      remainingItem({ accountId: "a", value: 120 }),
      remainingItem({ accountId: "b", value: 80 }),
    ];
    expect(sumRemaining(items)).toBe(200);
  });

  it("clamps negative values to 0 before summing", () => {
    const items = [
      remainingItem({ accountId: "a", value: 100 }),
      remainingItem({ accountId: "b", value: -30 }),
    ];
    expect(sumRemaining(items)).toBe(100);
  });

  it("returns 0 when all values are negative", () => {
    const items = [
      remainingItem({ accountId: "a", value: -10 }),
      remainingItem({ accountId: "b", value: -20 }),
    ];
    expect(sumRemaining(items)).toBe(0);
  });
});

function overviewWithMetrics(metrics: {
  requests: number;
  tokens: number;
  cachedInputTokens: number;
  errorRate: number;
  errorCount: number;
  topError: string | null;
}) {
  const base = createDashboardOverview();
  const healthyAccount = account({
    accountId: "acc-healthy",
    email: "healthy@example.com",
    usage: {
      primaryRemainingPercent: 80,
      secondaryRemainingPercent: 80,
    },
  });
  const safeDepletion = {
    risk: 0.1,
    riskLevel: "safe" as const,
    burnRate: 0.5,
    safeUsagePercent: 90,
    projectedExhaustionAt: null,
    secondsUntilExhaustion: null,
  };
  return createDashboardOverview({
    accounts: [healthyAccount],
    summary: {
      ...base.summary,
      metrics,
    },
    depletionPrimary: safeDepletion,
    depletionSecondary: safeDepletion,
  });
}

describe("buildTokenRemainingItems", () => {
  it("maps every account quota percentage to a plan-token remaining value", () => {
    const items = buildTokenRemainingItems(
      [
        account({
          accountId: "acc-1",
          email: "one@example.com",
          usage: { primaryRemainingPercent: 99, secondaryRemainingPercent: 54 },
        }),
        account({
          accountId: "acc-2",
          email: "two@example.com",
          usage: { primaryRemainingPercent: 82, secondaryRemainingPercent: 20 },
        }),
        account({
          accountId: "acc-3",
          email: "three@example.com",
          usage: { primaryRemainingPercent: 77, secondaryRemainingPercent: 12 },
        }),
      ],
      "secondary",
      false,
    );

    expect(items).toHaveLength(3);
    expect(items.map((item) => item.accountId)).toEqual(["acc-1", "acc-2", "acc-3"]);
    expect(items[0]?.value).toBeCloseTo(324_000_000);
    expect(items[1]?.value).toBeCloseTo(120_000_000);
    expect(items[2]?.value).toBeCloseTo(72_000_000);
  });
});

describe("buildDashboardPosture", () => {
  it("marks high error rates as blocked", () => {
    const overview = overviewWithMetrics({
      requests: 100,
      tokens: 1000,
      cachedInputTokens: 0,
      errorRate: 0.08,
      errorCount: 8,
      topError: "invalid_request_error",
    });

    const posture = buildDashboardPosture(overview);

    expect(posture.level).toBe("blocked");
    expect(posture.label).toBe("Blocked");
    expect(posture.detail).toContain("invalid_request_error");
  });

  it("marks constrained account capacity as watch", () => {
    const base = createDashboardOverview();
    const overview = createDashboardOverview({
      accounts: [
        account({
          accountId: "acc-1",
          email: "one@example.com",
          usage: {
            primaryRemainingPercent: 12,
            secondaryRemainingPercent: 80,
          },
        }),
      ],
      summary: {
        ...base.summary,
        metrics: {
          requests: 100,
          tokens: 1000,
          cachedInputTokens: 0,
          errorRate: 0,
          errorCount: 0,
          topError: null,
        },
      },
    });

    const posture = buildDashboardPosture(overview);

    expect(posture.level).toBe("watch");
    expect(posture.constrainedAccounts).toBe(1);
    expect(posture.detail).toContain("below 15%");
  });

  it("marks quiet dashboards as monitoring", () => {
    const overview = overviewWithMetrics({
      requests: 0,
      tokens: 0,
      cachedInputTokens: 0,
      errorRate: 0,
      errorCount: 0,
      topError: null,
    });

    const posture = buildDashboardPosture(overview);

    expect(posture.level).toBe("monitoring");
    expect(posture.summary).toContain("Waiting");
  });

  it("marks healthy traffic as ready", () => {
    const overview = overviewWithMetrics({
      requests: 100,
      tokens: 1000,
      cachedInputTokens: 0,
      errorRate: 0,
      errorCount: 0,
      topError: null,
    });

    const posture = buildDashboardPosture(overview);

    expect(posture.level).toBe("ready");
    expect(posture.label).toBe("Ready");
  });
});

describe("buildDashboardView", () => {
  it("builds three top stats and estimates Cursor plan cost from tokens", () => {
    const overview = createDashboardOverview({
      summary: {
        primaryWindow: {
          remainingPercent: 80,
          capacityCredits: 225,
          remainingCredits: 180,
          resetAt: null,
          windowMinutes: 300,
        },
        secondaryWindow: {
          remainingPercent: 80,
          capacityCredits: 7560,
          remainingCredits: 6048,
          resetAt: null,
          windowMinutes: 10080,
        },
        cost: {
          currency: "USD",
          totalUsd: 389.44,
        },
        metrics: {
          requests: 100,
          tokens: 900_000_000,
          cachedInputTokens: 100_000_000,
          errorRate: 0.003,
          errorCount: 7,
          topError: "no_plan_support_for_model",
        },
      },
    });

    const view = buildDashboardView(overview, createDefaultRequestLogs(), false);

    expect(view.stats).toHaveLength(3);
    expect(view.stats.map((stat) => stat.label)).not.toContain("Error rate (7d)");
    expect(view.stats[2]?.label).toBe("Cost (7d)");
    expect(view.stats[2]?.value).toBe("$300.00");
    expect(view.stats[2]?.meta).toBe("Estimate 1.5 × $200 Cursor plans");
  });

  it("keeps donut totals anchored to window capacity even when displayed slices are constrained", () => {
    const overview = createDashboardOverview({
      accounts: [
        account({
          accountId: "acc-1",
          email: "one@example.com",
          usage: {
            primaryRemainingPercent: 90,
            secondaryRemainingPercent: 1,
          },
          resetAtPrimary: null,
          resetAtSecondary: null,
          windowMinutesPrimary: 300,
          windowMinutesSecondary: 10080,
        }),
        account({
          accountId: "acc-2",
          email: "two@example.com",
          usage: {
            primaryRemainingPercent: 60,
            secondaryRemainingPercent: 70,
          },
          resetAtPrimary: null,
          resetAtSecondary: null,
          windowMinutesPrimary: 300,
          windowMinutesSecondary: 10080,
        }),
      ],
      summary: {
        primaryWindow: {
          remainingPercent: 75,
          capacityCredits: 450,
          remainingCredits: 337.5,
          resetAt: null,
          windowMinutes: 300,
        },
        secondaryWindow: {
          remainingPercent: 35.5,
          capacityCredits: 15120,
          remainingCredits: 5370,
          resetAt: null,
          windowMinutes: 10080,
        },
        cost: {
          currency: "USD",
          totalUsd: 1.82,
        },
        metrics: {
          requests: 228,
          tokens: 45000,
          cachedInputTokens: 8200,
          errorRate: 0.028,
          errorCount: 6,
          topError: "rate_limit_exceeded",
        },
      },
    });

    const view = buildDashboardView(overview, createDefaultRequestLogs(), false);

    expect(view.primaryUsageItems).toHaveLength(2);
    expect(view.primaryUsageItems[0]?.value).toBeCloseTo(6_000_000);
    expect(view.primaryUsageItems[1]?.value).toBeCloseTo(360_000_000);
    expect(view.primaryCapacityTotal).toBe(1_200_000_000);
    expect(view.secondaryCapacityTotal).toBe(1_200_000_000);
    expect(view.primaryUsageItems.reduce((total, item) => total + item.value, 0)).toBeCloseTo(366_000_000);
  });

  it("keeps primary totals intact for accounts without secondary usage data", () => {
    const overview = createDashboardOverview({
      accounts: [
        account({
          accountId: "acc-1",
          email: "one@example.com",
          usage: {
            primaryRemainingPercent: 90,
            secondaryRemainingPercent: null,
          },
          resetAtPrimary: null,
          resetAtSecondary: null,
          windowMinutesPrimary: 300,
          windowMinutesSecondary: null,
        }),
      ],
      windows: {
        primary: {
          windowKey: "primary",
          windowMinutes: 300,
          accounts: [
            {
              accountId: "acc-1",
              remainingPercentAvg: 90,
              capacityCredits: 225,
              remainingCredits: 202.5,
            },
          ],
        },
        secondary: {
          windowKey: "secondary",
          windowMinutes: 10080,
          accounts: [
            {
              accountId: "acc-1",
              remainingPercentAvg: null,
              capacityCredits: 7560,
              remainingCredits: 0,
            },
          ],
        },
      },
      summary: {
        primaryWindow: {
          remainingPercent: 90,
          capacityCredits: 225,
          remainingCredits: 202.5,
          resetAt: null,
          windowMinutes: 300,
        },
        secondaryWindow: {
          remainingPercent: 0,
          capacityCredits: 7560,
          remainingCredits: 0,
          resetAt: null,
          windowMinutes: 10080,
        },
        cost: {
          currency: "USD",
          totalUsd: 1.82,
        },
        metrics: {
          requests: 228,
          tokens: 45000,
          cachedInputTokens: 8200,
          errorRate: 0.028,
          errorCount: 6,
          topError: "rate_limit_exceeded",
        },
      },
    });

    const view = buildDashboardView(overview, createDefaultRequestLogs(), false);

    expect(view.primaryUsageItems).toHaveLength(1);
    expect(view.primaryUsageItems[0]?.value).toBeCloseTo(540_000_000);
    expect(view.primaryUsageItems[0]?.remainingPercent).toBe(90);
    expect(overview.summary.primaryWindow.capacityCredits).toBe(225);
  });

  it("falls back to the summary remaining total when one account has no usable window row", () => {
    const singleAccount = account({
      accountId: "acc-1",
      email: "one@example.com",
      usage: {
        primaryRemainingPercent: 77,
        secondaryRemainingPercent: 54,
      },
      windowMinutesPrimary: 300,
      windowMinutesSecondary: 10080,
    });
    const overview = createDashboardOverview({
      accounts: [singleAccount],
      windows: {
        primary: {
          windowKey: "primary",
          windowMinutes: 300,
          accounts: [],
        },
        secondary: {
          windowKey: "secondary",
          windowMinutes: 10080,
          accounts: [
            {
              accountId: "acc-1",
              remainingPercentAvg: null,
              capacityCredits: 7560,
              remainingCredits: 0,
            },
          ],
        },
      },
      summary: {
        primaryWindow: {
          remainingPercent: 77,
          capacityCredits: 225,
          remainingCredits: 173.25,
          resetAt: null,
          windowMinutes: 300,
        },
        secondaryWindow: {
          remainingPercent: 54,
          capacityCredits: 7560,
          remainingCredits: 4082.4,
          resetAt: null,
          windowMinutes: 10080,
        },
        cost: {
          currency: "USD",
          totalUsd: 1.82,
        },
        metrics: {
          requests: 228,
          tokens: 45000,
          cachedInputTokens: 8200,
          errorRate: 0.028,
          errorCount: 6,
          topError: "rate_limit_exceeded",
        },
      },
    });

    const view = buildDashboardView(overview, createDefaultRequestLogs(), false);

    expect(view.primaryUsageItems).toHaveLength(1);
    expect(view.primaryUsageItems[0]?.value).toBeCloseTo(324_000_000);
    expect(view.primaryTotal).toBeCloseTo(324_000_000);
    expect(view.secondaryUsageItems).toHaveLength(1);
    expect(view.secondaryUsageItems[0]?.value).toBeCloseTo(324_000_000);
    expect(view.secondaryTotal).toBeCloseTo(324_000_000);
  });

  it("uses quota percentages to produce realistic token runway totals", () => {
    const overview = createDashboardOverview({
      accounts: [
        account({
          accountId: "acc-1",
          email: "one@example.com",
          usage: { primaryRemainingPercent: 99, secondaryRemainingPercent: 54 },
          windowMinutesPrimary: 300,
          windowMinutesSecondary: 10080,
        }),
        account({
          accountId: "acc-2",
          email: "two@example.com",
          usage: { primaryRemainingPercent: 82, secondaryRemainingPercent: 20 },
          windowMinutesPrimary: 300,
          windowMinutesSecondary: 10080,
        }),
        account({
          accountId: "acc-3",
          email: "three@example.com",
          usage: { primaryRemainingPercent: 77, secondaryRemainingPercent: 12 },
          windowMinutesPrimary: 300,
          windowMinutesSecondary: 10080,
        }),
      ],
      tokenRunway: {
        primary: {
          windowKey: "primary",
          estimatedTokensRemaining: 2,
          tokensPerCredit: 1,
          observedTokens: 2,
          observedCreditDelta: 1,
          samples: 1,
          confidence: "low",
          lastLearnedAt: "2026-01-01T00:00:00Z",
        },
        secondary: {
          windowKey: "secondary",
          estimatedTokensRemaining: 4_080,
          tokensPerCredit: 1,
          observedTokens: 4_080,
          observedCreditDelta: 1,
          samples: 1,
          confidence: "low",
          lastLearnedAt: "2026-01-01T00:00:00Z",
        },
      },
    });

    const view = buildDashboardView(overview, createDefaultRequestLogs(), false);

    expect(view.secondaryUsageItems).toHaveLength(3);
    expect(view.secondaryUsageItems.map((item) => item.accountId)).toEqual(["acc-1", "acc-2", "acc-3"]);
    expect(view.secondaryTotal).toBeCloseTo(516_000_000);
    expect(view.secondaryCapacityTotal).toBe(1_800_000_000);
    expect(view.tokenRunwaySecondary?.estimatedTokensRemaining).toBeCloseTo(516_000_000);
    expect(view.tokenRunwaySecondary?.tokensPerCredit).toBeNull();
  });
});
