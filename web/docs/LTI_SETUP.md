# LTI 1.3 roster sync — setup

SeatAI can be added as an **LTI Advantage tool** inside an LMS (Canvas,
Moodle, Blackboard, Schoology). A teacher clicks SeatAI in their course and it
opens with the class roster already imported — via the **Names & Role
Provisioning Service (NRPS)**.

> Unlike the CSV / Google / OneRoster importers, LTI **requires a server**, so
> it runs as Vercel serverless functions (`web/api/lti/*`). The roster passes
> through that function (Google → LMS → our function → the teacher's browser);
> it is not stored server-side, but it is no longer purely on-device like the
> other importers.

## Endpoints (auto-deployed with the app)

| Purpose | URL |
|---------|-----|
| OIDC login initiation | `https://<your-app>/api/lti/login` |
| Launch / redirect URI | `https://<your-app>/api/lti/launch` |
| Public JWKS (tool keys) | `https://<your-app>/api/lti/jwks` |

## 1. Generate a signing key

```bash
openssl genpkey -algorithm RSA -pkcs8 -out lti-key.pem -pkeyopt rsa_keygen_bits:2048
```

Put the PEM in `LTI_PRIVATE_KEY` (Vercel env var; use literal `\n` between
lines if your secret store is single-line). Set `LTI_KID` to any stable id.
The matching public key is served automatically at `/api/lti/jwks`.

## 2. Register the tool in your LMS

Create an LTI 1.3 developer key / tool with:
- **OIDC login URL**: `…/api/lti/login`
- **Redirect URI / target link URI**: `…/api/lti/launch`
- **Public JWK URL**: `…/api/lti/jwks`
- **Required scope**: `…/lti-nrps/scope/contextmembership.readonly` (Names and
  Roles). Enable the **Names and Role Provisioning Service** for the tool.

The LMS will give you an **issuer**, **client id**, **OIDC auth endpoint**,
**token endpoint**, **platform JWKS URL**, and a **deployment id**.

## 3. Tell SeatAI about the platform

Set `LTI_PLATFORMS` to a JSON array (one object per platform):

```json
[
  {
    "issuer": "https://canvas.instructure.com",
    "clientId": "10000000000123",
    "authEndpoint": "https://canvas.instructure.com/api/lti/authorize_redirect",
    "tokenEndpoint": "https://canvas.instructure.com/login/oauth2/token",
    "jwksUri": "https://canvas.instructure.com/api/lti/security/jwks",
    "deploymentId": "1:abc..."
  }
]
```

Set `LTI_TOOL_URL` to the public URL of the deployment (or leave it unset to
infer from the request host). Redeploy.

## How it works

1. LMS → `/api/lti/login`: we mint a signed `state` (carrying a nonce) and
   redirect to the platform's auth endpoint. **No cookies** are used, so it
   works even when the LMS frames the tool and the browser blocks third-party
   cookies.
2. LMS → `/api/lti/launch`: validates `state`, verifies the platform-signed
   `id_token` against its JWKS, checks the nonce, then calls the token endpoint
   (client-credentials with a key-signed assertion) and reads NRPS membership.
3. The launch page redirects the top window to the SPA with the roster in the
   URL fragment (`#lti=…`); the SPA sanitises it and adds the students.

## Caveats / verification

- **Test against a real LMS.** This can't be exercised without a deployed
  server, generated keys, and a registered tool. Use the
  [1EdTech LTI Reference Implementation](https://lti-ri.imsglobal.org/) or
  Canvas/Moodle to smoke-test.
- Only **learners** are imported; instructors and inactive members are skipped.
- The pure protocol logic (URL building, claim validation, member mapping,
  fragment sanitising) is unit-tested in `src/core/lti/ltiCore.test.ts`; the
  crypto/HTTP handlers are not covered by CI.
