/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        fenrir: {
          bg: '#0d0d0d',
          surface: '#141414',
          border: '#1f1f1f',
          accent: '#e53e3e',
          muted: '#6b6b6b',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}
