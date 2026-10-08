/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  // Enables rtl: variant — applied when an ancestor has dir="rtl"
  // e.g. rtl:flex-row-reverse, rtl:text-right
  //
  // Class-based dark mode — applied when the <html> element has class
  // `dark`. Driven by the `theme` field in the Zustand store.
  darkMode: 'class',

  theme: {
    extend: {
      // Extra-small breakpoint for fine-tuning phone layouts. Tailwind's
      // smallest default (`sm`) is 640px; `xs` lets us adapt to narrow
      // phones (~360–480px) without ejecting the whole screens scale.
      screens: {
        xs: '400px',
      },
      colors: {
        // Accessible iOS blue, shared by every primary action.
        primary: {
          50: '#eff5ff', 100: '#deebff', 200: '#bed8ff',
          300: '#91bfff', 400: '#559aff', 500: '#0070ed',
          600: '#0064d9', 700: '#0056bd', 800: '#06468f',
          900: '#15375f', 950: '#10243f',
        },
        // Neutral surfaces across existing utility-based panels.
        gray: {
          50: '#f7f7fa', 100: '#f2f2f7', 200: '#e5e5ea',
          300: '#d1d1d6', 400: '#8e8e93', 500: '#72727b',
          600: '#606069', 700: '#3a3a3c', 800: '#242426',
          900: '#1c1c1e', 950: '#000000',
        },
        slate: {
          50: '#f7f7fa', 100: '#f2f2f7', 200: '#e5e5ea',
          300: '#d1d1d6', 400: '#8e8e93', 500: '#72727b',
          600: '#606069', 700: '#3a3a3c', 800: '#242426',
          900: '#1c1c1e', 950: '#000000',
        },
        // Warm ochre — the color of graded-paper ink. Used sparingly,
        // for status highlights and callouts, never as a co-primary.
        accent: {
          50: '#fcf7ec',
          100: '#f7ecd0',
          200: '#eed49b',
          300: '#e5b661',
          400: '#d69e3f',
          500: '#c7833a',
          600: '#a76428',
          700: '#874c22',
          800: '#6d3d22',
          900: '#5c341e',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
}
