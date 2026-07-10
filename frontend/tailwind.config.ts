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
        brand: {
          600: '#4F46E5',
          500: '#60A5FA',
        },
        surface: {
          bg: '#FFFFFF',
          card: '#FFFFFF',
          border: '#E7EAF2',
        },
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
        glow: '0 0 0 1px rgba(79, 70, 229, 0.08), 0 18px 60px rgba(15, 23, 42, 0.12)',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '100% 50%' },
        },
        glowSweep: {
          '0%': { opacity: '0.0', transform: 'translateX(-10%)' },
          '35%': { opacity: '0.35' },
          '100%': { opacity: '0.0', transform: 'translateX(110%)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '0.45', transform: 'scale(0.98)' },
          '50%': { opacity: '1', transform: 'scale(1.02)' },
        },
      },
      animation: {
        fadeUp: 'fadeUp 0.6s ease-out both',
        float: 'float 6s ease-in-out infinite',
        shimmer: 'shimmer 7s linear infinite',
        glowSweep: 'glowSweep 2.4s ease-in-out infinite',
        pulseSoft: 'pulseSoft 2.2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
