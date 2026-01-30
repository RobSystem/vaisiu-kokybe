/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#ecf6f6",
          100: "#d9eeee",
          200: "#bad2d2",
          300: "#8fbaba",
          400: "#6ea1a1",
          500: "#207874",
          600: "#176b67",
          700: "#075858",
          800: "#064646",
          900: "#043333",
        },
      },
      fontSize: {
        xxs: "10px",
        xxxs: "9px",
      },
    },
  },
  plugins: [],
};
