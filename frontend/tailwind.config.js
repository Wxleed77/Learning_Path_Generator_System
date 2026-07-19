/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#EDEFE9",
        ink: "#1B1F1D",
        brass: "#B08A3E",
        indigo: "#33415C",
        oxblood: "#7A3B32",
      },
      fontFamily: {
        display: ['"Fraunces"', "serif"],
        body: ['"Inter"', "sans-serif"],
        mono: ['"IBM Plex Mono"', "monospace"],
      },
      keyframes: {
        stamp: {
          "0%": { transform: "rotate(-8deg) scale(1.8)", opacity: "0" },
          "60%": { transform: "rotate(-8deg) scale(0.95)", opacity: "1" },
          "100%": { transform: "rotate(-8deg) scale(1)", opacity: "1" },
        },
        scan: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(400%)" },
        },
        indeterminate: {
          "0%": { transform: "translateX(-100%)" },
          "50%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(-100%)" },
        },
      },
      animation: {
        stamp: "stamp 180ms ease-out",
      },
    },
  },
  plugins: [],
};
