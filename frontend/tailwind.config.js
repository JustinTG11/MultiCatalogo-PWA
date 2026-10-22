/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      screens: {
        // Breakpoint extra para móviles grandes (los demás son los de Tailwind:
        // sm 640 / md 768 / lg 1024 / xl 1280 / 2xl 1536)
        xs: "480px",
      },
    },
  },
  plugins: [],
};
