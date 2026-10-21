/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#050a1a',
          900: '#0a1230',
          800: '#111b44',
          700: '#1a2758',
          600: '#26356f',
          500: '#3a4b8c',
        },
        emerald: { gem: '#10d9a0' },
        amethyst: {
          300: '#d6b4ff',
          400: '#b98aff',
          500: '#9b5cf6',
          600: '#7c3aed',
        },
        gold: {
          300: '#ffe28a',
          400: '#fcd34d',
          500: '#f5b912',
          600: '#d99a06',
        },
        sapphire: {
          400: '#60a5fa',
          500: '#3b82f6',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'Inter', 'sans-serif'],
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shake: {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '20%': { transform: 'rotate(-4deg)' },
          '40%': { transform: 'rotate(4deg)' },
          '60%': { transform: 'rotate(-3deg)' },
          '80%': { transform: 'rotate(3deg)' },
        },
        'rip-top': {
          '0%': { transform: 'translateY(0) rotate(0)', opacity: '1' },
          '100%': { transform: 'translateY(-160px) rotate(-18deg)', opacity: '0' },
        },
        'rip-bottom': {
          '0%': { transform: 'translateY(0)', opacity: '1' },
          '100%': { transform: 'translateY(220px)', opacity: '0' },
        },
        'card-in': {
          '0%': { transform: 'translateY(40px) scale(0.85) rotateY(90deg)', opacity: '0' },
          '100%': { transform: 'translateY(0) scale(1) rotateY(0)', opacity: '1' },
        },
        'pop-in': {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      animation: {
        shimmer: 'shimmer 3s linear infinite',
        float: 'float 4s ease-in-out infinite',
        shake: 'shake 0.5s ease-in-out infinite',
        'rip-top': 'rip-top 0.6s ease-in forwards',
        'rip-bottom': 'rip-bottom 0.7s ease-in forwards',
        'card-in': 'card-in 0.5s ease-out both',
        'pop-in': 'pop-in 0.35s ease-out both',
      },
    },
  },
  plugins: [],
}
