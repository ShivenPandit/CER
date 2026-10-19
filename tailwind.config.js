/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx,js,jsx,html}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bae0fd',
          300: '#7cc5fb',
          400: '#38a5f6',
          500: '#0e86d4',
          600: '#026aa7',
          700: '#035587',
          800: '#074870',
          900: '#0b3c5d',
          950: '#07263e',
        },
        corporate: {
          navy: '#0f172a',
          slate: '#1e293b',
          muted: '#64748b',
          light: '#f8fafc',
          card: '#ffffff',
          border: '#e2e8f0',
          accent: '#2563eb',
          hover: '#1d4ed8'
        }
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
        'elevated': '0 10px 15px -3px rgba(0, 0, 0, 0.07), 0 4px 6px -2px rgba(0, 0, 0, 0.04)',
      }
    },
  },
  plugins: [],
};
