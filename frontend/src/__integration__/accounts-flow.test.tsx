import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import App from "@/App";
import { renderWithProviders } from "@/test/utils";

describe("accounts flow integration", () => {
  it("supports account selection and pause/resume actions", async () => {
    const user = userEvent.setup({ delay: null });

    window.history.pushState({}, "", "/accounts");
    renderWithProviders(<App />);

    expect(await screen.findByRole("heading", { name: "Accounts" })).toBeInTheDocument();
    expect((await screen.findAllByText("primary@example.com")).length).toBeGreaterThan(0);
    expect(screen.getByText("secondary@example.com")).toBeInTheDocument();

    await user.click(screen.getByText("secondary@example.com"));
    expect(await screen.findAllByText("Access")).toHaveLength(2);

    await user.click(screen.getByRole("button", { name: "Actions" }));
    const resumeMenuItem = screen.queryByRole("menuitem", { name: "Resume account" });
    if (resumeMenuItem) {
      await user.click(resumeMenuItem);
      await waitFor(() => {
        expect(screen.queryByRole("menuitem", { name: "Resume account" })).not.toBeInTheDocument();
      });
    } else {
      await user.click(screen.getByRole("menuitem", { name: "Pause account" }));
      await waitFor(() => {
        expect(screen.queryByRole("menuitem", { name: "Pause account" })).not.toBeInTheDocument();
      });
    }
  });
});
