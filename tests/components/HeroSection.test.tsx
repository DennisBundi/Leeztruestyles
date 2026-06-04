import { render, screen } from "@testing-library/react";

jest.mock("next/link", () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn().mockResolvedValue({
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ data: [], error: null }),
    }),
  }),
}));

import HeroSection from "@/components/home/HeroSection";

async function renderHeroSection() {
  const result = await HeroSection();
  render(result as React.ReactElement);
}

describe("HeroSection", () => {
  it("renders three panels with correct destinations", async () => {
    await renderHeroSection();
    const links = screen.getAllByRole("link");
    const hrefs = links.map((l) => l.getAttribute("href"));
    expect(hrefs).toContain("/products?sort=newest");
    expect(hrefs).toContain("/products");
    expect(hrefs).toContain("/products?china=true");
  });

  it("renders panel headlines", async () => {
    await renderHeroSection();
    expect(screen.getByText(/Love at First Try/i)).toBeInTheDocument();
    expect(screen.getByText(/Your New Daily Fix/i)).toBeInTheDocument();
    expect(screen.getByText(/Shop from China/i)).toBeInTheDocument();
  });

  it("renders CTA buttons for each panel", async () => {
    await renderHeroSection();
    expect(screen.getByText(/EXPLORE NOW/i)).toBeInTheDocument();
    expect(screen.getByText(/SHOP HERE/i)).toBeInTheDocument();
    expect(screen.getByText(/SHOP CHINA/i)).toBeInTheDocument();
  });
});
