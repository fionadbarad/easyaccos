/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        midnight: '#0B0F1A',
        midnightDeep: '#050816',
        plum: '#111827',
        plumLight: '#1f2937',
        gold: '#C2A368',
        goldMuted: 'rgba(194,163,104,0.55)',
        blue: '#3B82F6',
        white: '#E5E7EB',
        textMuted: 'rgba(229,231,235,0.65)',
      },
      fontFamily: {
        inter: ['var(--font-inter)', 'sans-serif'],
        playfair: ['var(--font-playfair)', 'serif'],
      },
    },
  },
  plugins: [],
}