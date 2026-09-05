import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// GitHub Pages: https://locitanit.github.io/erettsegi-stat/
export default defineConfig({
  base: "/erettsegi-stat/",
  plugins: [react(), tailwindcss()],
  build: { outDir: "dist", sourcemap: false },
});
