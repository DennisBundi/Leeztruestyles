"use client";

import { useRouter, useSearchParams } from "next/navigation";

export default function ChinaFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isChinaActive = searchParams.get("china") === "true";

  const navigate = (china: boolean) => {
    const params = new URLSearchParams(searchParams.toString());
    if (china) {
      params.set("china", "true");
    } else {
      params.delete("china");
    }
    params.delete("page");
    const qs = params.toString();
    router.push(qs ? `/products?${qs}` : "/products");
  };

  const baseClass =
    "px-5 py-2.5 text-sm font-semibold transition-all duration-200 border-2";
  const activeClass = "text-white border-transparent";
  const inactiveClass =
    "bg-white text-gray-600 border-gray-200 hover:border-[#EC4899]/40";

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => navigate(false)}
        className={`${baseClass} ${!isChinaActive ? `${activeClass} bg-[#EC4899]` : inactiveClass}`}
      >
        All Products
      </button>
      <button
        onClick={() => navigate(true)}
        className={`${baseClass} ${isChinaActive ? `${activeClass} bg-[#DB2777]` : inactiveClass}`}
      >
        🇨🇳 From China
      </button>
      {isChinaActive && (
        <span className="text-xs text-[#DB2777] font-medium ml-1">
          Showing China imports
          <button
            onClick={() => navigate(false)}
            className="ml-2 text-gray-400 hover:text-gray-600"
            aria-label="Clear China filter"
          >
            ×
          </button>
        </span>
      )}
    </div>
  );
}
