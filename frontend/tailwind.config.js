/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eaf2f6',
          100: '#d3e6ee',
          200: '#add0dd',
          300: '#7fb5c8',
          400: '#4d96ae',
          500: '#2d7b96',
          600: '#176b8a',
          700: '#245b78',
          800: '#1b465e',
          900: '#173b57',
          950: '#102a3d',
        },
        secondary: {
          50: '#fdf8e8',
          100: '#f5e6b8',
          200: '#eed58a',
          300: '#e6c35c',
          400: '#d2a34b',
          500: '#c3913a',
          600: '#9b7028',
          700: '#8b6218',
          800: '#704c12',
          900: '#54380d',
        },
        success: {
          50: '#f0fdf4',
          500: '#22c55e',
          600: '#16a34a',
        },
        warning: {
          50: '#fffbeb',
          500: '#f59e0b',
          600: '#d97706',
        },
        danger: {
          50: '#fef2f2',
          500: '#ef4444',
          600: '#dc2626',
        },
        sidebar: '#173b57',
        sidebarHover: '#245b78',
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans Arabic', 'Segoe UI', 'system-ui', '-apple-system', 'sans-serif'],
      },
      spacing: {
        'sidebar': '264px',
        'header': '64px',
      },
      boxShadow: {
        panel: '0 1px 2px rgb(16 42 61 / 0.05), 0 10px 28px rgb(16 42 61 / 0.05)',
      },
    },
  },
  plugins: [],
}
