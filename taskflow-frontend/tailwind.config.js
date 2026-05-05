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
        coral: {
          DEFAULT: '#6e9473',
          active: '#4e7452',
          disabled: '#c8d9ca',
          soft: 'rgba(110, 148, 115, 0.12)',
        },
        ink: {
          DEFAULT: '#1a1a16',
          strong: '#2a2a22',
          body: '#3e3e35',
          muted: '#6a6860',
          'muted-soft': '#8c897f',
        },
        canvas: {
          DEFAULT: '#f5f1e8',
          soft: '#ede7d8',
          card: '#e4dcc8',
          strong: '#d9d0bb',
        },
        navy: {
          DEFAULT: '#161814',
          elevated: '#222520',
          soft: '#1c1f1a',
          hairline: '#2b2e28',
        },
        hairline: {
          DEFAULT: '#d8d0c4',
          soft: '#e0d9ce',
        },
        teal: '#5db8a6',
        amber: '#e8a55a',
        success: '#5db872',
        warning: '#d4a017',
        danger: '#c64545',
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Tiempos Headline', 'Garamond', 'serif'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      letterSpacing: {
        'display-xl': '-0.04em',
        'display-lg': '-0.03em',
        'display-md': '-0.02em',
        'caption-up': '0.12em',
      },
      borderRadius: {
        xs: '4px',
        sm: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px',
      },
      spacing: {
        section: '96px',
      },
      boxShadow: {
        'soft': '0 1px 3px rgba(20,20,19,0.04), 0 1px 2px rgba(20,20,19,0.06)',
        'lift': '0 4px 12px rgba(20,20,19,0.06), 0 2px 4px rgba(20,20,19,0.04)',
        'lift-lg': '0 12px 32px rgba(20,20,19,0.08), 0 4px 8px rgba(20,20,19,0.04)',
        'coral': '0 4px 16px rgba(110,148,115,0.22)',
      },
      animation: {
        'fade-in': 'fadeIn 0.32s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-up': 'slideUp 0.32s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-down': 'slideDown 0.32s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scaleIn 0.24s cubic-bezier(0.16, 1, 0.3, 1)',
        'pop': 'pop 0.24s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'shimmer': 'shimmer 2s ease-in-out infinite',
        'theme-icon': 'themeIcon 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.96)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        pop: {
          '0%': { transform: 'scale(0.92)', opacity: '0' },
          '60%': { transform: 'scale(1.04)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        shimmer: {
          '0%, 100%': { opacity: '0.5' },
          '50%': { opacity: '1' },
        },
        themeIcon: {
          '0%': { transform: 'rotate(-180deg) scale(0.6)', opacity: '0' },
          '100%': { transform: 'rotate(0deg) scale(1)', opacity: '1' },
        },
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'smooth': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
}
