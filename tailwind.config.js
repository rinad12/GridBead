/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        studio: {
          bg: '#0f0f1a',
          panel: '#1a1a2e',
          border: '#2d2d4e',
          accent: '#6c63ff',
          'accent-hover': '#5a52e0',
          text: '#e2e8f0',
          muted: '#718096',
        },
      },
    },
  },
  plugins: [],
};
