// Tailwind theme configuration for Calm Table design tokens.
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        tableBrown: 'rgb(var(--table-brown-rgb) / <alpha-value>)',
        tableBrownLight: 'rgb(var(--table-brown-light-rgb) / <alpha-value>)',
        woodAccent: 'rgb(var(--wood-accent-rgb) / <alpha-value>)',
        cream: 'rgb(var(--cream-rgb) / <alpha-value>)',
        warmGray: 'rgb(var(--warm-gray-rgb) / <alpha-value>)',
        ink: 'rgb(var(--ink-rgb) / <alpha-value>)',
        muted: 'rgb(var(--muted-rgb) / <alpha-value>)',
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
