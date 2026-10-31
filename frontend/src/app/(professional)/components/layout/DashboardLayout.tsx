"use client";

import { useState, type ReactNode } from "react";

import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

interface DashboardLayoutProps {
  children: ReactNode;
  selectedPage: string;
  sidebarOpen?: boolean;
  pendingRequests?: number;
  formattedDate?: string;
  notificationsOpen?: boolean;
  onNavigate?: (label: string) => void;
  onCloseSidebar?: () => void;
  onOpenSidebar?: () => void;
  onToggleNotifications?: () => void;
}

export default function DashboardLayout({
  children,
  selectedPage,
  sidebarOpen,
  pendingRequests = 0,
  formattedDate,
  notificationsOpen,
  onNavigate,
  onCloseSidebar,
  onOpenSidebar,
  onToggleNotifications,
}: DashboardLayoutProps) {
  const [internalSidebarOpen, setInternalSidebarOpen] = useState(false);
  const [internalNotificationsOpen, setInternalNotificationsOpen] =
    useState(false);

  const isSidebarOpen = sidebarOpen ?? internalSidebarOpen;
  const areNotificationsOpen = notificationsOpen ?? internalNotificationsOpen;

  const date =
    formattedDate ??
    new Date().toLocaleDateString("en-US", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  function handleCloseSidebar() {
    if (onCloseSidebar) {
      onCloseSidebar();
    } else {
      setInternalSidebarOpen(false);
    }
  }

  function handleOpenSidebar() {
    if (onOpenSidebar) {
      onOpenSidebar();
    } else {
      setInternalSidebarOpen(true);
    }
  }

  function handleToggleNotifications() {
    if (onToggleNotifications) {
      onToggleNotifications();
    } else {
      setInternalNotificationsOpen((current) => !current);
    }
  }

  function handleNavigate(label: string) {
    onNavigate?.(label);

    if (!onNavigate) {
      const routes: Record<string, string> = {
        Overview: "/",
        Calendar: "/calendar",
        Requests: "/requests",
        Patients: "/patients",
        Settings: "/settings",
      };

      const route = routes[label];

      if (route) {
        window.location.href = route;
      }
    }

    handleCloseSidebar();
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar
        open={isSidebarOpen}
        selectedPage={selectedPage}
        pendingRequests={pendingRequests}
        onNavigate={handleNavigate}
        onClose={handleCloseSidebar}
      />

      <div className="min-h-screen lg:pl-[260px]">
        <Topbar
          formattedDate={date}
          notificationsOpen={areNotificationsOpen}
          pendingRequests={pendingRequests}
          onToggleNotifications={handleToggleNotifications}
          onOpenSidebar={handleOpenSidebar}
        />

        <main className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8 xl:px-9">
          {children}
        </main>
      </div>
    </div>
  );
}
