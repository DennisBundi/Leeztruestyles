import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "#f9a8d4",
          dark: "#f472b6",
          light: "#fbcfe8",
        },
        secondary: {
          DEFAULT: "#EC4899",
          dark: "#DB2777",
          light: "#F472B6",
        },
      },
    },
  },
  plugins: [],
};
export default config;

