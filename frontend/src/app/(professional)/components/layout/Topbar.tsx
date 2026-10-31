"use client";

import {
  Bell,
  Menu,
  X,
  CalendarDays,
  Clock3,
  CheckCircle2,
} from "lucide-react";

interface TopbarProps {
  formattedDate: string;
  notificationsOpen: boolean;
  pendingRequests: number;
  onToggleNotifications: () => void;
  onOpenSidebar: () => void;
}

export default function Topbar({
  formattedDate,
  notificationsOpen,
  pendingRequests,
  onToggleNotifications,
  onOpenSidebar,
}: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-[76px] shrink-0 items-center justify-between border-b border-border bg-background/95 px-5 backdrop-blur-md sm:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onOpenSidebar}
          aria-label="Open navigation"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-foreground transition-colors hover:bg-accent lg:hidden"
        >
          <Menu size={20} />
        </button>

        <div className="min-w-0">
          <p className="truncate text-[12px] font-medium text-muted-foreground">
            Professional workspace
          </p>

          <p className="mt-1 truncate text-[13px] font-medium text-foreground">
            {formattedDate}
          </p>
        </div>
      </div>

      <div className="relative ml-3 flex shrink-0 items-center gap-3">
        <button
          type="button"
          onClick={onToggleNotifications}
          aria-label="Toggle notifications"
          aria-expanded={notificationsOpen}
          className={`relative flex h-10 w-10 items-center justify-center rounded-xl border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7673FF] focus-visible:ring-offset-2 ${
            notificationsOpen
              ? "border-[#7673FF] bg-[#7673FF] text-[#111018]"
              : "border-border bg-card text-muted-foreground hover:border-[#7673FF]/50 hover:bg-[#7673FF]/10 hover:text-[#111018]"
          }`}
        >
          <Bell size={18} strokeWidth={1.8} />

          {pendingRequests > 0 && (
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-card bg-[#F580FF]" />
          )}
        </button>

        {notificationsOpen && (
          <>
            <button
              type="button"
              aria-label="Close notifications"
              onClick={onToggleNotifications}
              className="fixed inset-0 z-40 cursor-default"
            />

            <section
              aria-label="Notifications"
              className="absolute right-0 top-12 z-50 w-[min(340px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border bg-popover shadow-xl"
            >
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <div>
                  <h2 className="text-[14px] font-semibold text-popover-foreground">
                    Notifications
                  </h2>

                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Your latest workspace updates
                  </p>
                </div>

                <button
                  type="button"
                  onClick={onToggleNotifications}
                  aria-label="Close notifications"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-1 p-3">
                {pendingRequests > 0 ? (
                  <div className="flex gap-3 rounded-xl bg-muted p-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rahati-periwinkle text-rahati-ink">
                      <CalendarDays size={17} />
                    </span>

                    <div>
                      <p className="text-[12px] font-medium text-foreground">
                        New appointment requests
                      </p>

                      <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                        You have {pendingRequests} pending{" "}
                        {pendingRequests === 1 ? "request" : "requests"} to
                        review.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3 rounded-xl p-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                      <CheckCircle2 size={17} />
                    </span>

                    <div>
                      <p className="text-[12px] font-medium text-foreground">
                        You're all caught up
                      </p>

                      <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                        There are no pending appointment requests.
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 rounded-xl p-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rahati-lilac/70 text-rahati-ink">
                    <Clock3 size={17} />
                  </span>

                  <div>
                    <p className="text-[12px] font-medium text-foreground">
                      Keep your schedule updated
                    </p>

                    <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                      Check your calendar to stay on top of upcoming sessions.
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t border-border px-5 py-3">
                <p className="text-center text-[10px] text-muted-foreground">
                  Rahati professional workspace
                </p>
              </div>
            </section>
          </>
        )}
      </div>
    </header>
  );
}
