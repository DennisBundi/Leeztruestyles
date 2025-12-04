"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { Category } from "@/types";

interface CategoryFilterProps {
  categories: Category[];
}

export default function CategoryFilter({ categories }: CategoryFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedCategory = searchParams.get("category");

  const handleCategoryChange = (categorySlug: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (categorySlug && categorySlug.trim() !== "") {
      params.set("category", categorySlug);
    } else {
      params.delete("category");
    }
    params.delete("page"); // Reset to page 1 by removing page param

    // If there are no params left, navigate to /products without query string
    const queryString = params.toString();
    router.push(queryString ? `/products?${queryString}` : "/products");
  };

  // Find the selected category slug from the URL param
  const selectedCategorySlug = selectedCategory;
  const selectedCategoryObj = categories.find(
    (cat) => cat.slug === selectedCategorySlug
  );

  return (
    <div className="flex items-center gap-2">
      <label className="font-medium text-gray-700">Category:</label>
      <select
        value={selectedCategorySlug || ""}
        onChange={(e) => handleCategoryChange(e.target.value || null)}
        className="px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all bg-white shadow-sm font-medium min-w-[180px]"
      >
        <option value="">All Categories</option>
        {categories.map((category) => (
          <option key={category.id} value={category.slug}>
            {category.name}
          </option>
        ))}
      </select>
    </div>
  );
}
