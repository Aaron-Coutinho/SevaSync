"use client";

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

export default function Sidebar() {
  const { user, isAdmin } = useAuth();
  const pathname = usePathname();

  const adminLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/needs", label: "Needs", icon: ClipboardList },
    { href: "/volunteers", label: "Volunteers", icon: Users },
  ];

  const volunteerLinks = [
    { href: "/my-tasks", label: "My Tasks", icon: CheckSquare },
    { href: `/volunteers/${user?.uid || ''}`, label: "My Profile", icon: UserCircle },
  ];

  const links = isAdmin ? adminLinks : volunteerLinks;

  return (
    <aside className="hidden lg:flex flex-col w-64 min-h-screen bg-white border-r border-gray-200 px-4 py-6 shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-8 px-2">
        <div className="h-8 w-8 rounded-lg bg-teal-600 flex items-center justify-center">
          <span className="text-white font-bold text-sm">S</span>
        </div>
        <span className="text-xl font-bold text-gray-900 tracking-tight">
          SevaSync
        </span>
      </div>

      {/* Nav links */}
      <nav className="flex flex-col gap-1 flex-1">
        {links.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px]",
                active
                  ? "bg-teal-50 text-teal-700"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              )}
            >
              <Icon
                size={18}
                className={active ? "text-teal-600" : "text-gray-400"}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Role indicator */}
      <div className="px-3 py-2 mt-4">
        <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">
          {isAdmin ? "Coordinator" : "Volunteer"}
        </span>
      </div>
    </aside>
  );
}
