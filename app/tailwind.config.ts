import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: "var(--bg-primary)",
          secondary: "var(--bg-secondary)",
          tertiary: "var(--bg-tertiary)",
          card: "var(--bg-card)",
          "card-hover": "var(--bg-card-hover)",
          modal: "var(--bg-modal)",
          overlay: "var(--bg-overlay)",
          input: "var(--bg-input)",
          header: "var(--bg-header)",
        },
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          tertiary: "var(--text-tertiary)",
          inverse: "var(--text-inverse)",
        },
        border: {
          primary: "var(--border-primary)",
          secondary: "var(--border-secondary)",
        },
        accent: {
          primary: "var(--accent-primary)",
          "primary-hover": "var(--accent-primary-hover)",
          secondary: "var(--accent-secondary)",
          semantic: "var(--accent-semantic)",
          keyword: "var(--accent-keyword)",
        },
        genre: {
          bg: "var(--genre-bg)",
          text: "var(--genre-text)",
          "bg-active": "var(--genre-bg-active)",
          "text-active": "var(--genre-text-active)",
        },
        rating: {
          star: "var(--rating-star)",
          bg: "var(--rating-bg)",
          text: "var(--rating-text)",
        },
      },
      fontFamily: {
        barlow: ["Barlow", "system-ui", "sans-serif"],
        display: ["Barlow", "system-ui", "sans-serif"],
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
      },
    },
  },
  plugins: [],
} satisfies Config;
