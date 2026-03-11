"use client";

import { useState } from "react";
import Link from "next/link";

type Status = "pending" | "approved" | "rejected";

interface ApplicationResult {
  status: Status;
  admin_note: string | null;
  email: string;
  created_at: string;
}

const STATUS_CONFIG: Record<
  Status,
  { color: string; bg: string; icon: string; title: string; message: string }
> = {
  pending: {
    color: "text-amber-700",
    bg: "bg-amber-50 border-amber-200",
    icon: "⏳",
    title: "Under Review",
    message: "Your application is under review. We'll be in touch soon.",
  },
  approved: {
    color: "text-green-700",
    bg: "bg-green-50 border-green-200",
    icon: "✅",
    title: "Approved!",
    message:
      "Congratulations! Your application has been approved. Expect a call from our team shortly.",
  },
  rejected: {
    color: "text-red-700",
    bg: "bg-red-50 border-red-200",
    icon: "❌",
    title: "Not Approved",
    message:
      "Thank you for your interest. Unfortunately we can't onboard you at this time.",
  },
};

export default function ImportationStatusPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ApplicationResult | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCheck(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setNotFound(false);
    setError(null);

    try {
      const res = await fetch(
        `/api/importation/status?email=${encodeURIComponent(email.trim())}`
      );
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      if (!res.ok) {
        setError("Something went wrong. Please try again.");
        return;
      }
      const json = await res.json();
      setResult(json.data);
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-6">
            <span className="text-2xl font-bold text-gray-900">Leeztruestyles</span>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Check Application Status
          </h1>
          <p className="text-gray-600">
            Enter your email to see your importation waitlist status.
          </p>
        </div>

        <div className="bg-white shadow-lg p-8">
          <form onSubmit={handleCheck} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="your@email.com"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-60"
            >
              {loading ? "Checking…" : "Check Status"}
            </button>
          </form>

          {notFound && (
            <div className="mt-6 p-4 bg-gray-50 border border-gray-200 text-center">
              <p className="text-gray-600 text-sm">
                No application found with this email. Please check and try again.
              </p>
            </div>
          )}

          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {result &&
            (() => {
              const config = STATUS_CONFIG[result.status];
              return (
                <div className={`mt-6 p-5 border ${config.bg}`}>
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{config.icon}</span>
                    <div className="flex-1">
                      <h3 className={`font-bold text-lg ${config.color}`}>
                        {config.title}
                      </h3>
                      <p className={`text-sm mt-1 ${config.color} opacity-90`}>
                        {config.message}
                      </p>
                      {result.admin_note && (
                        <p className="text-sm mt-3 text-gray-600 italic border-t border-gray-200 pt-2">
                          Note: {result.admin_note}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-3">
                        Applied:{" "}
                        {new Date(result.created_at).toLocaleDateString("en-KE", {
                          dateStyle: "long",
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}
        </div>

        <p className="text-center mt-6 text-sm text-gray-500">
          Haven&apos;t applied yet?{" "}
          <Link href="/" className="text-indigo-600 underline">
            Join the waitlist on our home page
          </Link>
        </p>
      </div>
    </div>
  );
}
