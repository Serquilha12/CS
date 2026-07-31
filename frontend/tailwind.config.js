/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        carrot: {
          DEFAULT: '#EF8F00',
          hover: '#d67e00',
          light: '#fff4e5',
        },
        persian: {
          DEFAULT: '#0038BC',
          hover: '#002ca4',
          dark: '#001e82',
          light: '#e6edfc',
        },
        platinum: {
          DEFAULT: '#EEEEEE',
          dark: '#e0e0e0',
          light: '#f5f5f5',
        },
        ucm: {
          emerald: '#0038BC', // Atualizado para Persian Blue como cor principal da UCM
          darkEmerald: '#002ca4',
          lightEmerald: '#e6edfc',
          carrot: '#EF8F00',
          persianBlue: '#0038BC',
          platinum: '#EEEEEE',
          navy: '#1e293b',
          bgLight: '#f8fafc'
        }
      }
    },
  },
  plugins: [],
}
