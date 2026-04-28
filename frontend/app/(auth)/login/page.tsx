"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { ChevronLeft } from "lucide-react";

export default function LoginPage() {
  const { login, isAdmin, loading } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      // Role is set by AuthContext after verify-token call
      // Redirect is handled in useEffect below, but we can push immediately
      // because isAdmin may not be updated yet — use a short delay or rely
      // on the onAuthStateChanged flow to settle first.
      // We push to /dashboard; ProtectedRoute redirects volunteers to /my-tasks.
      router.push("/dashboard");
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Invalid email or password.";
      setError(
        msg.includes("wrong-password") || msg.includes("user-not-found")
          ? "Invalid email or password. Please try again."
          : msg
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md mx-auto">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="mb-4 flex items-center gap-1 text-sm font-medium text-teal-600 hover:text-teal-400 transition-colors bg-transparent border-none"
        >
          <ChevronLeft size={16} />
          Back
        </button>

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-xl bg-teal-600 mb-4">
            <span className="text-white font-bold text-lg">S</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Sign in to SevaSync</h1>
          <p className="text-sm text-gray-500 mt-1">
            Volunteer coordination platform
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col gap-4"
        >
          {error && (
            <div
              role="alert"
              className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="email"
              className="text-sm font-medium text-gray-700"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-11 rounded-lg border border-gray-300 px-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
              placeholder="you@example.com"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="password"
              className="text-sm font-medium text-gray-700"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-11 rounded-lg border border-gray-300 px-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={submitting || loading}
            className="w-full h-11 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-semibold rounded-lg text-base transition-colors flex items-center justify-center gap-2 mt-2"
          >
            {submitting ? (
              <>
                <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Signing in…
              </>
            ) : (
              "Sign in"
            )}
          </button>

          <p className="text-center text-sm text-gray-500 mt-1">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="text-teal-600 font-medium hover:underline"
            >
              Register
            </Link>
          </p>
        </form>

        {/* Demo hint */}
        <p className="text-center text-xs text-gray-400 mt-4">
          Demo: use coordinator or volunteer credentials
        </p>
      </div>
    </div>
  );
}
