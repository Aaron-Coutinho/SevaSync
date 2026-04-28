"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Required role to access this route. Omit to allow any authenticated user. */
  role?: "admin" | "volunteer" | "field_volunteer";
}

export default function ProtectedRoute({ children, role }: ProtectedRouteProps) {
  const { user, role: userRole, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    if (role && userRole !== role) {
      // Wrong role — redirect to their default landing page
      if (userRole === "admin") {
        router.replace("/dashboard");
      } else {
        router.replace("/my-tasks");
      }
    }
  }, [loading, user, userRole, role, router]);

  // Full-page spinner while checking auth
  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-full border-4 border-teal-600 border-t-transparent animate-spin" />
          <p className="text-sm text-gray-500">Loading…</p>
        </div>
      </div>
    );
  }

  // Not authenticated or wrong role — render nothing while redirect fires
  if (!user || (role && userRole !== role)) {
    return null;
  }

  return <>{children}</>;
}
