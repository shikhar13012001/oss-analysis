/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Surface ladder — #07080a → #0d0d0d → #101111 → #121212
        canvas:             "#07080a",
        surface:            "#0d0d0d",
        "surface-elevated": "#101111",
        "surface-card":     "#121212",
        hairline:           "#242728",
        // Text scale
        ink:  "#f4f4f6",
        body: "#cdcdcd",
        mute: "#9c9c9d",
        ash:  "#6a6b6c",
        // Semantic accents (illustrations only — never on chrome)
        "accent-blue":   "#57c1ff",
        "accent-red":    "#ff6161",
        "accent-green":  "#59d499",
        "accent-yellow": "#ffc533",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        // Design system radius scale (overrides Tailwind defaults for lg/xl)
        lg: "10px",
        xl: "16px",
      },
    },
  },
  plugins: [],
};
