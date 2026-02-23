// Tailwind theme configuration for Calm Table design tokens.
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        tableBrown: '#5C4033',
        tableBrownLight: '#6D4C41',
        woodAccent: '#D2B48C',
        cream: '#FDFBF7',
        warmGray: '#F5F0EA',
      },
      fontFamily: {
        heading: ['var(--font-playfair)', 'serif'],
        body: ['var(--font-inter)', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 10px 30px -12px rgba(92, 64, 51, 0.35)',
      },
    },
  },
  plugins: [],
};

export default config;
