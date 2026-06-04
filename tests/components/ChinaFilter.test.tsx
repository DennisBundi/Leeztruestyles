/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

import ChinaFilter from "@/components/filters/ChinaFilter";

describe("ChinaFilter", () => {
  it("shows 'All Products' as active when no china param", () => {
    render(<ChinaFilter />);
    const allBtn = screen.getByRole("button", { name: /All Products/i });
    expect(allBtn.className).toMatch(/bg-\[#EC4899\]/);
  });

  it("renders the From China button", () => {
    render(<ChinaFilter />);
    expect(screen.getByRole("button", { name: /From China/i })).toBeInTheDocument();
  });
});
