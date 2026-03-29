# Security Policy

## Reporting Security Vulnerabilities

If you discover a security vulnerability in SeatAI, please report it responsibly.

### How to Report

**Do NOT create a public issue.**

Instead, please send an email to: [SECURITY EMAIL PLACEHOLDER]

Your email should include:
- Description of the vulnerability
- Steps to reproduce the vulnerability
- Affected versions (if known)
- Potential impact assessment
- Suggested fix (if you have one)

### What to Expect

- We will acknowledge receipt of your report within 48 hours
- We will provide a timeline for addressing the vulnerability
- We will notify you when the fix is deployed
- We will credit you in the security advisory (if desired)

### Supported Versions

Security updates are provided for:
- Latest major version
- Previous major version for 6 months after new release

### Security Best Practices

SeatAI follows these security practices:

#### Client-Side Security
- ✅ All data stored locally in browser (IndexedDB)
- ✅ No server-side vulnerabilities (static app)
- ✅ No SQL injection risk (no database)
- ✅ Input validation on all user inputs
- ✅ XSS prevention through React's default escaping

#### Data Privacy
- ✅ No data transmission to external servers
- ✅ All processing happens in browser
- ✅ Students' data never leaves the user's device
- ✅ No third-party analytics by default

#### Deployment Security
- ✅ Static file hosting (no server execution)
- ✅ HTTPS enforced on production domains
- ✅ Content Security Policy headers
- ✅ Subresource Integrity (SRI) for external scripts

## Security Scope

This security policy applies to:
- The SeatAI application code
- Official SeatAI deployments
- SeatAI infrastructure

It does NOT apply to:
- Third-party integrations
- Modified versions of SeatAI
- Deployments on untrusted infrastructure

## Supported Versions

| Version | Security Support | Until |
|---------|-------------------|-------|
| 1.x     | ✅ Supported        | Until 2.x release |
| < 1.0   | ❌ Unsupported      | N/A |

## Disclosure Policy

We follow responsible disclosure principles:

1. **Private Disclosure** - Report vulnerabilities privately
2. **Reasonable Timeline** - Allow time to fix before public disclosure
3. **Coordinated Disclosure** - Work with reporter on disclosure timing
4. **Credit** - Acknowledge responsible reporters

## Allowed Security Research

We encourage security research under these conditions:

### ✅ Allowed
- Testing your own account/classroom data
- Automated testing tools with reasonable rate limits
- Research on public deployments with prior notice

### ❌ Not Allowed
- Accessing other users' data without permission
- Disrupting service availability
- Using vulnerabilities to harm users
- Public disclosure without prior fix

## Contact

For security questions not related to vulnerability reports, please open a GitHub Discussion.

---

*Last updated: 2026-03-29*
