"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { PRODUCT_COLORS, getColorHex } from "@/lib/utils/colors";

interface ColorFilterProps {
  availableColors: string[];
}

export default function ColorFilter({ availableColors }: ColorFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedColor = searchParams.get("color");

  const handleColorChange = (color: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (color && color.trim() !== "") {
      params.set("color", color);
    } else {
      params.delete("color");
    }
    params.delete("page"); // Reset to page 1 by removing page param

    // If there are no params left, navigate to /products without query string
    const queryString = params.toString();
    router.push(queryString ? `/products?${queryString}` : "/products");
  };

  if (availableColors.length === 0) {
    return null; // Don't show filter if no colors available
  }

  return (
    <div className="flex items-center gap-2">
      <label className="font-medium text-gray-700">Color:</label>
      <div className="flex items-center gap-2 bg-white border-2 border-gray-200 rounded-xl p-1 shadow-sm min-w-[180px]">
        <select
          value={selectedColor || ""}
          onChange={(e) => handleColorChange(e.target.value || null)}
          className="flex-1 px-3 py-2 border-0 focus:outline-none focus:ring-0 text-sm font-medium appearance-none bg-transparent"
        >
          <option value="">All Colors</option>
          {availableColors.map((color) => (
            <option key={color} value={color}>
              {color}
            </option>
          ))}
        </select>
        {selectedColor && (
          <div
            className="w-6 h-6 rounded-full border border-gray-300 shadow-sm flex-shrink-0"
            style={{ backgroundColor: getColorHex(selectedColor) }}
            title={selectedColor}
          />
        )}
      </div>
    </div>
  );
}


