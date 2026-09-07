import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#0d141c',
          900: '#121b26',
          800: '#182433',
          700: '#203044',
          600: '#2a3d55',
        },
        teal: {
          400: '#3ecfc4',
          500: '#2bb3a8',
          600: '#1f8f86',
        },
      },
    },
  },
  plugins: [],
};

export default config;
