import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        grafite: {
          50: '#f6f6f7',
          100: '#e2e3e5',
          200: '#c4c6ca',
          300: '#9fa2a8',
          400: '#7b7f86',
          500: '#61656c',
          600: '#4d5056',
          700: '#3f4147',
          800: '#35373b',
          900: '#2d2f33',
          950: '#1a1b1e',
        },
        amarelo: {
          DEFAULT: '#F59E0B',
          light: '#FBBF24',
          dark: '#D97706',
        },
        laranja: {
          DEFAULT: '#EA580C',
          light: '#F97316',
          dark: '#C2410C',
        },
      },
    },
  },
  plugins: [],
}
export default config
