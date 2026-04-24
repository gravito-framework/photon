/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{js,ts,jsx,tsx}', './src/views/app.html'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Outfit', 'sans-serif'],
        mono: ['Fira Code', 'monospace'],
      },
      colors: {
        singularity: '#00f0ff', // Cyan
        photon: {
          light: '#e0faff',
          DEFAULT: '#00f0ff',
          dark: '#0066cc',
        },
        void: '#050505',
      },
    },
  },
  plugins: [],
}
