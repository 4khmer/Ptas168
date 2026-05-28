/// <reference types="vite/client" />

// Type the env vars we use, so import.meta.env.VITE_API_URL etc. are typed.
interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  readonly VITE_FILE_URL?: string
  readonly BASE_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
