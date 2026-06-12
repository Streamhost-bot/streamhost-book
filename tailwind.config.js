/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: 'rgb(var(--color-primary) / <alpha-value>)',
        'primary-light': 'rgb(var(--color-primary-light) / <alpha-value>)',
        'primary-lighter': 'rgb(var(--color-primary-lighter) / <alpha-value>)',
        accent: '#00b4d8',
        'accent-dark': '#0096c7',
      },
    },
  },
  plugins: [],
}
