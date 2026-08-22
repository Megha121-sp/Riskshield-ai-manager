/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        risk: {
          low: '#10b981',
          medium: '#f59e0b',
          high: '#ef4444',
          critical: '#dc2626'
        },
        slate: {
          850: '#151f32',
          900: '#0f172a',
          950: '#090d16'
        }
      }
    },
  },
  plugins: [],
}
