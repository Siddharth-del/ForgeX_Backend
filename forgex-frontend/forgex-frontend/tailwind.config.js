/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#16161A',
        steel: '#5B5F66',
        mist: '#8A8E95',
        line: '#E4E4E1',
        paper: '#F5F5F3',
        forge: { DEFAULT: '#C8102E', dark: '#A00D25', tint: '#FDECEE' },
        ok: { DEFAULT: '#1F7A4D', tint: '#E8F4EE' },
        warn: { DEFAULT: '#9A6100', tint: '#FBF2E1' },
      },
      fontFamily: {
        display: ['Oswald', '"Arial Narrow"', 'Arial', 'sans-serif'],
        sans: ['Jost', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      borderRadius: { sm: '2px', DEFAULT: '4px' },
      maxWidth: { page: '1280px' },
      keyframes: {
        shimmer: { '0%': { backgroundPosition: '-400px 0' }, '100%': { backgroundPosition: '400px 0' } },
        toastIn: { '0%': { opacity: 0, transform: 'translateY(8px)' }, '100%': { opacity: 1, transform: 'none' } },
      },
      animation: {
        shimmer: 'shimmer 1.3s linear infinite',
        toastIn: 'toastIn .18s ease-out',
      },
    },
  },
  plugins: [],
};
