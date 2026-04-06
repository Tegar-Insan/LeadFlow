/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#e31837',
          dark:    '#b01229',
          light:   '#ff4d6a',
        },
        gold: {
          DEFAULT: '#fecb00',
          dim:     'rgba(254,203,0,0.1)',
        },
        surface: {
          DEFAULT: '#131313',
          raised:   '#1c1b1b',
          overlay:  '#2a2a2a',
          border:   'rgba(255,255,255,0.05)',
          card:     '#27272a',
        },
        text: {
          primary:   '#e5e2e1',
          secondary: '#71717a',
          muted:     '#52525b',
        },
        success: '#10b981',
      },
      fontFamily: {
        display: ['"Manrope"',        'sans-serif'],
        body:    ['"Inter"',          'sans-serif'],
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