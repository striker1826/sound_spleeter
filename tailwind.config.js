/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "custom-gray": "#374151",
        "custom-dark": "#1F2937",
        "custom-darker": "#111827",
      },
    },
  },
  plugins: [],
  safelist: [
    "bg-[#374151]",
    "bg-[#1F2937]",
    "bg-[#111827]",
    "text-[#fff]",
    "text-[#9CA3AF]",
    "text-[#6B7280]",
    "border-[#4B5563]",
    "border-[#6B7280]",
  ],
};
