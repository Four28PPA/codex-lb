import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { KeyRound, UserRound } from "lucide-react";

import { AccountsPage } from "@/features/accounts/components/accounts-page";
import { ApisPage } from "@/features/apis/components/apis-page";
import { cn } from "@/lib/utils";

const ACCESS_TABS = [
  {
    to: "/access/accounts",
    label: "Accounts",
    description: "Auth, quota health, and account actions",
    icon: UserRound,
  },
  {
    to: "/access/apis",
    label: "API keys",
    description: "Client keys, limits, and usage",
    icon: KeyRound,
  },
] as const;

export function AccessPage() {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold tracking-tight">Access</h1>
          <p className="mt-1 text-sm font-medium text-muted-foreground">
            Manage accounts and API keys from one compact control surface.
          </p>
        </div>

        <nav className="inline-flex w-fit shrink-0 items-center gap-1 rounded-full border border-border/50 bg-card/40 p-1 shadow-inner backdrop-blur-sm" aria-label="Access sections">
          {ACCESS_TABS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "inline-flex h-8 items-center gap-2 rounded-full px-4 text-xs font-semibold transition-colors",
                  isActive
                    ? "bg-secondary text-secondary-foreground"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                )
              }
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      <Routes>
        <Route index element={<Navigate to="accounts" replace />} />
        <Route path="accounts" element={<AccountsPage embedded />} />
        <Route path="apis" element={<ApisPage embedded />} />
        <Route path="*" element={<Navigate to="accounts" replace />} />
      </Routes>
    </div>
  );
}
