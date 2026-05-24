/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#f6b70a',
          dark:    '#d4960a',
          light:   '#ffd04d',
        },
        gold: {
          DEFAULT: '#fecb00',
          dim:     'rgba(254,203,0,0.1)',
        },
        surface: {
          DEFAULT: '#ffffff',
          raised:   '#f5f5f5',
          overlay:  '#eeeeee',
          border:   'rgba(0,0,0,0.08)',
          card:     '#fafafa',
        },
        text: {
          primary:   '#1a1a1a',
          secondary: '#666666',
          muted:     '#999999',
        },
        success: '#10b981',
      },
      fontFamily: {
        display:  ['"Manrope"',        'sans-serif'],
        headline: ['"Space Grotesk"',  'sans-serif'],
        body:     ['"Inter"',          'sans-serif'],
        mono:     ['"JetBrains Mono"', 'monospace'],
      },
      animation: {
        'fade-in':       'fadeIn 0.4s ease forwards',
        'slide-up':      'slideUp 0.4s cubic-bezier(0.16,1,0.3,1) forwards',
        'slide-up-fade': 'slideUpFade 0.4s cubic-bezier(0.16,1,0.3,1) forwards',
        'shake':         'shake 0.4s ease',
        'float':         'float 7s ease-in-out infinite',
        'float-slow':    'float 11s ease-in-out infinite',
        'float-alt':     'floatAlt 9s ease-in-out infinite',
        'glow-pulse':    'glowPulse 3s ease-in-out infinite',
        'shimmer':       'shimmer 2.2s linear infinite',
        'gradient-x':    'gradientX 6s ease infinite',
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
        float: {
          '0%,100%': { transform: 'translateY(0px)' },
          '50%':     { transform: 'translateY(-22px)' },
        },
        floatAlt: {
          '0%,100%': { transform: 'translateY(0px) translateX(0px)' },
          '33%':     { transform: 'translateY(-14px) translateX(8px)' },
          '66%':     { transform: 'translateY(10px) translateX(-6px)' },
        },
        glowPulse: {
          '0%,100%': { opacity: '0.45', transform: 'scale(1)' },
          '50%':     { opacity: '0.75', transform: 'scale(1.08)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        gradientX: {
          '0%,100%': { backgroundPosition: '0% 50%' },
          '50%':     { backgroundPosition: '100% 50%' },
        },
      },
    },
  },
  plugins: [],
};