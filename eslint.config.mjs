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
  ]),
  {
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "no-restricted-imports": ["error", {
        paths: [
          {
            name: "radix-ui",
            importNames: ["Dialog"],
            message: "Import Dialog from @/components/ui/dialog for shared modal motion.",
          },
          {
            name: "@radix-ui/react-dialog",
            message: "Import Dialog from @/components/ui/dialog for shared modal motion.",
          },
        ],
      }],
    },
  },
  {
    files: ["components/ui/dialog/index.tsx"],
    rules: { "no-restricted-imports": "off" },
  },
]);

export default eslintConfig;
