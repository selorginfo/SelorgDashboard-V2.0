/**
 * Single source of truth for the mock-data switch.
 *
 * Every `src/services/*\/index.ts` used to read `import.meta.env.VITE_USE_MOCKS` directly, which
 * meant a stray `.env` (or a copied `.env.example`) could ship in-memory fixtures to a real
 * deployment — the dashboard would look fully functional while writing nothing to the backend.
 *
 * Two rules:
 *  1. Mocks are opt-in — anything other than the literal string "true" means real APIs.
 *  2. Mocks are force-disabled in production builds, regardless of the env value.
 */
const requested = import.meta.env["VITE_USE_MOCKS"] === "true";

export const USE_MOCKS: boolean = requested && !import.meta.env.PROD;

if (requested && import.meta.env.PROD) {
  // Loud on purpose: the operator asked for mocks in a production bundle.
  console.error(
    "[selorg-admin] VITE_USE_MOCKS=true was ignored because this is a production build. Real APIs are in use."
  );
}
