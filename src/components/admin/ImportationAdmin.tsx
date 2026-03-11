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
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
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
          { label: "Total Applications", value: stats.total, color: "text-gray-900" },
          { label: "Pending Review", value: stats.pending, color: "text-amber-600" },
          { label: "Approved", value: stats.approved, color: "text-green-600" },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            className="bg-white rounded-xl p-5 shadow-sm border border-gray-100"
          >
            <p className="text-sm text-gray-500 mb-1">{label}</p>
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-wrap gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as Status | "all")}
          className="border border-gray-300 px-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="border border-gray-300 px-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">Loading applications…</div>
        ) : applications.length === 0 ? (
          <div className="p-12 text-center text-gray-400">No applications found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
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
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {applications.map((app) => (
                  <React.Fragment key={app.id}>
                    <tr className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900">{app.business_name}</p>
                        <p className="text-gray-500 text-xs">{app.full_name}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-gray-900">{app.email}</p>
                        <p className="text-gray-500 text-xs">{app.phone}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs font-medium rounded-full">
                          {app.goods_category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{app.monthly_order_value}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
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
                            className="text-xs text-gray-400 mt-1 max-w-[150px] truncate"
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
                      <tr key={`${app.id}-action`} className="bg-indigo-50">
                        <td colSpan={7} className="px-4 py-3">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-sm font-medium text-gray-700">
                              {pendingAction.status === "approved" ? "Approve" : "Reject"}{" "}
                              <strong>{app.business_name}</strong>?
                            </span>
                            <input
                              type="text"
                              value={noteInput}
                              onChange={(e) => setNoteInput(e.target.value)}
                              placeholder="Optional note to retailer…"
                              className="border border-gray-300 px-3 py-1.5 text-sm flex-1 min-w-[200px] focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                              className="px-4 py-1.5 bg-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-300"
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
