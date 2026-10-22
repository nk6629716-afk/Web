/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        surface: {
          base: '#292b30',
          dark: '#23252a',
          light: '#31343a',
          border: 'rgba(255, 255, 255, 0.05)',
        },
        led: {
          idle: '#ffaa00',
          success: '#00ff88',
          failed: '#ff3366',
          cyan: '#00bfff',
        },
        node: {
          trigger: '#10b981',
          transform: '#8b5cf6',
          condition: '#f59e0b',
          output: '#06b6d4',
        }
      },
      boxShadow: {
        'neumo-protrude': '6px 6px 12px rgba(0, 0, 0, 0.4), -6px -6px 12px rgba(255, 255, 255, 0.08)',
        'neumo-recess': 'inset 6px 6px 12px rgba(0, 0, 0, 0.4), inset -6px -6px 12px rgba(255, 255, 255, 0.08)',
        'neumo-protrude-sm': '3px 3px 6px rgba(0, 0, 0, 0.4), -3px -3px 6px rgba(255, 255, 255, 0.08)',
        'neumo-recess-sm': 'inset 3px 3px 6px rgba(0, 0, 0, 0.4), inset -3px -3px 6px rgba(255, 255, 255, 0.08)',
        'neumo-button': '4px 4px 8px rgba(0, 0, 0, 0.4), -4px -4px 8px rgba(255, 255, 255, 0.08)',
        'neumo-button-active': 'inset 4px 4px 8px rgba(0, 0, 0, 0.5), inset -4px -4px 8px rgba(255, 255, 255, 0.08)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
}
