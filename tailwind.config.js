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
        sa: {
          black:   '#181818',
          surface: '#1C1D20',
          gray:    '#222326',
          white:   '#F4F5F8',
          green:   '#4ADE80',
          red:     '#F87171',
        },
      },
      fontFamily: {
        inter: ['var(--font-inter)', 'sans-serif'],
        mono:  ['var(--font-geist-mono)', 'Geist Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '6px',
      },
    },
  },
  plugins: [],
}
