import type { Config } from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Inter', 'ui-sans-serif', 'system-ui'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
      },
      colors: {
        ink: {
          950: '#050816',
          900: '#09111f',
          850: '#0d1628',
          800: '#12203a',
        },
        cyan: {
          400: '#34d6ff',
          500: '#17b8ff',
          600: '#0d9de6',
        },
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(52, 214, 255, 0.12), 0 18px 60px rgba(0, 0, 0, 0.45)',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '0.45', transform: 'scale(0.98)' },
          '50%': { opacity: '1', transform: 'scale(1.02)' },
        },
      },
      animation: {
        fadeUp: 'fadeUp 0.6s ease-out both',
        pulseSoft: 'pulseSoft 2.2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
