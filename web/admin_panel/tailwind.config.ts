import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17211b",
        line: "#d9e4dc",
        field: "#f7faf7",
        brand: "#246b45",
        warn: "#a15c14",
        danger: "#b42318"
      }
    }
  },
  plugins: []
};

export default config;

