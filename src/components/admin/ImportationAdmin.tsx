"use client";

import React, { useState, useEffect, useCallback } from "react";
import { GOODS_CATEGORIES } from "@/lib/constants/importation";
import type { Status } from "@/types/importation";

interface Application {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  business_name: string;
  goods_category: string;
  monthly_order_value: string;
  status: Status;
  admin_note: string | null;
  created_at: string;
}

interface Stats {
  total: number;
  pending: number;
  approved: number;
}

const STATUS_STYLES: Record<Status, string> = {
  pending: "bg-yellow-500/20 text-yellow-300",
  approved: "bg-green-500/20 text-green-300",
  rejected: "bg-red-500/20 text-red-300",
};

export default function ImportationAdmin() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, approved: 0 });
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [confirmingAppId, setConfirmingAppId] = useState<string | null>(null);
  const [noteInput, setNoteInput] = useState("");
  const [pendingAction, setPendingAction] = useState<{
    id: string;
    status: Status;
  } | null>(null);

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (categoryFilter !== "all") params.set("category", categoryFilter);

    try {
      const res = await fetch(`/api/importation/admin?${params}`);
      if (res.ok) {
        const json = await res.json() as { data: Application[]; stats: Stats };
        setApplications(json.data || []);
        setStats(json.stats || { total: 0, pending: 0, approved: 0 });
      } else {
        setFetchError("Failed to load applications.");
      }
    } catch {
      setFetchError("Network error. Could not load applications.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  async function handleUpdateStatus(id: string, status: Status, note: string): Promise<void> {
    setUpdateError(null);
    try {
      const res = await fetch("/api/importation/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, admin_note: note }),
      });
      if (res.ok) {
        setApplications((prev) =>
          prev.map((app) =>
            app.id === id ? { ...app, status, admin_note: note || null } : app
          )
        );
      } else {
        setUpdateError("Failed to update application. Please try again.");
      }
    } catch {
      setUpdateError("Network error. Could not update application.");
    } finally {
      setConfirmingAppId(null);
      setPendingAction(null);
      setNoteInput("");
    }
  }

  return (
    <div className="space-y-6">
      {fetchError && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
          {fetchError}
        </div>
      )}
      {updateError && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
          {updateError}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Applications", value: stats.total, color: "text-white" },
          { label: "Pending Review", value: stats.pending, color: "text-amber-600" },
          { label: "Approved", value: stats.approved, color: "text-green-600" },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            className="glass-card p-5"
          >
            <p className="text-sm text-white/50 mb-1">{label}</p>
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="glass-card p-4 flex flex-wrap gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as Status | "all")}
          className="bg-white/10 border border-white/20 text-white px-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-400/50"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="bg-white/10 border border-white/20 text-white px-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-400/50"
        >
          <option value="all">All Categories</option>
          {GOODS_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-white/40">Loading applications…</div>
        ) : applications.length === 0 ? (
          <div className="p-12 text-center text-white/40">No applications found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-black/20 border-b border-white/10">
                <tr>
                  {[
                    "Business",
                    "Contact",
                    "Category",
                    "Monthly Value",
                    "Date",
                    "Status",
                    "Actions",
                  ].map((header) => (
                    <th
                      key={header}
                      className="px-4 py-3 text-left text-xs font-semibold text-white/50 uppercase tracking-wide"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {applications.map((app) => (
                  <React.Fragment key={app.id}>
                    <tr className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-white">{app.business_name}</p>
                        <p className="text-white/50 text-xs">{app.full_name}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-white">{app.email}</p>
                        <p className="text-white/50 text-xs">{app.phone}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs font-medium rounded-full">
                          {app.goods_category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-white/60">{app.monthly_order_value}</td>
                      <td className="px-4 py-3 text-white/50 text-xs">
                        {new Date(app.created_at).toLocaleDateString("en-KE")}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full capitalize ${STATUS_STYLES[app.status]}`}
                        >
                          {app.status}
                        </span>
                        {app.admin_note && (
                          <p
                            className="text-xs text-white/40 mt-1 max-w-[150px] truncate"
                            title={app.admin_note}
                          >
                            {app.admin_note}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {app.status !== "approved" && (
                            <button
                              onClick={() => {
                                setConfirmingAppId(app.id);
                                setPendingAction({ id: app.id, status: "approved" });
                                setNoteInput("");
                              }}
                              className="px-3 py-1 bg-green-600 text-white text-xs font-medium hover:bg-green-700 transition-colors"
                            >
                              Approve
                            </button>
                          )}
                          {app.status !== "rejected" && (
                            <button
                              onClick={() => {
                                setConfirmingAppId(app.id);
                                setPendingAction({ id: app.id, status: "rejected" });
                                setNoteInput("");
                              }}
                              className="px-3 py-1 bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition-colors"
                            >
                              Reject
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {/* Inline confirmation panel */}
                    {confirmingAppId === app.id && pendingAction && (
                      <tr key={`${app.id}-action`} className="bg-black/20">
                        <td colSpan={7} className="px-4 py-3">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-sm font-medium text-white/80">
                              {pendingAction.status === "approved" ? "Approve" : "Reject"}{" "}
                              <strong>{app.business_name}</strong>?
                            </span>
                            <input
                              type="text"
                              value={noteInput}
                              onChange={(e) => setNoteInput(e.target.value)}
                              placeholder="Optional note to retailer…"
                              className="bg-white/10 border border-white/20 text-white placeholder:text-white/40 px-3 py-1.5 text-sm flex-1 min-w-[200px] focus:outline-none focus:ring-2 focus:ring-rose-400/50"
                            />
                            <button
                              onClick={() =>
                                handleUpdateStatus(
                                  pendingAction.id,
                                  pendingAction.status,
                                  noteInput
                                )
                              }
                              className="px-4 py-1.5 bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => {
                                setConfirmingAppId(null);
                                setPendingAction(null);
                              }}
                              className="px-4 py-1.5 bg-white/10 text-white/80 text-sm font-medium hover:bg-white/20"
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
