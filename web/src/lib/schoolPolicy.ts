/** External processors require a separately reviewed deployment. Local seating
 * optimization and deterministic explanations never need this capability. */
export function externalAiAllowed(): boolean {
  return import.meta.env.VITE_ALLOW_EXTERNAL_AI === 'true';
}
