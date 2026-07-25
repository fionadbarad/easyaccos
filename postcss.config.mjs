// Tailwind v4 handles vendor prefixing itself, so @tailwindcss/postcss is the
// only plugin needed here. (This replaces the previous pair of postcss.config.js
// and postcss.config.mjs files, which declared two different plugin lists.)
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}
