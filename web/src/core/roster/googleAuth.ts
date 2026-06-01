/**
 * Minimal, privacy-preserving Google OAuth for the browser, via Google
 * Identity Services (GIS). We use the *implicit token* flow: the user signs
 * in, Google hands an access token straight to this page, and we call the
 * Classroom API with it. No tokens or student data are sent to any SeatAI
 * server — there is no SeatAI server.
 *
 * The whole feature is gated behind `VITE_GOOGLE_CLIENT_ID`. When it isn't
 * set (the default open-source build), `isGoogleConfigured()` is false and
 * the UI shows setup instructions instead of a broken button.
 */

import { GOOGLE_SCOPES } from './googleClassroom';

const GIS_SRC = 'https://accounts.google.com/gsi/client';

// Minimal shape of the bits of GIS we touch — avoids pulling a global d.ts.
interface TokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}
interface TokenClient {
  requestAccessToken: (overrides?: { prompt?: string }) => void;
  callback: (resp: TokenResponse) => void;
}
interface GoogleOAuth {
  accounts: {
    oauth2: {
      initTokenClient: (config: {
        client_id: string;
        scope: string;
        callback: (resp: TokenResponse) => void;
      }) => TokenClient;
    };
  };
}
declare global {
  interface Window {
    google?: GoogleOAuth;
  }
}

export function googleClientId(): string {
  return (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim() ?? '';
}

/** Whether a Google OAuth client id has been configured at build time. */
export function isGoogleConfigured(): boolean {
  return googleClientId().length > 0;
}

let gisPromise: Promise<void> | null = null;

/** Inject the GIS script once and resolve when `window.google` is ready. */
function loadGis(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (gisPromise) return gisPromise;
  gisPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GIS_SRC}"]`);
    const onLoad = () => {
      if (window.google?.accounts?.oauth2) resolve();
      else reject(new Error('Google Identity Services failed to initialise'));
    };
    if (existing) {
      existing.addEventListener('load', onLoad, { once: true });
      existing.addEventListener('error', () => reject(new Error('Failed to load Google Identity Services')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = GIS_SRC;
    script.async = true;
    script.defer = true;
    script.onload = onLoad;
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    document.head.appendChild(script);
  });
  return gisPromise;
}

/**
 * Run the OAuth consent flow and resolve with an access token. Rejects if
 * the integration isn't configured, the script can't load, or the user
 * denies consent.
 */
export async function getAccessToken(): Promise<string> {
  const clientId = googleClientId();
  if (!clientId) throw new Error('Google Classroom is not configured');
  await loadGis();

  return new Promise<string>((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: GOOGLE_SCOPES,
      callback: (resp) => {
        if (resp.error) {
          reject(new Error(resp.error_description || resp.error));
        } else if (resp.access_token) {
          resolve(resp.access_token);
        } else {
          reject(new Error('No access token returned'));
        }
      },
    });
    client.requestAccessToken();
  });
}
