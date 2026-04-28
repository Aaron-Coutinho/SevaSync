"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createUserWithEmailAndPassword } from "@/lib/firebase";
import { post } from "@/lib/api";
import { ChevronLeft } from "lucide-react";

type Role = "admin" | "volunteer";

const SKILL_OPTIONS = [
  { value: "medical", label: "Medical" },
  { value: "counselling", label: "Counselling" },
  { value: "logistics", label: "Logistics" },
  { value: "translation", label: "Translation" },
  { value: "data_entry", label: "Data Entry" },
  { value: "field_support", label: "Field Support" },
  { value: "community_outreach", label: "Community Outreach" },
  { value: "documentation", label: "Documentation" },
];

const PREFERRED_TIMES = [
  { value: "morning", label: "Morning" },
  { value: "afternoon", label: "Afternoon" },
  { value: "evening", label: "Evening" },
  { value: "flexible", label: "Flexible" },
];

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1 fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("volunteer");
  const [organization, setOrganization] = useState("");

  // Step 2 — volunteer profile fields
  const [phone, setPhone] = useState("");
  const [area, setArea] = useState("");
  const [city, setCity] = useState("Mumbai");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [languages, setLanguages] = useState("Hindi, English");
  const [weekdays, setWeekdays] = useState(true);
  const [weekends, setWeekends] = useState(false);
  const [hoursPerWeek, setHoursPerWeek] = useState(10);
  const [preferredTime, setPreferredTime] = useState("flexible");

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (role === "volunteer") {
      setStep(2);
    } else {
      handleFinalSubmit();
    }
  };

  const handleFinalSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      // 1. Create Firebase account
      const credential = await createUserWithEmailAndPassword(email, password);
      const idToken = await credential.user.getIdToken();

      // 2. Register user doc in Firestore via backend
      await post("/auth/register", {
        name,
        email,
        role,
        organization,
      });

      // 3. Create volunteer profile if needed
      if (role === "volunteer") {
        await post("/auth/volunteer-profile", {
          uid: credential.user.uid,
          phone,
          skills: selectedSkills,
          languages: languages.split(",").map((l) => l.trim()).filter(Boolean),
          location: { area, city, lat: 0, lng: 0 },
          availability: { weekdays, weekends, hoursPerWeek, preferredTime },
          maxActiveTasks: 3,
        });
      }

      // 4. Redirect with full reload so AuthContext picks up the new role from DB
      window.location.href = role === "admin" ? "/dashboard" : "/my-tasks";
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Registration failed.";
      setError(
        msg.includes("email-already-in-use")
          ? "An account with this email already exists."
          : msg
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-10">
      <div className="w-full max-w-md mx-auto">
        {/* Back Button */}
        <button
          onClick={() => step === 2 ? setStep(1) : router.back()}
          className="mb-6 flex items-center gap-1 text-sm font-medium text-teal-600 hover:text-teal-400 transition-colors bg-transparent border-none"
        >
          <ChevronLeft size={16} />
          Back
        </button>

        {/* Logo */}
        <div className="text-center mb-6">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-xl bg-teal-600 mb-4">
            <span className="text-white font-bold text-lg">S</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
          <p className="text-sm text-gray-500 mt-1">
            {step === 1 ? "Step 1 of 2: Account details" : "Step 2 of 2: Volunteer profile"}
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex gap-2 mb-6">
          {[1, 2].map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                s <= step ? "bg-teal-600" : "bg-gray-200"
              }`}
            />
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          {error && (
            <div
              role="alert"
              className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 mb-4"
            >
              {error}
            </div>
          )}

          {/* ── Step 1 ── */}
          {step === 1 && (
            <form onSubmit={handleStep1Submit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="name" className="text-sm font-medium text-gray-700">Full Name</label>
                <input
                  id="name" type="text" required value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-11 rounded-lg border border-gray-300 px-3 text-base focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Your full name"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="reg-email" className="text-sm font-medium text-gray-700">Email</label>
                <input
                  id="reg-email" type="email" required value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-11 rounded-lg border border-gray-300 px-3 text-base focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="you@example.com"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="reg-password" className="text-sm font-medium text-gray-700">Password</label>
                <input
                  id="reg-password" type="password" required minLength={6} value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-11 rounded-lg border border-gray-300 px-3 text-base focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Minimum 6 characters"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="org" className="text-sm font-medium text-gray-700">Organization</label>
                <input
                  id="org" type="text" required value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  className="w-full h-11 rounded-lg border border-gray-300 px-3 text-base focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="NGO or organization name"
                />
              </div>

              {/* Role selection */}
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-gray-700">I am a…</span>
                <div className="grid grid-cols-2 gap-3">
                  {(["volunteer", "admin"] as Role[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`h-11 rounded-lg border text-sm font-medium transition-colors ${
                        role === r
                          ? "border-teal-600 bg-teal-50 text-teal-700"
                          : "border-gray-300 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {r === "admin" ? "Coordinator" : "Volunteer"}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full h-11 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg text-base transition-colors mt-2"
              >
                {role === "volunteer" ? "Next: Profile Details" : "Create Account"}
              </button>

              <p className="text-center text-sm text-gray-500">
                Already have an account?{" "}
                <Link href="/login" className="text-teal-600 font-medium hover:underline">Sign in</Link>
              </p>
            </form>
          )}

          {/* ── Step 2 (volunteer only) ── */}
          {step === 2 && (
            <form
              onSubmit={(e) => { e.preventDefault(); handleFinalSubmit(); }}
              className="flex flex-col gap-4"
            >
              <div className="flex flex-col gap-1.5">
                <label htmlFor="phone" className="text-sm font-medium text-gray-700">Phone Number</label>
                <input
                  id="phone" type="tel" required value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full h-11 rounded-lg border border-gray-300 px-3 text-base focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="+91 XXXXX XXXXX"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="area" className="text-sm font-medium text-gray-700">Area</label>
                  <input
                    id="area" type="text" required value={area}
                    onChange={(e) => setArea(e.target.value)}
                    className="w-full h-11 rounded-lg border border-gray-300 px-3 text-base focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="e.g. Kurla"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="city" className="text-sm font-medium text-gray-700">City</label>
                  <input
                    id="city" type="text" required value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full h-11 rounded-lg border border-gray-300 px-3 text-base focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="e.g. Mumbai"
                  />
                </div>
              </div>

              {/* Skills multi-select */}
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium text-gray-700">Skills (select all that apply)</span>
                <div className="flex flex-wrap gap-2">
                  {SKILL_OPTIONS.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => toggleSkill(value)}
                      className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                        selectedSkills.includes(value)
                          ? "border-teal-600 bg-teal-50 text-teal-700"
                          : "border-gray-300 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="languages" className="text-sm font-medium text-gray-700">Languages (comma-separated)</label>
                <input
                  id="languages" type="text" value={languages}
                  onChange={(e) => setLanguages(e.target.value)}
                  className="w-full h-11 rounded-lg border border-gray-300 px-3 text-base focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Hindi, English, Marathi"
                />
              </div>

              {/* Availability */}
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium text-gray-700">Availability</span>
                <div className="flex gap-3">
                  {[
                    { key: "weekdays", label: "Weekdays", val: weekdays, set: setWeekdays },
                    { key: "weekends", label: "Weekends", val: weekends, set: setWeekends },
                  ].map(({ key, label, val, set }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => set(!val)}
                      className={`flex-1 h-11 rounded-lg border text-sm font-medium transition-colors ${
                        val ? "border-teal-600 bg-teal-50 text-teal-700" : "border-gray-300 text-gray-600"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="hours" className="text-sm font-medium text-gray-700">Hours / week</label>
                  <input
                    id="hours" type="number" min={1} max={40} value={hoursPerWeek}
                    onChange={(e) => setHoursPerWeek(Number(e.target.value))}
                    className="w-full h-11 rounded-lg border border-gray-300 px-3 text-base focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="pref-time" className="text-sm font-medium text-gray-700">Preferred Time</label>
                  <select
                    id="pref-time"
                    value={preferredTime}
                    onChange={(e) => setPreferredTime(e.target.value)}
                    className="w-full h-11 rounded-lg border border-gray-300 px-3 text-base focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                  >
                    {PREFERRED_TIMES.map(({ value, label }) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 h-11 border border-gray-300 text-gray-600 font-medium rounded-lg text-base hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 h-11 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-semibold rounded-lg text-base transition-colors flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Creating…
                    </>
                  ) : (
                    "Create Account"
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
