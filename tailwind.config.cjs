/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        pureBlack: '#000000',
        darkPage: '#0d0e10',
        cardGray: '#111417',    // Superficie oscura para cards
        cardText: '#f6f3e8',    // Texto cálido legible sobre superficie oscura
        amberBtn: '#ffcc00',    // Amarillo principal
        amberHover: '#e6b800',
        borderLine: '#22252a'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [require('@tailwindcss/typography')],
}
