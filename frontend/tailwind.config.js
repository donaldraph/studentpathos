/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'twin-primary': '#6366F1',
        'aws-orange': '#FF9900',
        'aws-squid': '#232F3E',
      },
      animation: {
        "confetti": "confetti 3s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
