import { render, screen } from "@testing-library/react";
import HeroSection from "@/components/home/HeroSection";

jest.mock("next/link", () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

describe("HeroSection", () => {
  it("renders three panels with correct destinations", () => {
    render(<HeroSection />);
    const links = screen.getAllByRole("link");
    const hrefs = links.map((l) => l.getAttribute("href"));
    expect(hrefs).toContain("/products?sort=newest");
    expect(hrefs).toContain("/products");
    expect(hrefs).toContain("/products?china=true");
  });

  it("renders panel headlines", () => {
    render(<HeroSection />);
    expect(screen.getByText(/Love at First Try/i)).toBeInTheDocument();
    expect(screen.getByText(/Your New Daily Fix/i)).toBeInTheDocument();
    expect(screen.getByText(/Shop from China/i)).toBeInTheDocument();
  });

  it("renders 🇨🇳 flag and NEW badge only on the China panel", () => {
    render(<HeroSection />);
    // Flag emoji appears once (on the China panel)
    const flags = screen.getAllByText("🇨🇳");
    expect(flags).toHaveLength(1);
    // NEW badge appears once
    expect(screen.getByText(/● NEW/i)).toBeInTheDocument();
  });
});
