import globals from "globals";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import pluginReactHooks from "eslint-plugin-react-hooks";
import { fixupPluginRules } from "@eslint/compat";

export default tseslint.config(
    {
        ignores: [
            "**/dist/",
            "**/node_modules/",
            "**/src-tauri/",
            "postcss.config.cjs",
        ],
    },
    {
        files: ["**/*.{js,mjs,cjs,jsx,mjsx,ts,tsx}"],
        plugins: {
            react: fixupPluginRules(pluginReact),
            "react-hooks": fixupPluginRules(pluginReactHooks),
        },
        languageOptions: {
            parserOptions: {
                ecmaFeatures: {
                    jsx: true,
                },
            },
            globals: {
                ...globals.browser,
                ...globals.node,
            },
        },
        rules: {
            ...pluginReact.configs.recommended.rules,
            ...pluginReactHooks.configs.recommended.rules,
            "react/react-in-jsx-scope": "off",
        },
        settings: {
            react: {
                version: "detect",
            },
        },
    },
    ...tseslint.configs.recommended,
);