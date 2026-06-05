import path from "path";
import { fileURLToPath } from "url";

// tailwind 설정을 절대경로로 지정해, 어떤 cwd에서 실행해도(예: Preview가 상위 폴더에서 구동) 설정을 찾도록 함
const dir = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    tailwindcss: { config: path.join(dir, "tailwind.config.ts") },
  },
};

export default config;
