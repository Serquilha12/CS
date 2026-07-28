/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ucm: {
          emerald: '#059669', // Verde Esmeralda Principal
          darkEmerald: '#047857',
          lightEmerald: '#d1fae5',
          navy: '#1e293b',
          bgLight: '#f8fafc'
        }
      }
    },
  },
  plugins: [],
}
