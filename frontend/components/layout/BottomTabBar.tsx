"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  CheckSquare,
  UserCircle,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

export default function BottomTabBar() {
  const { user, isAdmin } = useAuth();
  const pathname = usePathname();

  const tabs = isAdmin
    ? [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/needs", label: "Needs", icon: ClipboardList },
        { href: "/volunteers", label: "Volunteers", icon: Users },
        { href: `/volunteers/${user?.uid || ''}`, label: "Profile", icon: UserCircle },
      ]
    : [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/my-tasks", label: "My Tasks", icon: CheckSquare },
        { href: `/volunteers/${user?.uid || ''}`, label: "Profile", icon: UserCircle },
      ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex lg:hidden bg-white border-t border-gray-200">
      {tabs.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex-1 flex flex-col items-center justify-center min-h-[64px] gap-1 text-xs font-medium transition-colors",
              active ? "text-teal-600" : "text-gray-500"
            )}
          >
            <Icon size={22} />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
