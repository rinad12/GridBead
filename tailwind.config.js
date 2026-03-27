/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        studio: {
          bg:           'var(--studio-bg)',
          panel:        'var(--studio-panel)',
          border:       'var(--studio-border)',
          accent:       'var(--studio-accent)',
          'accent-hover': 'var(--studio-accent-hover)',
          text:         'var(--studio-text)',
          muted:        'var(--studio-muted)',
        },
      },
      boxShadow: {
        'panel': 'var(--shadow-md)',
        'lg-theme': 'var(--shadow-lg)',
        'glow-pink': '0 0 20px var(--glow-pink)',
      },
      borderRadius: {
        'xl':  '12px',
        '2xl': '16px',
        '3xl': '20px',
      },
    },
  },
  plugins: [],
};
