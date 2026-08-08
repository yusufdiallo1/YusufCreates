import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Convex codegen output.
    "convex/_generated/**",
    // Local tooling scratch, not part of the app.
    ".remember/**",
    /*
     * Social-media render scripts. Not app source and not bundled.
     *
     * "build/**" above only matches a top-level build directory, so the
     * per-deck build folders in here were being linted as if they were part
     * of the site — 63 no-require-imports errors from CommonJS scripts that
     * are deliberately CommonJS. They drowned the ~20 real findings in the
     * app, which is the actual cost of leaving this unignored.
     */
    "YusufCreates Social Media/**",
  ]),
]);

export default eslintConfig;
