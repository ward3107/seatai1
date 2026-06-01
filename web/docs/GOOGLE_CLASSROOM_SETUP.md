# Google Classroom roster import — setup

SeatAI can import a class roster straight from Google Classroom in one click.
The flow is **100% client-side** (Google Identity Services implicit token):
student names go Google → the teacher's browser → IndexedDB. No token or
student data ever passes through a SeatAI server — there isn't one.

The feature is hidden until you provide an OAuth client ID via the
`VITE_GOOGLE_CLIENT_ID` environment variable.

## One-time Google Cloud setup

1. Create (or pick) a project at https://console.cloud.google.com.
2. **Enable the Google Classroom API** (APIs & Services → Library → "Google
   Classroom API" → Enable).
3. **Configure the OAuth consent screen** (APIs & Services → OAuth consent
   screen):
   - User type: *External* (or *Internal* for a single Google Workspace).
   - Add the scopes:
     - `https://www.googleapis.com/auth/classroom.courses.readonly`
     - `https://www.googleapis.com/auth/classroom.rosters.readonly`
   - Add test users while the app is unverified, or submit for verification
     to open it to everyone.
4. **Create credentials** → *OAuth client ID* → Application type **Web
   application**:
   - **Authorized JavaScript origins**: every origin SeatAI runs on, e.g.
     `http://localhost:5173` and `https://your-deployment.example.com`.
   - (No redirect URI is needed for the GIS token flow.)
5. Copy the generated **Client ID**.

## Wire it into SeatAI

In `web/.env` (copy from `.env.example`):

```
VITE_GOOGLE_CLIENT_ID=1234567890-abc123.apps.googleusercontent.com
```

Restart the dev server / rebuild. The **Google Classroom** card now appears in
the left sidebar under CSV Import. Teachers click **Connect Google Classroom**,
pick a class, and import.

## Scopes & privacy

Only read-only course-list and roster scopes are requested. The access token
lives in memory for the duration of the import and is never persisted. Imported
students get neutral defaults (proficient / good, score 70) exactly like the CSV
importer — the teacher fills in ability/behaviour afterward.

## Notes

- The token is short-lived (~1 hour); if an import fails with an auth error,
  click *Connect* again.
- Google REST APIs support CORS for browser requests with a bearer token, so no
  proxy is required.
- This is the first of several planned roster providers (LTI / OneRoster /
  Clever); they all map onto the same internal `RosterClass` shape in
  `src/core/roster/`.
