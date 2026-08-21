/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "true" for the browser-only demo build (VITE_DEMO_MODE=true) — see src/blink/client.ts. */
  readonly VITE_DEMO_MODE?: string
}
