import Link from "next/link";

interface HeroPanel {
  label: string;
  headline: string;
  sub: string;
  cta: string;
  href: string;
  image: string;
  fallbackBg: string;
  accentBar: string;
  glowColor: string;
  labelColor: string;
  labelBorder: string;
  ctaBorder: string;
  ctaBg: string;
  isChina?: boolean;
}

const panels: HeroPanel[] = [
  {
    label: "NEW IN",
    headline: "Love at\nFirst Try",
    sub: "Fresh drops, every week",
    cta: "EXPLORE NOW",
    href: "/products?sort=newest",
    image: "/images/hero-explore.jpg",
    fallbackBg: "linear-gradient(170deg,#1a0a12 0%,#3d1a2e 40%,#5e2244 100%)",
    accentBar: "linear-gradient(90deg,#f9a8d4,#EC4899)",
    glowColor: "rgba(249,168,212,0.18)",
    labelColor: "rgba(249,168,212,0.6)",
    labelBorder: "rgba(249,168,212,0.4)",
    ctaBorder: "#f9a8d4",
    ctaBg: "rgba(249,168,212,0.2)",
  },
  {
    label: "COLLECTION",
    headline: "Your New\nDaily Fix",
    sub: "The full collection",
    cta: "SHOP HERE",
    href: "/products",
    image: "/images/hero-shop.jpg",
    fallbackBg: "linear-gradient(170deg,#1a0818 0%,#3d0e30 40%,#6b1654 100%)",
    accentBar: "linear-gradient(90deg,#EC4899,#DB2777)",
    glowColor: "rgba(236,72,153,0.20)",
    labelColor: "rgba(244,114,182,0.8)",
    labelBorder: "rgba(236,72,153,0.4)",
    ctaBorder: "#EC4899",
    ctaBg: "rgba(236,72,153,0.2)",
  },
  {
    label: "DIRECT SOURCING",
    headline: "Shop from\nChina",
    sub: "Sourced directly, shipped to you",
    cta: "SHOP CHINA",
    href: "/products?china=true",
    image: "/images/hero-china.jpg",
    fallbackBg: "linear-gradient(170deg,#1a0008 0%,#4a0820 40%,#7c0a28 100%)",
    accentBar: "linear-gradient(90deg,#DB2777,#be123c)",
    glowColor: "rgba(219,39,119,0.25)",
    labelColor: "rgba(249,168,212,0.7)",
    labelBorder: "rgba(219,39,119,0.4)",
    ctaBorder: "#DB2777",
    ctaBg: "rgba(219,39,119,0.2)",
    isChina: true,
  },
];

export default function HeroSection() {
  return (
    <section className="flex flex-col md:flex-row min-h-[420px] md:h-[520px]">
      {panels.map((panel, i) => (
        <Link
          key={panel.href}
          href={panel.href}
          aria-label={`${panel.headline.replace(/\n/g, " ")} — ${panel.sub}`}
          className="relative flex-1 overflow-hidden group block"
          style={{ background: panel.fallbackBg }}
        >
          {/* Background image */}
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-500 group-hover:scale-105"
            style={{ backgroundImage: `url('${panel.image}')` }}
          />

          {/* Dark gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

          {/* Brand-colour radial glow */}
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(ellipse at 40% 25%, ${panel.glowColor} 0%, transparent 65%)`,
            }}
          />

          {/* Top accent bar */}
          <div
            className="absolute top-0 left-0 right-0 h-[3px]"
            style={{ background: panel.accentBar }}
          />

          {/* Divider (between panels, not after last) */}
          {i < panels.length - 1 && (
            <div className="absolute top-0 right-0 bottom-0 w-[1px] bg-white/10 z-10 hidden md:block" />
          )}

          {/* China-only: flag + NEW badge */}
          {panel.isChina && (
            <>
              <span className="absolute top-4 left-4 text-2xl opacity-60 z-10">
                🇨🇳
              </span>
              <span
                className="absolute top-4 right-4 z-10 text-[10px] font-bold tracking-widest px-2 py-1 rounded-full border"
                style={{
                  background: "rgba(219,39,119,0.2)",
                  borderColor: "rgba(219,39,119,0.5)",
                  color: "#f9a8d4",
                }}
              >
                ● NEW
              </span>
            </>
          )}

          {/* Label pill */}
          <div
            className="absolute top-4 left-4 z-10 text-[9px] font-bold tracking-[2px] px-3 py-1 rounded-full border"
            style={{
              background: `${panel.glowColor}`,
              borderColor: panel.labelBorder,
              color: panel.labelColor,
              display: panel.isChina ? "none" : undefined,
            }}
          >
            {panel.label}
          </div>

          {/* Text content */}
          <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
            <h2 className="text-2xl md:text-3xl font-extrabold text-white leading-tight mb-1 tracking-tight whitespace-pre-line">
              {panel.headline}
            </h2>
            <p className="text-white/65 text-xs mb-4">{panel.sub}</p>
            <span
              className="inline-block text-[10px] font-bold tracking-[1.5px] text-white px-3 py-2 border transition-all duration-200 group-hover:bg-white group-hover:text-gray-900"
              style={{
                borderColor: panel.ctaBorder,
                background: panel.ctaBg,
              }}
            >
              {panel.cta} →
            </span>
          </div>
        </Link>
      ))}
    </section>
  );
}
