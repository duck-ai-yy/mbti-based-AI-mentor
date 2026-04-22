import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        mbti: {
          nt: '#7c3aed',
          nf: '#ea580c',
          sj: '#0891b2',
          sp: '#16a34a',
        },
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '"LXGW WenKai"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
