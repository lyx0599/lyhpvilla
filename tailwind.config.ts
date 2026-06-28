import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17202a",
        linen: "#f7f3ed",
        clay: "#c77f5b",
        moss: "#6e7f61"
      },
      boxShadow: {
        soft: "0 20px 60px rgba(23, 32, 42, 0.12)"
      }
    }
  },
  plugins: []
};

export default config;
