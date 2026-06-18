/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      fontFamily: {
        display: ['Cinzel', 'serif'],
        body: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        ink: {
          950: '#050507',
          900: '#0a0a0c',
          800: '#121216',
          700: '#1a1a20',
          600: '#25252d',
          500: '#35353f',
          400: '#4a4a57',
        },
        blood: {
          900: '#3a0000',
          800: '#5c0000',
          700: '#7a0000',
          600: '#8b0000',
          500: '#a51a1a',
          400: '#c43333',
          300: '#dc5555',
        },
        ash: {
          600: '#5a5a66',
          500: '#6b6b78',
          400: '#8a8a9a',
          300: '#aaaab8',
          200: '#c8c8d4',
          100: '#e0e0ea',
        },
        verdant: {
          900: '#143324',
          800: '#1e4030',
          700: '#2d5a3d',
          600: '#3a7050',
          500: '#4a8860',
        },
        void: {
          900: '#1a1430',
          800: '#251e40',
          700: '#3d2d5a',
          600: '#554075',
        },
        ember: {
          900: '#3a1e0e',
          800: '#4a2a15',
          700: '#5a3d2d',
          600: '#70503a',
        },
        frost: {
          700: '#606575',
          600: '#7a8095',
          500: '#95a0b8',
        },
      },
      boxShadow: {
        'glow-blood': '0 0 20px rgba(139, 0, 0, 0.4), 0 0 40px rgba(139, 0, 0, 0.15)',
        'glow-blood-sm': '0 0 10px rgba(139, 0, 0, 0.3)',
        'glow-green': '0 0 14px rgba(58, 112, 80, 0.4)',
        'glow-purple': '0 0 14px rgba(85, 64, 117, 0.4)',
        'glow-orange': '0 0 14px rgba(112, 80, 58, 0.4)',
        'glow-silver': '0 0 14px rgba(149, 160, 184, 0.35)',
        'card-dark': '0 4px 24px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255,255,255,0.03)',
      },
      animation: {
        'breath': 'breath 4s ease-in-out infinite',
        'flicker': 'flicker 3s linear infinite',
        'pulse-slow': 'pulse 3.5s ease-in-out infinite',
        'shake': 'shake 0.4s ease-in-out',
        'drip': 'drip 6s ease-in-out infinite',
        'fade-in': 'fadeIn 0.5s ease-out',
      },
      keyframes: {
        breath: {
          '0%, 100%': { opacity: '0.55' },
          '50%': { opacity: '1' },
        },
        flicker: {
          '0%, 19%, 21%, 23%, 25%, 54%, 56%, 100%': { opacity: '1' },
          '20%, 24%, 55%': { opacity: '0.65' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-2px)' },
          '40%': { transform: 'translateX(2px)' },
          '60%': { transform: 'translateX(-1px)' },
          '80%': { transform: 'translateX(1px)' },
        },
        drip: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(3px)' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
