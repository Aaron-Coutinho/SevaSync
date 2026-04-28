"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sparkles, Zap, BarChart3, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Redirect authenticated users to the dashboard
    if (!loading && user) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  // If auth state is still loading, or if we have a user (meaning we are about to redirect),
  // show the full-screen centered spinner.
  if (loading || user) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center">
        <Loader2 size={48} className="text-teal-500 animate-spin mb-4" />
        <h1 className="text-2xl font-bold text-white tracking-wide">
          Seva<span className="text-teal-400">Sync</span>
        </h1>
      </div>
    );
  }

  // Clean landing page for unauthenticated visitors
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center px-4 py-16">
      {/* ── Hero Section ────────────────────────────────────────────────── */}
      <div className="max-w-3xl text-center space-y-6">
        <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight">
          Seva<span className="text-teal-400">Sync</span>
        </h1>
        <p className="text-xl md:text-2xl text-slate-300 font-light">
          Smart Volunteer Coordination for Social Impact
        </p>
        
        {/* Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
          <Link
            href="/login"
            className="w-full sm:w-auto px-8 py-3.5 rounded-lg border-2 border-teal-500 text-teal-400 font-semibold hover:bg-teal-500/10 transition-colors text-center text-lg"
          >
            Login
          </Link>
          <Link
            href="/register"
            className="w-full sm:w-auto px-8 py-3.5 rounded-lg bg-teal-500 hover:bg-teal-600 text-white font-semibold transition-colors text-center border-2 border-teal-500 text-lg shadow-lg shadow-teal-500/20"
          >
            Get Started
          </Link>
        </div>
      </div>

      {/* ── Features Row ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mt-24">
        {/* Feature 1 */}
        <div className="flex flex-col items-center text-center p-8 rounded-2xl bg-slate-800/50 border border-slate-700/50 hover:bg-slate-800 transition-colors">
          <div className="h-14 w-14 rounded-full bg-teal-500/10 flex items-center justify-center mb-5 shadow-inner">
            <Sparkles size={28} className="text-teal-400" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-3">AI-Powered Matching</h3>
          <p className="text-base text-slate-400 leading-relaxed">
            Automatically structure messy community needs using Gemini and recommend the perfect volunteers in seconds.
          </p>
        </div>

        {/* Feature 2 */}
        <div className="flex flex-col items-center text-center p-8 rounded-2xl bg-slate-800/50 border border-slate-700/50 hover:bg-slate-800 transition-colors">
          <div className="h-14 w-14 rounded-full bg-teal-500/10 flex items-center justify-center mb-5 shadow-inner">
            <Zap size={28} className="text-teal-400" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-3">Real-Time Coordination</h3>
          <p className="text-base text-slate-400 leading-relaxed">
            Assign tasks, track progress dynamically, and manage resources efficiently from a centralized dashboard.
          </p>
        </div>

        {/* Feature 3 */}
        <div className="flex flex-col items-center text-center p-8 rounded-2xl bg-slate-800/50 border border-slate-700/50 hover:bg-slate-800 transition-colors">
          <div className="h-14 w-14 rounded-full bg-teal-500/10 flex items-center justify-center mb-5 shadow-inner">
            <BarChart3 size={28} className="text-teal-400" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-3">Impact Analytics</h3>
          <p className="text-base text-slate-400 leading-relaxed">
            Measure response times, visualize task categories, and monitor volunteer utilization across the organization.
          </p>
        </div>
      </div>
    </div>
  );
}
