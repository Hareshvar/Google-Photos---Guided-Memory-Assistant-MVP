/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "google-blue": "#4285F4",
        "google-red": "#EA4335",
        "google-yellow": "#FBBC04",
        "google-green": "#34A853",
        "outline": "#727785",
        "primary": "#4285F4",
        "primary-container": "#2771df",
        "primary-fixed": "#d8e2ff",
        "primary-fixed-dim": "#adc6ff",
        "on-primary": "#ffffff",
        "on-primary-fixed": "#001a41",
        "surface": "#faf9fd",
        "surface-dim": "#dbd9dd",
        "surface-bright": "#faf9fd",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#f4f3f7",
        "surface-container": "#efedf1",
        "surface-container-high": "#e9e7eb",
        "surface-container-highest": "#e3e2e6",
        "surface-variant": "#e3e2e6",
        "on-surface": "#1a1b1e",
        "on-surface-variant": "#424753",
        "outline-variant": "#c2c6d5",
        "secondary": "#34A853",
        "secondary-container": "#86f898",
        "tertiary": "#FBBC04",
        "tertiary-container": "#ffdfa0",
        "error": "#EA4335",
        "error-container": "#ffdad6",
      },
      borderRadius: {
        "DEFAULT": "0.125rem",
        "lg": "0.25rem",
        "xl": "0.5rem",
        "full": "9999px"
      },
      fontFamily: {
        "sans": ["Roboto Flex", "system-ui", "sans-serif"],
        "body": ["Roboto Flex", "system-ui", "sans-serif"]
      }
    },
  },
  plugins: [],
};
