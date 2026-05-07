/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
    "!./node_modules/**",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"IBM Plex Sans"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'Menlo', 'monospace'],
        serif: ['"IBM Plex Serif"', 'Georgia', 'serif'],
      },
      colors: {
        // Primary — teal (replaces pear/lime)
        pear: {
          50:  '#eef7f6',
          100: '#d6ecea',
          200: '#a8d6d2',
          300: '#7ec0bb',
          400: '#4fa6a6',
          500: '#2f8585',
          600: '#246b6b',
          700: '#1c5252',
          800: '#143841',
          900: '#0b1a20',
          950: '#071014',
        },
        // Accent — gold (replaces stem/brown)
        stem: {
          50:  '#fbf6e8',
          100: '#f4e8c4',
          200: '#e9d394',
          300: '#dec074',
          400: '#d7b169',
          500: '#b8924a',
          600: '#927238',
          700: '#6b5326',
          800: '#4a3818',
          900: '#2e220e',
        },
        // Cream — light surface palette
        cream: {
          50:  '#fdfaf3',
          100: '#f8f3e7',
          200: '#f1e7d0',
          300: '#e6d8b3',
        },
        // Ink — dark neutral palette
        ink: {
          50:  '#eef3f5',
          100: '#dde7ea',
          200: '#b9cdd2',
          300: '#8aa3ab',
          400: '#5a7d88',
          500: '#355c69',
          600: '#1f4250',
          700: '#143841',
          800: '#0f2128',
          900: '#0b1a20',
        },
      },
    },
  },
  plugins: [],
};
