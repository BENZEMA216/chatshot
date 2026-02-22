import { defineConfig } from "vite";
import { resolve } from "path";
import { copyFileSync, mkdirSync, existsSync, readdirSync } from "fs";

// Content script build: single IIFE file, no code splitting
export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: true,
    lib: {
      entry: resolve(__dirname, "src/content.ts"),
      name: "AIChatScreenshot",
      formats: ["iife"],
      fileName: () => "content.js",
    },
    rollupOptions: {
      output: {
        // Ensure html2canvas is bundled inline
        inlineDynamicImports: true,
      },
    },
  },
  plugins: [
    {
      name: "copy-extension-files",
      closeBundle() {
        // Copy manifest.json
        copyFileSync(
          resolve(__dirname, "manifest.json"),
          resolve(__dirname, "dist/manifest.json")
        );
        // Copy content.css
        copyFileSync(
          resolve(__dirname, "content.css"),
          resolve(__dirname, "dist/content.css")
        );
        // Copy icons
        const iconsDir = resolve(__dirname, "dist/icons");
        if (!existsSync(iconsDir)) {
          mkdirSync(iconsDir, { recursive: true });
        }
        for (const size of ["icon16.png", "icon48.png", "icon128.png"]) {
          const src = resolve(__dirname, "icons", size);
          if (existsSync(src)) {
            copyFileSync(src, resolve(iconsDir, size));
          }
        }
        // Copy _locales
        const localesDir = resolve(__dirname, "_locales");
        if (existsSync(localesDir)) {
          for (const locale of readdirSync(localesDir)) {
            const destDir = resolve(__dirname, "dist/_locales", locale);
            mkdirSync(destDir, { recursive: true });
            const msgSrc = resolve(localesDir, locale, "messages.json");
            if (existsSync(msgSrc)) {
              copyFileSync(msgSrc, resolve(destDir, "messages.json"));
            }
          }
        }
      },
    },
  ],
});
