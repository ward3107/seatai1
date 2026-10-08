/** Consume provider callback state before mounting any school or classroom UI. */
export function consumeRecoveryCallback() {
  const url = new URL(window.location.href);
  const fragment = new URLSearchParams(url.hash.slice(1));
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error') ?? fragment.get('error');
  if (!code && !error) return null;
  // Only PKCE auth codes are accepted; no access/refresh token is read or persisted.
  window.history.replaceState(null, '', `${url.pathname}#school-reset`);
  return { code: code ?? undefined, failed: Boolean(error) };
}
