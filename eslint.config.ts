import { defineConfig } from "eslint/config";
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import { type Linter } from "eslint";

const reactConfig: Linter.FlatConfig = {
    files: ["src/**/*.{ts,tsx}"],
    ...react.configs.flat.recommended,
    plugins: {
        ...react.configs.flat.recommended.plugins,
        "react-hooks": reactHooks,
    },
    settings: {
        react: {
            version: "detect",
        },
    },
    languageOptions: {
        ...react.configs.flat.recommended.languageOptions,
        globals: {
            ...globals.browser,
        },
    },
    rules: {
        ...react.configs.flat.recommended.rules,
        ...react.configs.flat["jsx-runtime"].rules,
        ...reactHooks.configs.recommended.rules,
        "react/prop-types": "off",
        "react-hooks/exhaustive-deps": "error",
        "react/function-component-definition": [
            "error",
            { namedComponents: "arrow-function" },
        ],
        "react/self-closing-comp": "error",
        "react/jsx-curly-brace-presence": [
            "error",
            { props: "never", children: "never", propElementValues: "always" },
        ],
        "react/jsx-fragments": ["error", "syntax"],
        "react/no-unstable-nested-components": ["error", { allowAsProps: true }],
        "react/no-array-index-key": "error",
        "react/destructuring-assignment": ["error", "always"],
        "react/jsx-no-useless-fragment": "error",
        "react/jsx-sort-props": [
            "warn",
            {
                callbacksLast: true,
                shorthandFirst: true,
                reservedFirst: true,
            },
        ],
    },
};

export default defineConfig([
    {
        ignores: [
            "**/dist/",
            "**/node_modules/",
            "**/src-tauri/",
            "postcss.config.cjs",
        ],
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    reactConfig,
]);