"use client";

import Link from "next/link";

export default function ImportationSection() {
  return (
    <section className="relative text-white py-16 md:py-24 overflow-hidden">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1600&q=80')",
        }}
      />
      {/* Dark overlay for text readability */}
      <div className="absolute inset-0 bg-black/50" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left: Text content */}
          <div className="animate-slide-up">
            <div className="inline-flex items-center gap-2 bg-white/20 border border-white/30 text-white px-4 py-2 rounded-full mb-6 text-sm font-semibold tracking-wide">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
              EARLY ACCESS
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
              Source Directly
              <br />
              <span className="text-white/80">from China</span>
            </h2>
            <p className="text-white/85 text-lg mb-8 max-w-lg leading-relaxed">
              Are you a Kenyan retailer? Get connected with verified Chinese
              suppliers. Browse our China-sourced collection and place a custom
              order for any product at competitive prices.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/products?china=true"
                className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-secondary text-white font-semibold transition-all hover:scale-105 shadow-lg hover:bg-secondary-dark"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                  />
                </svg>
                Shop Now
              </Link>
              <a
                href="/importation/status"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 border border-white/30 text-white font-semibold hover:bg-white/20 transition-all"
              >
                Check my status
              </a>
            </div>
          </div>

          {/* Right: SVG trade route illustration */}
          <div className="flex items-center justify-center animate-fade-in">
            <TradeRouteIllustration />
          </div>
        </div>
      </div>

    </section>
  );
}

function TradeRouteIllustration() {
  return (
    <svg
      viewBox="0 0 400 260"
      className="w-full max-w-md"
      aria-label="Kenya to China trade route"
    >
      <defs>
        <radialGradient id="glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="200" cy="130" rx="180" ry="110" fill="url(#glow)" />

      {/* Dotted trade arc */}
      <path
        d="M 80 180 Q 200 30 320 180"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2"
        strokeDasharray="8 6"
        opacity="0.7"
      />

      {/* Arrow at end of arc */}
      <polygon points="316,172 326,182 308,186" fill="#ffffff" opacity="0.7" />

      {/* Kenya node */}
      <circle cx="80" cy="180" r="28" fill="rgba(255,255,255,0.15)" stroke="#ffffff" strokeWidth="2" />
      <text x="80" y="175" textAnchor="middle" fontSize="20">🇰🇪</text>
      <text x="80" y="220" textAnchor="middle" fontSize="11" fill="#ffffff" fontWeight="600">
        KENYA
      </text>

      {/* China node */}
      <circle cx="320" cy="180" r="28" fill="rgba(255,255,255,0.15)" stroke="#ffffff" strokeWidth="2" />
      <text x="320" y="175" textAnchor="middle" fontSize="20">🇨🇳</text>
      <text x="320" y="220" textAnchor="middle" fontSize="11" fill="#ffffff" fontWeight="600">
        CHINA
      </text>

      {/* Shipping box in the middle */}
      <g transform="translate(176, 72)">
        <rect x="0" y="8" width="48" height="38" rx="4" fill="rgba(255,255,255,0.2)" stroke="#ffffff" strokeWidth="1.5" />
        <rect x="0" y="8" width="48" height="14" rx="4" fill="rgba(255,255,255,0.3)" stroke="#ffffff" strokeWidth="1.5" />
        <line x1="24" y1="8" x2="24" y2="46" stroke="#ffffff" strokeWidth="1" opacity="0.5" />
        <text x="24" y="38" textAnchor="middle" fontSize="14">📦</text>
      </g>

      {/* Floating sparkles */}
      <circle cx="150" cy="90" r="2" fill="#ffffff" opacity="0.8" />
      <circle cx="260" cy="80" r="2" fill="#ffffff" opacity="0.6" />
      <circle cx="200" cy="55" r="1.5" fill="#ffffff" opacity="0.7" />
    </svg>
  );
}
