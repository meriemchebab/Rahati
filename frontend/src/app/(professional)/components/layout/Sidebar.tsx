"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import {
  LayoutDashboard,
  CalendarDays,
  ClipboardList,
  UsersRound,
  Settings,
  Bell,
  X,
  ChevronRight,
  LogOut,
} from "lucide-react";

import { getProfile } from "@/lib/professional-api";
import { useAuth } from "@/components/auth/AuthContext";

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

function getInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) return "P";

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}

export default function Sidebar({
  open,
  selectedPage,
  pendingRequests,
  onNavigate,
  onClose,
}: SidebarProps) {
  const [displayName, setDisplayName] = useState("Professional");
  const { signOut } = useAuth();

  const loadProfile = useCallback(async () => {
    try {
      const profile = await getProfile();

      const name =
        typeof profile?.display_name === "string"
          ? profile.display_name.trim()
          : "";

      if (name) {
        setDisplayName(name);
      }
    } catch (error) {
      console.error("Unable to load professional profile:", error);
    }
  }, []);

  useEffect(() => {
    void loadProfile();

    const handleProfileUpdate = () => {
      void loadProfile();
    };

    window.addEventListener("rahati-profile-updated", handleProfileUpdate);

    return () => {
      window.removeEventListener("rahati-profile-updated", handleProfileUpdate);
    };
  }, [loadProfile]);

  return (
    <>
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
        {/* Logo */}
        <div className="flex h-[84px] shrink-0 items-center justify-between border-b border-rahati-mauve/10 px-6">
          <button
            type="button"
            onClick={() => onNavigate("Overview")}
            className="flex items-center gap-3 text-left"
            aria-label="Go to Overview"
          >
            <Image
              src="/images/rahati-logo.svg"
              alt="Rahati logo"
              width={40}
              height={40}
              priority
            />

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
              const isActive = selectedPage === label;

              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    onNavigate(label);
                    onClose();
                  }}
                  aria-current={isActive ? "page" : undefined}
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

        {/* Professional profile and logout */}
        <div className="shrink-0 border-t border-rahati-mauve/10 p-4">
          <button
            type="button"
            onClick={() => {
              onNavigate("Settings");
              onClose();
            }}
            className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-rahati-blush/60"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rahati-lavender text-[12px] font-semibold text-rahati-plum">
              {getInitials(displayName)}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-semibold text-rahati-plum">
                {displayName}
              </p>

              <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                Mental health professional
              </p>
            </div>

            <Settings size={16} className="shrink-0 text-muted-foreground" />
          </button>

          <button
            type="button"
            onClick={signOut}
            className="mt-3 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-[13px] font-medium text-[#9b647e] transition hover:bg-[#f9eaf1] hover:text-[#82445f]"
          >
            <LogOut size={18} strokeWidth={1.8} />
            <span>Log out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
