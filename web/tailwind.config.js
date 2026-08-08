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
        // Sage — the calm, considered green of a well-kept classroom.
        // Chosen over the previous saturated blue: teachers respond to
        // warmth, not to tech-brand primaries.
        primary: {
          50: '#f0f7f3',
          100: '#dbeae2',
          200: '#b6d5c4',
          300: '#87b6a1',
          400: '#5b9581',
          500: '#2f6f5e',
          600: '#265a4c',
          700: '#204a3f',
          800: '#1c3d34',
          900: '#17332c',
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
