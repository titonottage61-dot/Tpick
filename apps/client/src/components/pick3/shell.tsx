import type { ReactNode } from "react";

import { AppNavLink } from "@/components/navigation/AppNavLink";
import { cn } from "@/lib/utils";

import { IconBoard, IconChart, IconScan, IconSpark, IconTicket } from "./icons";
import { usePick3 } from "./store";

type NavItem = {
  to: string;
  label: string;
  short: string;
  icon: (props: { className?: string }) => ReactNode;
};

const NAV: NavItem[] = [
  { to: "/", label: "Play board", short: "Board", icon: IconBoard },
  { to: "/check", label: "Check tickets", short: "Check", icon: IconScan },
  { to: "/picks", label: "Build numbers", short: "Picks", icon: IconSpark },
  { to: "/draws", label: "Draw log", short: "Draws", icon: IconChart },
  { to: "/tickets", label: "My tickets", short: "Tickets", icon: IconTicket },
];

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="relative grid h-9 w-9 place-items-center rounded-[0.65rem] bg-lime font-display text-sm font-bold text-primary-foreground shadow-[0_0_26px_-8px_rgba(185,242,39,0.85)]">
        P3
      </span>
      {compact ? null : (
        <span className="leading-tight">
          <span className="block font-display text-[0.82rem] tracking-[0.14em] text-foreground">PARADISE</span>
          <span className="block font-display text-[0.62rem] tracking-[0.34em] text-muted-foreground">PICK 3</span>
        </span>
      )}
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { tickets } = usePick3();
  const savedCount = tickets.length;

  return (
    <div className="min-h-screen md:grid md:grid-cols-[236px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-line/80 bg-[#080a10]/85 px-4 py-6 backdrop-blur-xl md:flex">
        <AppNavLink to="/" aria-label="Paradise Pick 3 home" className="block px-2">
          <Brand />
        </AppNavLink>

        <nav className="mt-9 flex flex-1 flex-col gap-1" aria-label="Primary">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <AppNavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className="group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors"
                activeClassName="bg-lime/[0.09] text-lime"
                inactiveClassName="text-muted-foreground hover:bg-white/[0.035] hover:text-foreground"
              >
                <Icon className="h-[1.05rem] w-[1.05rem]" />
                <span className="flex-1">{item.label}</span>
                {item.to === "/tickets" && savedCount > 0 ? (
                  <span className="rounded-full border border-lime/30 bg-lime/10 px-1.5 py-0.5 font-display text-[0.6rem] text-lime">
                    {savedCount}
                  </span>
                ) : null}
              </AppNavLink>
            );
          })}
        </nav>

        <div className="mt-6 rounded-xl border border-line bg-white/[0.02] p-3.5">
          <p className="label-mono">Private by default</p>
          <p className="mt-1.5 text-[0.7rem] leading-relaxed text-muted-foreground">
            Draws and tickets live in this browser only. Export any time from My tickets.
          </p>
        </div>
        <p className="mt-4 px-1 text-[0.62rem] leading-relaxed text-muted-foreground/70">
          Independent tool. Not affiliated with any lottery operator.
        </p>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line/70 bg-background/80 px-4 py-3 backdrop-blur-xl md:hidden">
          <AppNavLink to="/" aria-label="Paradise Pick 3 home">
            <Brand compact />
            <span className="ml-2 font-display text-[0.72rem] tracking-[0.2em] text-foreground">PICK 3</span>
          </AppNavLink>
          <span className="rounded-full border border-line px-2 py-1 font-display text-[0.58rem] uppercase tracking-[0.14em] text-muted-foreground">
            on device
          </span>
        </header>

        <main className="mx-auto w-full max-w-[1180px] px-4 pb-28 pt-6 sm:px-7 md:pb-16 md:pt-10">{children}</main>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-[#080a10]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
        aria-label="Primary"
      >
        <div className="mx-auto flex max-w-lg items-stretch">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <AppNavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={cn("flex flex-1 flex-col items-center gap-1 py-2.5 text-[0.6rem]")}
                activeClassName="text-lime"
                inactiveClassName="text-muted-foreground"
              >
                <Icon className="h-5 w-5" />
                <span className="font-display uppercase tracking-[0.1em]">{item.short}</span>
              </AppNavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
