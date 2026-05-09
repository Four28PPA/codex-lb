import type { ReactNode } from "react";
import { Eye, EyeOff, LogOut, Menu, Moon, Sun } from "lucide-react";
import { useState } from "react";
import { NavLink } from "react-router-dom";

import { CodexLogo } from "@/components/brand/codex-logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { usePrivacyStore } from "@/hooks/use-privacy";
import { useThemeStore, type ResolvedTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/access", label: "Access" },
  { to: "/settings", label: "Settings" },
] as const;

const THEME_OPTIONS: { value: ResolvedTheme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
];

function ThemeToggle() {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);

  return (
    <div className="hidden items-center rounded-lg border border-border/60 bg-muted/40 p-0.5 shadow-[var(--shadow-xs)] sm:flex" aria-label="Theme mode">
      {THEME_OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            type="button"
            aria-label={`Use ${label.toLowerCase()} mode`}
            aria-pressed={active}
            title={`${label} mode`}
            onClick={() => setTheme(value)}
            className={cn(
              "press-scale inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-[transform,box-shadow,background-color,color] duration-200 focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none motion-reduce:transition-none",
              active
                ? "bg-background text-foreground shadow-[var(--shadow-xs)]"
                : "hover:-translate-y-0.5 hover:text-foreground active:translate-y-0",
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}

export type AppHeaderProps = {
  onLogout: () => void;
  showLogout?: boolean;
  actions?: ReactNode;
  className?: string;
};

export function AppHeader({
  onLogout,
  showLogout = true,
  actions,
  className,
}: AppHeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const blurred = usePrivacyStore((s) => s.blurred);
  const togglePrivacy = usePrivacyStore((s) => s.toggle);
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const PrivacyIcon = blurred ? EyeOff : Eye;

  return (
    <header
      className={cn(
        "sticky top-0 z-20 border-b bg-card/82 px-4 py-2.5 shadow-[var(--shadow-sm)] backdrop-blur-xl backdrop-saturate-[1.45] supports-[backdrop-filter]:bg-card/78",
        className,
      )}
    >
      <div className="mx-auto flex w-full max-w-[1500px] items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary/15 to-primary/5">
            <CodexLogo size={20} className="text-primary" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight">Luna LB</p>
          </div>
        </div>

        {/* Desktop nav pills */}
        <nav className="hidden items-center rounded-lg border border-border/50 bg-muted/40 p-0.5 sm:flex">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/dashboard"}
              className={({ isActive }) =>
                cn(
                  "relative inline-flex h-7 items-center rounded-md px-3.5 text-xs leading-none font-medium transition-colors duration-200",
                  isActive
                    ? "bg-background text-foreground shadow-[var(--shadow-xs)]"
                    : "text-muted-foreground hover:text-foreground",
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex flex-1 items-center justify-end gap-1.5">
          {actions}
          <ThemeToggle />
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={togglePrivacy}
            aria-label={blurred ? "Show emails" : "Hide emails"}
            className="press-scale hidden h-8 w-8 rounded-lg border border-border/60 bg-muted/40 text-muted-foreground shadow-[var(--shadow-xs)] transition-[transform,box-shadow,border-color,background-color,color] duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:bg-primary/10 hover:text-foreground hover:shadow-[0_8px_18px_rgba(79,70,229,0.14)] focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40 sm:inline-flex"
          >
            <PrivacyIcon className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
          {showLogout && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={onLogout}
              className="press-scale hidden h-8 gap-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground sm:inline-flex"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              Logout
            </Button>
          )}

          {/* Mobile menu */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button type="button" size="icon" variant="ghost" aria-label="Open menu" className="h-8 w-8 rounded-lg sm:hidden">
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                    <CodexLogo size={16} className="text-primary" />
                  </div>
                  <span className="text-sm font-semibold">Luna LB</span>
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-0.5 px-4 pt-2">
                {NAV_ITEMS.map((item) => (
                  <NavLink key={item.to} to={item.to} end={item.to === "/dashboard"} onClick={() => setMobileOpen(false)}>
                    {({ isActive }) => (
                      <span
                        className={cn(
                          "block w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors",
                          isActive
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                      >
                        {item.label}
                      </span>
                    )}
                  </NavLink>
                ))}
                <div className="my-2 h-px bg-border" />
                <div className="flex items-center gap-1 rounded-lg border border-border/60 bg-muted/40 p-0.5 shadow-[var(--shadow-xs)]">
                  {THEME_OPTIONS.map(({ value, label, icon: Icon }) => {
                    const active = theme === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        aria-label={`Use ${label.toLowerCase()} mode`}
                        aria-pressed={active}
                        className={cn(
                          "flex h-8 flex-1 items-center justify-center rounded-md text-muted-foreground transition-colors",
                          active ? "bg-background text-foreground shadow-[var(--shadow-xs)]" : "hover:text-foreground",
                        )}
                        onClick={() => setTheme(value)}
                      >
                        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  onClick={togglePrivacy}
                >
                  <PrivacyIcon className="h-3.5 w-3.5" aria-hidden="true" />
                  {blurred ? "Show Emails" : "Hide Emails"}
                </button>
                {showLogout && (
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => {
                      setMobileOpen(false);
                      onLogout();
                    }}
                  >
                    <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                    Logout
                  </button>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
