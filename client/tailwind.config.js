/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f0f5fe',
          100: '#dce7fc',
          200: '#b3c9f5',
          300: '#7aa0ea',
          400: '#4272d8',
          500: '#2554bc',
          600: '#1c449e',
          700: '#153280',
          800: '#102766',
          900: '#0d1f4e',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
      },
    },
  },
  plugins: [],
};

