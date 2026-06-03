/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        scout: {
          purple: "#4B1C82",
          gold: "#F5A623",
        },
      },
    },
  },
  plugins: [],
};
