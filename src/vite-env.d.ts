/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_GITIGNORE_PATH: string
    readonly VITE_FILE_BASE_PATH: string
    readonly VITE_SYSTEM_PROMPTS_PATH: string
    readonly VITE_CONTEXTS_PATH: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}