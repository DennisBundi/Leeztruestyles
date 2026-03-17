"use client";

import ReviewModeration from "@/components/reviews/ReviewModeration";

export default function ReviewModerationPage() {
  return (
    <div className="p-6 pt-16 lg:pt-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Review Moderation</h1>
        <p className="text-white/60 mt-1">
          Approve or reject customer reviews before they go live.
        </p>
      </div>
      <ReviewModeration />
    </div>
  );
}
