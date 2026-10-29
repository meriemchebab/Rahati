"use client";

import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  ClipboardList,
  UsersRound,
  Settings,
  Bell,
  X,
  ChevronRight,
} from "lucide-react";

interface SidebarProps {
  open: boolean;
  selectedPage: string;
  pendingRequests: number;
  onNavigate: (label: string) => void;
  onClose: () => void;
}

const navigationItems = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Calendar", icon: CalendarDays },
  { label: "Requests", icon: ClipboardList },
  { label: "Patients", icon: UsersRound },
  { label: "Settings", icon: Settings },
];

export default function Sidebar({
  open,
  selectedPage,
  pendingRequests,
  onNavigate,
  onClose,
}: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const routes: Record<string, string> = {
    Overview: "/",
    Calendar: "/calendar",
    Requests: "/requests",
    Patients: "/patients",
    Settings: "/settings",
  };

  const currentPage =
    Object.entries(routes).find(([, route]) => route === pathname)?.[0] ??
    "Overview";

  function navigateToPage(label: string) {
    onNavigate(label);
    onClose();

    const route = routes[label];

    if (route) {
      router.push(route);
    }
  }

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r border-rahati-mauve/10 bg-sidebar transition-transform duration-300 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand */}
        <div className="flex h-[84px] shrink-0 items-center justify-between border-b border-rahati-mauve/10 px-6">
          <button
            type="button"
            onClick={() => navigateToPage("Overview")}
            className="flex items-center gap-3 text-left"
            aria-label="Go to Overview"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rahati-mauve text-white">
              <Image
                src="/images/rahati-logo.svg"
                alt="Rahati logo"
                width={40}
                height={40}
                priority
              />
            </span>

            <span className="flex flex-col">
              <span className="text-[20px] font-semibold tracking-tight text-rahati-plum">
                rahati
              </span>
              <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-rahati-mauve-dark">
                Professional
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close sidebar"
            className="rounded-lg p-2 text-muted-foreground transition hover:bg-rahati-blush lg:hidden"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-4 py-7">
          <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Workspace
          </p>

          <nav className="space-y-1.5" aria-label="Professional navigation">
            {navigationItems.map(({ label, icon: Icon }) => {
              const isActive = currentPage === label;

              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => navigateToPage(label)}
                  className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[13px] font-medium transition-colors ${
                    isActive
                      ? "bg-rahati-blush text-rahati-plum"
                      : "text-muted-foreground hover:bg-rahati-blush/60 hover:text-rahati-plum"
                  }`}
                >
                  <Icon
                    size={18}
                    strokeWidth={isActive ? 2 : 1.7}
                    className={
                      isActive
                        ? "text-rahati-mauve-dark"
                        : "text-muted-foreground group-hover:text-rahati-mauve-dark"
                    }
                  />

                  <span className="flex-1">{label}</span>

                  {label === "Requests" && pendingRequests > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-rahati-pink px-1.5 text-[10px] font-semibold text-rahati-plum">
                      {pendingRequests}
                    </span>
                  )}

                  {isActive && (
                    <ChevronRight
                      size={15}
                      className="text-rahati-mauve-dark"
                    />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Workspace reminder */}
          <div className="mt-9 rounded-2xl border border-rahati-mauve/10 bg-rahati-blush/70 p-4">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-white text-rahati-mauve-dark">
              <Bell size={17} />
            </div>

            <p className="text-[12px] font-semibold text-rahati-plum">
              Your workspace
            </p>

            <p className="mt-1.5 text-[11px] leading-5 text-muted-foreground">
              Keep your schedule up to date and stay connected with your
              patients.
            </p>
          </div>
        </div>

        {/* Professional profile */}
        <div className="shrink-0 border-t border-rahati-mauve/10 p-4">
          <div className="flex items-center gap-3 rounded-xl px-2 py-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rahati-lavender text-[12px] font-semibold text-rahati-plum">
              SS
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-semibold text-rahati-plum">
                Dr. Sarah
              </p>
              <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                Mental health professional
              </p>
            </div>

            <Settings size={16} className="shrink-0 text-muted-foreground" />
          </div>
        </div>
      </aside>
    </>
  );
}
