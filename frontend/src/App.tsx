import { Navigate, Outlet, Route, Routes, useLocation, useSearchParams } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { useCallback } from "react";
import { useIsFetching, useQueryClient } from "@tanstack/react-query";

import { AppHeader } from "@/components/layout/app-header";
import { StatusBar } from "@/components/layout/status-bar";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthGate } from "@/features/auth/components/auth-gate";
import { useAuthStore } from "@/features/auth/hooks/use-auth";
import { AccessPage } from "@/features/access/components/access-page";
import { AccountsPage } from "@/features/accounts/components/accounts-page";
import { ApisPage } from "@/features/apis/components/apis-page";
import { DashboardPage } from "@/features/dashboard/components/dashboard-page";
import { OverviewTimeframeSelect } from "@/features/dashboard/components/filters/overview-timeframe-select";
import {
  DEFAULT_OVERVIEW_TIMEFRAME,
  parseOverviewTimeframe,
  type OverviewTimeframe,
} from "@/features/dashboard/schemas";
import { SettingsPage } from "@/features/settings/components/settings-page";
import { cn } from "@/lib/utils";

function DashboardHeaderControls() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const isFetchingDashboard = useIsFetching({ queryKey: ["dashboard"] }) > 0;
  const overviewTimeframe = parseOverviewTimeframe(searchParams.get("overviewTimeframe"));
  const isDashboard = location.pathname === "/dashboard" || location.pathname === "/";

  const handleOverviewTimeframeChange = useCallback(
    (timeframe: OverviewTimeframe) => {
      const next = new URLSearchParams(searchParams);
      if (timeframe === DEFAULT_OVERVIEW_TIMEFRAME) {
        next.delete("overviewTimeframe");
      } else {
        next.set("overviewTimeframe", timeframe);
      }
      setSearchParams(next);
    },
    [searchParams, setSearchParams],
  );

  const handleRefresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  }, [queryClient]);

  if (!isDashboard) {
    return null;
  }

  return (
    <div className="hidden items-center gap-1.5 md:flex">
      <OverviewTimeframeSelect
        value={overviewTimeframe}
        onChange={handleOverviewTimeframeChange}
        className="h-8 w-16 rounded-lg bg-muted/40 px-2.5"
        contentClassName="min-w-16"
      />
      <button
        type="button"
        onClick={handleRefresh}
        disabled={isFetchingDashboard}
        className="group inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 bg-muted/40 text-muted-foreground shadow-[var(--shadow-xs)] transition-[transform,box-shadow,border-color,background-color,color] duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:bg-primary/10 hover:text-foreground hover:shadow-[0_8px_18px_rgba(79,70,229,0.14)] focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none active:translate-y-0 disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
        title="Refresh dashboard"
        aria-label="Refresh dashboard"
      >
        <RefreshCw className={cn("h-3.5 w-3.5 transition-transform duration-300 group-hover:rotate-45 motion-reduce:transition-none", isFetchingDashboard && "animate-spin")} />
      </button>
    </div>
  );
}

function AppLayout() {
  const logout = useAuthStore((state) => state.logout);
  const passwordRequired = useAuthStore((state) => state.passwordRequired);

  return (
    <div className="flex min-h-screen flex-col bg-background pb-10">
      <AppHeader
        onLogout={() => {
          void logout();
        }}
        showLogout={passwordRequired}
        actions={<DashboardHeaderControls />}
      />
      <main className="mx-auto w-full max-w-[1500px] flex-1 px-4 py-8 sm:px-6">
        <Outlet />
      </main>
      <StatusBar />
    </div>
  );
}

export default function App() {
  return (
    <TooltipProvider>
      <Toaster richColors />
      <AuthGate>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/access/*" element={<AccessPage />} />
            <Route path="/accounts" element={<AccountsPage />} />
            <Route path="/apis" element={<ApisPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/firewall" element={<Navigate to="/settings" replace />} />
          </Route>
        </Routes>
      </AuthGate>
    </TooltipProvider>
  );
}
