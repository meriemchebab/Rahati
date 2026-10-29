"use client";

import type { ReactNode } from "react";

import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

interface DashboardLayoutProps {
  children: ReactNode;
  sidebarOpen: boolean;
  selectedPage: string;
  pendingRequests: number;
  formattedDate: string;
  notificationsOpen: boolean;
  onNavigate: (label: string) => void;
  onCloseSidebar: () => void;
  onOpenSidebar: () => void;
  onToggleNotifications: () => void;
}

export default function DashboardLayout({
  children,
  sidebarOpen,
  selectedPage,
  pendingRequests,
  formattedDate,
  notificationsOpen,
  onNavigate,
  onCloseSidebar,
  onOpenSidebar,
  onToggleNotifications,
}: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-[#f7f0f5] text-foreground">
      <Sidebar
        open={sidebarOpen}
        selectedPage={selectedPage}
        pendingRequests={pendingRequests}
        onNavigate={onNavigate}
        onClose={onCloseSidebar}
      />

      <div className="min-h-screen lg:pl-[260px]">
        <Topbar
          formattedDate={formattedDate}
          notificationsOpen={notificationsOpen}
          pendingRequests={pendingRequests}
          onToggleNotifications={onToggleNotifications}
          onOpenSidebar={onOpenSidebar}
        />

        <main className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8 xl:px-9">
          {children}
        </main>
      </div>
    </div>
  );
}
