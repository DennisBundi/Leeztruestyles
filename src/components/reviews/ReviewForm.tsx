"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import StarRating from "@/components/reviews/StarRating";
import { createClient } from "@/lib/supabase/client";

interface EligibleProduct {
  product_id: string;
  order_id: string;
}

interface ReviewFormProps {
  productId: string;
  onSubmitted?: () => void;
}

export default function ReviewForm({ productId, onSubmitted }: ReviewFormProps) {
  const [loading, setLoading] = useState(true);
  const [eligibility, setEligibility] = useState<EligibleProduct | null>(null);
  const [isSignedIn, setIsSignedIn] = useState(true);
  const [hasPurchased, setHasPurchased] = useState(true);

  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function checkEligibility() {
      try {
        const res = await fetch("/api/reviews/eligible");
        if (res.status === 401) {
          setIsSignedIn(false);
          setLoading(false);
          return;
        }
        if (!res.ok) {
          setLoading(false);
          return;
        }
        const json = await res.json();
        const products: EligibleProduct[] = json.data || json.products || [];
        const match = products.find((p: EligibleProduct) => p.product_id === productId);
        if (!match) {
          setHasPurchased(false);
        } else {
          setEligibility({ ...match });
        }
      } catch {
        setError("Failed to check review eligibility.");
      } finally {
        setLoading(false);
      }
    }
    checkEligibility();
  }, [productId]);

  useEffect(() => {
    return () => {
      photoPreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [photoPreviews]);

  const handlePhotoAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = 3 - photos.length;
    const newFiles = files.slice(0, remaining);
    const newPreviews = newFiles.map((f) => URL.createObjectURL(f));
    setPhotos((prev) => [...prev, ...newFiles]);
    setPhotoPreviews((prev) => [...prev, ...newPreviews]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removePhoto = (index: number) => {
    URL.revokeObjectURL(photoPreviews[index]);
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eligibility || rating === 0 || text.length < 20) return;

    setSubmitting(true);
    setError("");

    try {
      // Upload photos to Supabase storage if any
      const uploadedUrls: string[] = [];
      if (photos.length > 0) {
        const supabase = createClient();
        for (const photo of photos) {
          const ext = photo.name.split(".").pop() || "jpg";
          const fileName = `reviews/${productId}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from("review-images")
            .upload(fileName, photo, { contentType: photo.type });
          if (uploadError) {
            console.error("Photo upload error:", uploadError);
            continue;
          }
          const { data: urlData } = supabase.storage
            .from("review-images")
            .getPublicUrl(uploadData.path);
          if (urlData?.publicUrl) {
            uploadedUrls.push(urlData.publicUrl);
          }
        }
      }

      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: productId,
          order_id: eligibility.order_id,
          rating,
          text,
          image_urls: uploadedUrls,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to submit review.");
      }

      setSubmitted(true);
      onSubmitted?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to submit review.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="animate-pulse flex flex-col gap-3">
          <div className="h-6 bg-gray-200 rounded w-1/3" />
          <div className="h-4 bg-gray-200 rounded w-1/2" />
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 text-center">
        <p className="text-gray-600 mb-2">Sign in to write a review</p>
        <Link
          href="/sign-in"
          className="text-[#f472b6] hover:text-[#f9a8d4] font-semibold underline"
        >
          Sign in
        </Link>
      </div>
    );
  }

  if (!hasPurchased) {
    return null;
  }

  if (submitted) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 text-center">
        <div className="text-green-600 mb-2">
          <svg
            className="w-10 h-10 mx-auto"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <p className="text-gray-700 font-semibold">Review submitted!</p>
        <p className="text-gray-500 text-sm mt-1">
          It will be visible after admin approval.
        </p>
      </div>
    );
  }

  const canSubmit = rating > 0 && text.length >= 20 && !submitting;
  const pointsText = photos.length > 0 ? "Earn 100 pts (with photo)" : "Earn 50 pts";

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-1">
        Write a Review — Earn up to 100 pts
      </h3>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
        {/* Star Rating */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Rating
          </label>
          <StarRating rating={rating} onChange={setRating} size="lg" />
        </div>

        {/* Review Text */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Your Review
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Share your experience with this product..."
            rows={4}
            className="w-full border border-gray-300 rounded-lg p-3 text-sm text-gray-900 focus:ring-2 focus:ring-[#f9a8d4] focus:border-[#f9a8d4] outline-none resize-none"
          />
          <p
            className={`text-xs mt-1 ${text.length >= 20 ? "text-green-600" : "text-gray-400"}`}
          >
            {text.length}/20 minimum characters
          </p>
        </div>

        {/* Photo Upload */}
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handlePhotoAdd}
          />
          {photos.length < 3 && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-4 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-[#f472b6] hover:text-[#f472b6] transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z"
                />
              </svg>
              Upload Fit Pics (+50 bonus pts)
            </button>
          )}

          {photoPreviews.length > 0 && (
            <div className="flex gap-2 mt-3">
              {photoPreviews.map((src, i) => (
                <div key={i} className="relative w-20 h-20">
                  <img
                    src={src}
                    alt={`Upload preview ${i + 1}`}
                    className="w-full h-full object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs leading-none hover:bg-red-600"
                  >
                    X
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Points Indicator */}
        <p className="text-sm text-[#f472b6] font-semibold">{pointsText}</p>

        {/* Error */}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {/* Submit */}
        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full bg-[#f472b6] text-white py-3 rounded-none font-semibold hover:bg-[#f9a8d4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <span className="inline-flex items-center gap-2">
              <svg
                className="animate-spin w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Submitting...
            </span>
          ) : (
            "Submit Review"
          )}
        </button>
      </form>
    </div>
  );
}
