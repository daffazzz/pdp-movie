/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'pdp-red': '#E50914',
        'pdp-black': '#141414',
        'pdp-dark-gray': '#181818',
        'pdp-light-gray': '#A9A9A9',
      },
      backgroundColor: {
        'primary': '#141414',
        'secondary': '#181818',
      },
      textColor: {
        'primary': '#FFFFFF',
        'secondary': '#A9A9A9',
      },
    },
  },
  plugins: [
    // Add tailwind-scrollbar-hide if it's installed
    require('tailwind-scrollbar-hide'),
  ],
} 