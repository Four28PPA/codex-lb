import { beforeEach, describe, expect, it } from "vitest";

import { getTimeFormatPreference, useTimeFormatStore } from "@/hooks/use-time-format";

describe("useTimeFormatStore", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useTimeFormatStore.setState({ timeFormat: "12h" });
  });

  it("always uses 12h", () => {
    useTimeFormatStore.getState().setTimeFormat();

    expect(getTimeFormatPreference()).toBe("12h");
    expect(useTimeFormatStore.getState().timeFormat).toBe("12h");
    expect(window.localStorage.getItem("codex-lb-time-format")).toBeNull();
  });
});
