import js from "@eslint/js";
import globals from "globals";
import unusedImports from "eslint-plugin-unused-imports";
import prettier from "eslint-config-prettier";

export default [
    { ignores: ["node_modules"] },
    js.configs.recommended,
    {
        files: ["**/*.{js,mjs}"],
        languageOptions: { ecmaVersion: "latest", sourceType: "module", globals: globals.node },
        plugins: { "unused-imports": unusedImports },
        rules: {
            "unused-imports/no-unused-imports": "error",
            "unused-imports/no-unused-vars": [
                "warn",
                { vars: "all", varsIgnorePattern: "^_", args: "after-used", argsIgnorePattern: "^_", caughtErrors: "none" },
            ],
            "no-unused-vars": "off",
        },
    },
    prettier,
];
