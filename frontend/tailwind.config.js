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
          50: '#f0f4f8',
          100: '#d9e2ec',
          200: '#bcccdc',
          300: '#9fb3c8',
          400: '#829ab1',
          500: '#627d98',
          600: '#486581',
          700: '#334e68',
          800: '#243b53',
          900: '#1e3a5f',
          950: '#102a43',
        },
        secondary: {
          50: '#fdf8e8',
          100: '#f5e6b8',
          200: '#eed58a',
          300: '#e6c35c',
          400: '#d4a843',
          500: '#c2932c',
          600: '#a67a1f',
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
        sidebar: '#1e3a5f',
        sidebarHover: '#243b53',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      spacing: {
        'sidebar': '280px',
        'header': '64px',
      },
    },
  },
  plugins: [],
}
