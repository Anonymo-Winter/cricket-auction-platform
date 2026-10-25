import js from "@eslint/js";
import globals from "globals";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import prettier from "eslint-config-prettier"
import tseslint from "typescript-eslint"
import unusedImports from "eslint-plugin-unused-imports"

export default [
    { ignores: ["dist"] },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ["**/*.{js,jsx,ts,tsx}"],
        languageOptions: {
            ecmaVersion: "latest",
            globals: globals.browser,
            parserOptions: {
                ecmaFeatures: { jsx: true }
            },
        },
        settings: { react: { version: "18.3" } },
        plugins: {
            react,
            "react-hooks": reactHooks,
            "react-refresh": reactRefresh,
        },
        rules: {
            ...react.configs.recommended.rules,
            ...react.configs["jsx-runtime"].rules,
            ...reactHooks.configs.recommended.rules,
            "react/jsx-no-target-blank": "off",
            "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
            "react/prop-types": "off",
        },
    },
   {
        plugins: { "unused-imports": unusedImports },
        rules: {
            "@typescript-eslint/no-unused-vars": "off",
            "unused-imports/no-unused-imports": "error",
            "unused-imports/no-unused-vars": [
                "warn",
                { vars: "all", varsIgnorePattern: "^_", args: "after-used", argsIgnorePattern: "^_", caughtErrors: "none" },
            ],
        },
    },
    {
        // shadcn/ui generated files
        files: ["src/components/ui/**", "src/hooks/use-toast.ts"],
        rules: { "react-refresh/only-export-components": "off", "unused-imports/no-unused-vars": "off" },
    },
    {files: ["*.config.js"], languageOptions: {globals: globals.node}},
    prettier
];
