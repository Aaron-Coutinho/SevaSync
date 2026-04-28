"use client";

import { useState } from "react";
import { Menu, X, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import Sidebar from "./Sidebar";

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const initials = user?.displayName
    ? user.displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user?.email?.[0]?.toUpperCase() ?? "U";

  return (
    <>
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 px-4 h-14 flex items-center justify-between">
        {/* Mobile: hamburger */}
        <button
          className="lg:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
        >
          <Menu size={22} />
        </button>

        {/* App name — visible on mobile, hidden on desktop where sidebar has it */}
        <span className="lg:hidden text-base font-bold text-gray-900">
          SevaSync
        </span>

        {/* Right: user info + logout */}
        <div className="flex items-center gap-3 ml-auto">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-teal-600 flex items-center justify-center text-white text-xs font-bold select-none">
              {initials}
            </div>
            <div className="hidden sm:block leading-tight">
              <p className="text-sm font-medium text-gray-900 leading-none">
                {user?.displayName ?? user?.email ?? "User"}
              </p>
              <p className="text-xs text-gray-500 capitalize">
                {isAdmin ? "Coordinator" : "Volunteer"}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 rounded-md text-gray-500 hover:bg-gray-100 hover:text-red-600 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer */}
          <div className="absolute left-0 top-0 h-full w-72 bg-white shadow-xl flex flex-col">
            <div className="flex items-center justify-between px-4 h-14 border-b border-gray-200">
              <span className="font-bold text-gray-900">SevaSync</span>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-2 rounded-md text-gray-500 hover:bg-gray-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {/* Reuse Sidebar nav content inside drawer */}
              <Sidebar />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
