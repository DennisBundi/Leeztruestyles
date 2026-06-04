/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";

jest.mock("next/image", () => ({
  __esModule: true,
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
}));
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));
jest.mock("@/store/cartStore", () => ({
  useCartStore: () => ({ addItem: jest.fn(), items: [] }),
}));
jest.mock("@/components/cart/CartAnimationProvider", () => ({
  useCartAnimationContext: () => ({ triggerAnimation: jest.fn() }),
}));

import ProductCard from "@/components/products/ProductCard";

const baseProduct = {
  id: "1",
  name: "Test Dress",
  description: "A dress",
  price: 2000,
  images: [],
  category_id: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

describe("ProductCard — China import", () => {
  it("does NOT show China badge for regular products", () => {
    render(<ProductCard product={{ ...baseProduct, is_china_import: false }} />);
    expect(screen.queryByText(/🇨🇳 China/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Ships in/i)).not.toBeInTheDocument();
  });

  it("shows China badge when is_china_import is true", () => {
    render(<ProductCard product={{ ...baseProduct, is_china_import: true }} />);
    expect(screen.getByText(/🇨🇳 China/i)).toBeInTheDocument();
  });

  it("shows lead time when is_china_import and lead_time_days are set", () => {
    render(
      <ProductCard
        product={{ ...baseProduct, is_china_import: true, lead_time_days: 21 }}
      />
    );
    expect(screen.getByText(/Ships in ~21 days/i)).toBeInTheDocument();
  });

  it("does not show lead time when lead_time_days is null", () => {
    render(
      <ProductCard
        product={{ ...baseProduct, is_china_import: true, lead_time_days: null }}
      />
    );
    expect(screen.queryByText(/Ships in/i)).not.toBeInTheDocument();
  });
});
