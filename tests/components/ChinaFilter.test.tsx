/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from "@testing-library/react";

const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: jest.fn(() => new URLSearchParams()),
}));

import { useSearchParams } from "next/navigation";
import ChinaFilter from "@/components/filters/ChinaFilter";

beforeEach(() => {
  mockPush.mockClear();
  (useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams());
});

describe("ChinaFilter", () => {
  it("shows 'All Products' as active when no china param", () => {
    render(<ChinaFilter />);
    const allBtn = screen.getByRole("button", { name: /All Products/i });
    expect(allBtn.className).toMatch(/bg-\[#EC4899\]/);
  });

  it("renders the From China button", () => {
    render(<ChinaFilter />);
    expect(
      screen.getByRole("button", { name: /From China/i })
    ).toBeInTheDocument();
  });

  it("calls router.push with ?china=true when From China is clicked", () => {
    render(<ChinaFilter />);
    fireEvent.click(screen.getByRole("button", { name: /From China/i }));
    expect(mockPush).toHaveBeenCalledWith("/products?china=true");
  });

  it("calls router.push with /products when All Products is clicked while china is active", () => {
    (useSearchParams as jest.Mock).mockReturnValue(
      new URLSearchParams("china=true")
    );
    render(<ChinaFilter />);
    fireEvent.click(screen.getByRole("button", { name: /All Products/i }));
    expect(mockPush).toHaveBeenCalledWith("/products");
  });

  it("shows the active China state and clear label when china=true", () => {
    (useSearchParams as jest.Mock).mockReturnValue(
      new URLSearchParams("china=true")
    );
    render(<ChinaFilter />);
    expect(
      screen.getByRole("button", { name: /Clear China filter/i })
    ).toBeInTheDocument();
    const chinaBtn = screen.getByRole("button", { name: /From China/i });
    expect(chinaBtn.className).toMatch(/bg-\[#DB2777\]/);
  });
});
