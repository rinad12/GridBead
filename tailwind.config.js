/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        studio: {
          bg: 'var(--studio-bg)',
          panel: 'var(--studio-panel)',
          border: 'var(--studio-border)',
          accent: 'var(--studio-accent)',
          'accent-hover': 'var(--studio-accent-hover)',
          text: 'var(--studio-text)',
          muted: 'var(--studio-muted)',
        },
      },
    },
  },
  plugins: [],
};
