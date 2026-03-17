"use client";

import { useEffect, useState, useCallback } from "react";
import StarRating from "@/components/reviews/StarRating";
import TierBadge from "@/components/loyalty/TierBadge";

interface ModerationReview {
  id: string;
  product_id: string;
  product_name: string;
  product_image?: string;
  reviewer_name: string;
  reviewer_email: string;
  reviewer_tier: string;
  rating: number;
  text: string;
  image_urls: string[];
  status: "pending" | "approved" | "rejected";
  rejection_count?: number;
  created_at: string;
}

interface Stats {
  pending: number;
  approved: number;
  rejected: number;
}

type FilterTab = "pending" | "approved" | "rejected" | "all";

const REJECTION_REASONS = [
  { value: "inappropriate_content", label: "Inappropriate content" },
  { value: "spam_low_effort", label: "Spam / low effort" },
  { value: "not_relevant", label: "Not relevant to product" },
];

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

export default function ReviewModeration() {
  const [reviews, setReviews] = useState<ModerationReview[]>([]);
  const [stats, setStats] = useState<Stats>({ pending: 0, approved: 0, rejected: 0 });
  const [activeTab, setActiveTab] = useState<FilterTab>("pending");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [selectedReason, setSelectedReason] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const statusParam = `?status=${activeTab}`;
      const res = await fetch(`/api/reviews/pending${statusParam}`);
      if (!res.ok) {
        setReviews([]);
        return;
      }
      const data = await res.json();
      const reviewsList = data.data || data.reviews || (Array.isArray(data) ? data : []);
      setReviews(Array.isArray(reviewsList) ? reviewsList : []);
      if (data.stats) {
        setStats(data.stats);
      }
    } catch {
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleApprove = async (reviewId: string) => {
    setActionLoading((prev) => ({ ...prev, [reviewId]: true }));
    try {
      const res = await fetch(`/api/reviews/${reviewId}/moderate`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });
      if (!res.ok) throw new Error("Failed to approve");
      setToast({ message: "Review approved successfully", type: "success" });
      fetchReviews();
    } catch {
      setToast({ message: "Failed to approve review", type: "error" });
    } finally {
      setActionLoading((prev) => ({ ...prev, [reviewId]: false }));
    }
  };

  const handleReject = async (reviewId: string) => {
    if (!selectedReason) return;
    setActionLoading((prev) => ({ ...prev, [reviewId]: true }));
    try {
      const res = await fetch(`/api/reviews/${reviewId}/moderate`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reject",
          rejection_reason: selectedReason,
        }),
      });
      if (!res.ok) throw new Error("Failed to reject");
      setToast({ message: "Review rejected", type: "success" });
      setRejectingId(null);
      setSelectedReason("");
      fetchReviews();
    } catch {
      setToast({ message: "Failed to reject review", type: "error" });
    } finally {
      setActionLoading((prev) => ({ ...prev, [reviewId]: false }));
    }
  };

  const tabs: { key: FilterTab; label: string; count?: number }[] = [
    { key: "pending", label: "Pending", count: stats.pending },
    { key: "approved", label: "Approved", count: stats.approved },
    { key: "rejected", label: "Rejected", count: stats.rejected },
    { key: "all", label: "All" },
  ];

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium ${
            toast.type === "success" ? "bg-green-600" : "bg-red-600"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-yellow-500">{stats.pending}</p>
          <p className="text-sm text-white/50">Pending</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
          <p className="text-sm text-white/50">Approved</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-red-500">{stats.rejected}</p>
          <p className="text-sm text-white/50">Rejected</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex border-b border-white/10">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-[#f472b6] text-[#f472b6]"
                : "border-transparent text-white/50 hover:text-white"
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className="ml-1.5 px-1.5 py-0.5 text-xs rounded-full bg-white/10">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Review List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card p-6">
              <div className="animate-pulse flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded" />
                  <div className="flex-1">
                    <div className="h-4 bg-white/20 rounded w-1/3 mb-2" />
                    <div className="h-3 bg-white/20 rounded w-1/4" />
                  </div>
                </div>
                <div className="h-3 bg-white/20 rounded w-full" />
                <div className="h-3 bg-white/20 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : !Array.isArray(reviews) || reviews.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <p className="text-white/50">No reviews found for this filter.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="glass-card p-6"
            >
              {/* Product Info */}
              <div className="flex items-start gap-3 mb-4">
                {review.product_image && (
                  <img
                    src={review.product_image}
                    alt={review.product_name}
                    className="w-12 h-12 object-cover rounded"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white text-sm truncate">
                    {review.product_name}
                  </p>
                  <p className="text-xs text-white/40">
                    {formatDate(review.created_at)}
                  </p>
                </div>
                {/* Resubmission Badge */}
                {review.rejection_count != null && review.rejection_count > 0 && (
                  <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-orange-100 text-orange-700 rounded">
                    Resubmission (attempt {review.rejection_count + 1})
                  </span>
                )}
              </div>

              {/* Reviewer */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm text-white/70 font-medium">
                  {review.reviewer_name}
                </span>
                <span className="text-xs text-white/40">
                  {review.reviewer_email}
                </span>
                {review.reviewer_tier && (
                  <TierBadge tier={review.reviewer_tier as "bronze" | "silver" | "gold"} size="sm" />
                )}
              </div>

              {/* Rating + Text */}
              <div className="mb-3">
                <StarRating rating={review.rating} size="sm" readonly />
                <p className="text-sm text-white/70 mt-2 leading-relaxed">
                  {review.text}
                </p>
              </div>

              {/* Photo Thumbnails */}
              {review.image_urls && review.image_urls.length > 0 && (
                <div className="flex gap-2 mb-4">
                  {review.image_urls.map((url, i) => (
                    <img
                      key={i}
                      src={url}
                      alt={`Review photo ${i + 1}`}
                      className="w-16 h-16 object-cover rounded border border-white/10"
                    />
                  ))}
                </div>
              )}

              {/* Action Buttons (Pending only) */}
              {review.status === "pending" && (
                <div className="flex items-center gap-3 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    disabled={actionLoading[review.id]}
                    onClick={() => handleApprove(review.id)}
                    className="px-4 py-2 bg-green-600 text-white text-sm rounded-none font-semibold hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {actionLoading[review.id] ? "..." : "Approve"}
                  </button>

                  {rejectingId === review.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <select
                        value={selectedReason}
                        onChange={(e) => setSelectedReason(e.target.value)}
                        className="flex-1 text-sm border border-white/10 rounded px-2 py-2 text-white/70 bg-white/10 focus:ring-2 focus:ring-[#f9a8d4] focus:border-[#f9a8d4] outline-none"
                      >
                        <option value="">Select reason...</option>
                        {REJECTION_REASONS.map((reason) => (
                          <option key={reason.value} value={reason.value}>
                            {reason.label}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={!selectedReason || actionLoading[review.id]}
                        onClick={() => handleReject(review.id)}
                        className="px-4 py-2 bg-red-600 text-white text-sm rounded-none font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
                      >
                        {actionLoading[review.id] ? "..." : "Confirm"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRejectingId(null);
                          setSelectedReason("");
                        }}
                        className="px-3 py-2 text-sm text-white/50 hover:text-white"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setRejectingId(review.id)}
                      className="px-4 py-2 border border-red-300 text-red-600 text-sm rounded-none font-semibold hover:bg-red-50 transition-colors"
                    >
                      Reject
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
