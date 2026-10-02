# Phone survey API contract (pilot, v1)

## School privacy gate (2026-10-02)
Cloud collection requires SURVEY_SCHOOL_NAME, SURVEY_PRIVACY_EMAIL and
SURVEY_PROCESSOR_NOTICE (provider names, processing countries and recipients),
in addition to storage and a school key of at least 32 characters. Missing or
invalid configuration disables the service. This configuration is operational
information, not proof of legal approval. One deployment is for one school;
multi-school account isolation and named teacher authentication remain required
before a shared commercial service.

GET /api/survey-response includes notice:{schoolName,privacyEmail,processors}.
POST also requires noticeAcknowledged:true, recording the notice version and
time alongside the response. The acknowledgement confirms reading; it does not
substitute for the school's lawful basis or any necessary guardian consent.
DELETE /api/survey-response with the pupil capability deletes their invitation
and cloud response, returning {deleted:true}. Teacher copies and external files
must be handled separately. All methods use no-store and no-referrer headers.
Session collection uses a single MGET. Creation writes at most five invitations
concurrently, bounded to 50 pupils. This avoids serial per-pupil network reads.

Same-origin Vercel functions backed by durable Redis REST (existing KV/Upstash variables). No memory fallback for answers. The school configures SURVEY_SCHOOL_KEY on the server; this code is required to create a survey, never bundled into client code. This is a single-school pilot capability flow, not enterprise account management.

## /api/surveys
- GET without sessionId: 200 {available:boolean}; no configuration values exposed.
- POST, Authorization: Bearer school-code, body {studentIds:string[1..50], language:he|en|ar|ru}: 201 {sessionId, adminToken, expiresAt, invitations:[{studentId,token}]}. Duplicate/empty/oversized ids: 400; invalid code: 401.
- GET ?sessionId=ID, Authorization: Bearer adminToken: 200 {expiresAt,responses:[{studentId,answers}]}. Invalid capability 404.
- DELETE ?sessionId=ID, Authorization: Bearer adminToken: 200 {closed:true}. Removes session and invitation/answer records.

## /api/survey-response
- GET, Authorization: Bearer invitation-token: 200 {language,submitted:boolean,expiresAt,notice:{schoolName,privacyEmail,processors}}. No roster, names or previous answers returned.
- POST, same invitation authorization, body {answers:SurveyAnswers,noticeAcknowledged:true}: 200 {saved:true}. Only the student's own record is written. Resubmission replaces that response. The phone version uses nine non-peer items; seatmates must be [] and helper null.

## General
Unsupported methods: 405 + Allow. Invalid answers: 400. Storage unconfigured/unavailable: 503. Every response Cache-Control:no-store. Tokens: 256-bit random, only SHA256 token hashes persisted. TTL seven days, fixed expiry on all records. Rate limit uses existing infrastructure. Student URL carries invitation token in fragment, never in query; administration token stays on teacher device. Teacher imports raw responses then approves each before applying seating suggestions. No automated email/SMS/WhatsApp sending.

## Validation
Handler tests use a fake durable Redis server to check the HTTP contract, isolation, authorization, validation, expiry settings, delete, storage outage and unavailable setup. Cloud hosting and real-phone verification remain required before a school pilot. Configure KV_REST_API_URL/TOKEN (or UPSTASH_REDIS_REST_URL/TOKEN) and SURVEY_SCHOOL_KEY as server secrets, plus the three school notice variables above; deploy the web project with its api folder.
