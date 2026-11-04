# Security audit — launch readiness (HEAD 361cc29) — Overall: HIGH

Critical 0 · High 3 · Medium 6 · Low 6 · Info 4. `pnpm audit --prod`: no known vulns (dev-only minimatch moderate x2).

## High
- **H1 Contact harvesting via Sybil HR accounts** — `get_candidate_contact`/`can_see_contact` unlock on *any* invite; anyone can self-assign HR. Fix: CAPTCHA (Turnstile) on anon sign-in + HR promotion; unlock contact only on **accepted** invite; global caps; HR account-age gate.
- **H2 IP limits trust leftmost X-Forwarded-For** (SQL 139-145), fail open. Fix: verify hosted header format, use trusted hop, fail closed; CAPTCHA is the real Sybil control.
- **H3 Broadcast amplification** — `upsert_profile`, `set_my_candidate_status` unthrottled, each broadcasts to all clients. Fix: per-user rate limits; skip no-op broadcasts.

## Medium
- **M1** Owner can undo admin hide / report auto-hide (`set_my_candidate_status('sitting')`, delete+recreate). Fix: moderation lock + bans table + tombstone.
- **M2** Report brigading: 3 fresh accounts hide any sign. Fix: weight by account age, higher threshold, gate.
- **M3** `pos:*` payload identity/name/role/company trusted by receivers; peers map unbounded. Fix: trust only {u,x,z,r,m}; moderate/allowlist; cap peers; validate emoji/coords.
- **M4** Profanity/PII filter trivially bypassed (combining marks, Hangul filler, homoglyphs, `loz`, `đjt`, `gmail chấm com`…); no PII check on name/company.
- **M5** Heavy anon `list_candidates` + uncached SSR/OG. Fix: cached snapshot route, unstable_cache, edge rate limit, split slug/uuid lookup.
- **M6** Recruitment-scam vector: unverified company, unmoderated `hr_contact`. Fix: "HR chưa xác minh" warnings, moderate/validate contact, report HR.

## Low
- L1 `hide_from_ticker` defeated by `candidate.id` in street events.
- L2 CSP `'unsafe-inline'` script; missing base-uri/form-action/object-src; no HSTS/COOP.
- L3 Admin key: no throttle, no min length, no audit log.
- L4 IP hash retention > 24h.
- L5 Contact stays unlocked after decline/expiry/role change.
- L6 `/q/<id>?n=` arbitrary text on brand domain/OG.

## Info
- I1 Realtime "Allow public access" must be OFF; restrict `pos:` topics to known zones.
- I2 deps OK. I3 uids on the wire. I4 presence count inflatable.
