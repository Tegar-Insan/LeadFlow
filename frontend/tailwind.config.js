/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#E63946',
          dark:    '#c1121f',
          light:   '#ff6b74',
        },
        surface: {
          DEFAULT: '#111111',
          raised:   '#1a1a1a',
          overlay:  '#222222',
          border:   '#2a2a2a',
        },
        text: {
          primary:   '#f5f5f5',
          secondary: '#9ca3af',
          muted:     '#4b5563',
        },
      },
      fontFamily: {
        display: ['"Syne"',           'sans-serif'],
        body:    ['"DM Sans"',        'sans-serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
      },
      animation: {
        'fade-in':       'fadeIn 0.4s ease forwards',
        'slide-up':      'slideUp 0.4s cubic-bezier(0.16,1,0.3,1) forwards',
        'slide-up-fade': 'slideUpFade 0.4s cubic-bezier(0.16,1,0.3,1) forwards',
        'shake':         'shake 0.4s ease',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        slideUpFade: {
          from: { opacity: '0', transform: 'translateY(40px) scale(0.95)' },
          to:   { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        shake: {
          '0%,100%': { transform: 'translateX(0)' },
          '25%':     { transform: 'translateX(-6px)' },
          '75%':     { transform: 'translateX(6px)' },
        },
      },
    },
  },
  plugins: [],
};