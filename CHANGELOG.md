# Changelog

All notable changes to the **Flywheel Gateway** project are documented in this file.

This project does not use semantic versioning tags or formal releases. Development
is continuous and agent-driven. The changelog is organized by calendar period and
capability area, with commit links into the
[Dicklesworthstone/flywheel_gateway](https://github.com/Dicklesworthstone/flywheel_gateway)
repository.

---

## 2026-03-13 — Housekeeping

### Chores

- Remove stale `a.out` binary and macOS `._` resource fork file
  ([`0e1668a`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/0e1668a845a1d802468c2c214595f8d389b7b531))

---

## 2026-02-20 — 2026-02-22 — License and Dependency Refresh

### Dependencies

- Upgrade 30 dependencies including major bumps: framer-motion v12, zustand v5,
  drizzle-orm v0.45
  ([`e08359e`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/e08359ea30cbe6a2baff1f59bff4238e0dc11d85))

### License

- Adopt MIT with OpenAI/Anthropic Rider
  ([`315afed`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/315afed105e42eeb89b02594d1d4dd716b0d79a2))
- Update README license references
  ([`6cd29c5`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/6cd29c56fd65676cad682e6b0c64cad981718aed))

### Branding

- Add GitHub social preview image (1280x640)
  ([`72fd21c`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/72fd21cc60dac14fa6ee6146d78162abae81a288))

---

## 2026-02-10 — Claude Code WebSocket Driver

### Agent Drivers

- Add Claude Code WebSocket driver supporting `--sdk-url` transport, enabling
  direct WebSocket-based communication with Claude Code agents
  ([`fc9fd4e`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/fc9fd4efb81ba64507baadabf1a69cfa7880186a))

---

## 2026-02-01 — Observability, Pagination, and Resilience

### OpenTelemetry Instrumentation

- Add ADR-009 documenting OpenTelemetry strategy with Bun compatibility details
  ([`cfa374c`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/cfa374c3e86089998fa716dfb27d6460bd672e6b),
   [`44d640c`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/44d640c479ca7d933a3f899367543183e199942f))
- Bootstrap tracing with config flags
  ([`a6bca6a`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/a6bca6a89c9e58d2c7d306af07da9133091a1ed8))
- Instrument HTTP and WebSocket spans
  ([`9f5c0fa`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/9f5c0fa4d9ac8a707290e913fb778df146d0b078))

### Cursor-Based Pagination Migration

- Add `parseListQuery` utility and migrate history cursors
  ([`5a92c5e`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/5a92c5e3f41d616efc66d1ab6561232c590b6013))
- Migrate `/jobs` pagination
  ([`6be1306`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/6be1306615d03b698a192de29302ce247eed5aff))
- Migrate `/agents` list pagination
  ([`836ce05`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/836ce054e8c6311cced86167b381a4053e521e05))

### WebSocket Durability

- Add WebSocket event log persistence for replay durability
  ([`1e58005`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/1e580059163abe6754f4261202271f2aae8bdf9b))
- Add automated cleanup job with retention policies
  ([`afe1345`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/afe134558e853eb28a701ff05f9b8e6baad1e32f))
- Durable WS replay/backfill
  ([`1b7bc0c`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/1b7bc0cad2ab8fcabd575946b55bb1d799101091))
- Durable WebSocket event replay system
  ([`0fc9812`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/0fc981295b140e756c11965fe6d389421682bbbe))

### Alert Notifications

- Add multi-channel alert notification system
  ([`3e4aa5c`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/3e4aa5c9c40f0490d40b77a7e83ba52d6d72fd91))
- Enhance alert channel notification adapters
  ([`08bb791`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/08bb791a8abbf5d8bbc12ba25c2653006bf9f173))

### Graceful Shutdown

- ADR-008: shutdown coordinator design
  ([`a8895d7`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/a8895d7ba3a60e37b9ce4d8898c7c340820fc255))
- Graceful shutdown drain
  ([`c94fae5`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/c94fae54ea7f017debd2cdeb5f50dfb653de2068))
- Maintenance broadcast and drain-close for WebSocket
  ([`0330c0d`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/0330c0db9d213a25818be198af1abf7107a3fd54))

### Circuit Breaker

- Enhance circuit breaker with HALF_OPEN probes and expanded service tests
  ([`68ffb6f`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/68ffb6f99172a202379d8f92705eed0c5eb32486))

### Fixes

- Logger recursion and TextWidget ordered lists
  ([`b1d1e94`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/b1d1e94cbe2ca9222c5734c047566ee628906587))
- WebSocket config normalization and safer overflow handling
  ([`47f0ccc`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/47f0cccfdeef7ce9560417ea0c8cbea4e74171d9))
- Avoid UBS hardcoded-secret false positives in tests
  ([`5c78bdc`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/5c78bdc0b833166e869431d89cd623308b648726))

---

## 2026-01-31 — Security Hardening, Admin Auth, and Agent Health

### Admin and Secrets

- Admin-gate privileged routes with startup fail-fast
  ([`38cc7b4`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/38cc7b4f170cb5da895e8a75f488d1ec3d9ade38))
- Add secrets provider for tool credentials
  ([`b44aff9`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/b44aff9d411505a49409960cb24a099b77173d1d))
- Maintenance mode API with HTTP guard
  ([`a584835`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/a584835fe276b2e66534f0b6fdaa9b88757ebfa2))

### Agent Health

- Agent health score API and WebSocket endpoint
  ([`92d53be`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/92d53beb9d37058b8c00237f5a586de0f124748a))
- System circuits WebSocket and health endpoint
  ([`55ce609`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/55ce609a804b2d9dd90a2c3ecc12253d24c7efa7))
- Claude SDK health check via `/v1/models`
  ([`f554e88`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/f554e88ef2a3c943943dc05f22dcb67e2bb58d24))

### Rate Limiting

- Rate limit keying and config env overrides
  ([`b9d3ba7`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/b9d3ba7633b67b45dfc781c70b74c0451fae264c))

### Error Handling

- Add global error handler middleware
  ([`94b4e90`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/94b4e9052244a501ee4511b554448cf31ca54128))
- Extract shared `createRouteErrorHandler` utility
  ([`fd23661`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/fd2366136f3b030ea9a54fc7184889abff8e0abc))
- Add `GatewayError` serialization helper
  ([`a104d5e`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/a104d5e455f24c32bc8e183cef185b18eeb78d61))

### Security Fixes

- Redact private overlay YAML parse errors
  ([`33d4b5e`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/33d4b5e9f6918c22c548b6b01ef0aa95154e63ac))
- Redact `secrets.yaml` parse errors
  ([`4c58791`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/4c5879175fa452492c521b117786e12ad73324ce))
- Circuit breaker treats unhealthy checks as failures
  ([`d30d2c0`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/d30d2c035612f99c692e6fcdd11035c6b61526d7))

### Code Quality

- Eliminate loose equality operators across codebase
  ([`9d2ad61`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/9d2ad61807c29cab6b4ca0e6d35fe219837039ab))
- Replace loose null checks
  ([`4e41524`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/4e41524da6ab3da6a0c5231dcae2ef5a314f31fd))
- Fix agent-state TERMINATING transitions from early lifecycle states
  ([`953e177`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/953e177e0ce1504c5e3a556fb5c0cafc48fa03fb))
- Remove double JSON stringification in safety violations
  ([`4ac0af1`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/4ac0af1f6f8206716d9453aa4ff966e03e89b1cf))

### React Compiler

- Add `'use no memo'` directive to React hooks and components, then revert
  ([`35c0c99`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/35c0c993598d1d5b168fc32acabcba81e43956e0),
   [`9b8b4e8`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/9b8b4e8574cdd23178938728e2175a8ac71ba21e))
- Fix `setLoading` placement and scope React Compiler to components
  ([`3d42ce6`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/3d42ce612fef6c40f077a4b3b80812deb9480b0e))

---

## 2026-01-30 — Massive Hardening Sprint

This date represents the largest concentration of work in the project history,
with 200+ commits spanning security hardening, null-safety, test infrastructure,
dashboard widgets, and operational improvements.

### Security

- Constant-time auth and deterministic checkpoint ordering
  ([`6df2048`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/6df20487a7d5869f21ec1fb201c62e35141eb1ba))
- Harden SSRF protection and fix timeout error handling
  ([`eed055c`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/eed055c2a91d25fa577979282617e7fd86666fbc))
- SSRF protection with Slack `mrkdwn` escaping
  ([`634f0ce`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/634f0ce54aff6d4b2aa3e47effabab714cc40b5b))
- Sanitize error messages in context, DCG, knowledge, CLI wrapper, and health routes
  ([`5ea8405`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/5ea8405663da09954e3f8fe288c91e2ad43267e7),
   [`88cc2f9`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/88cc2f91ce5ee27b3aad275efe3adb79b67f8b30),
   [`a44d280`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/a44d280d9554e25833250b19abd55627a87cab42))
- Block full `127.x.x.x` loopback range and fix WebSocket race
  ([`d99d0a7`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/d99d0a784612c26e0d7e833ed38c4965ef9e1d1b))
- Deep-audit hardening pass
  ([`c094153`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/c094153abf62f34015bc4c9d1f69280b5e19f71b))
- Tighten user auth and JSON parse
  ([`4e74bdb`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/4e74bdb469fe4c608040bb239a0ddc689465dc41))
- Add REST auth middleware
  ([`bb7aed1`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/bb7aed1abf036f6893e744307e4fb0fde9e0031b))
- ReDoS protection for custom regex patterns in history extraction
  ([`58247d2`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/58247d2900d91b5b3dd52878db53dbb47d949fe1))
- Docs-friendly CSP for `/docs` and `/redoc`
  ([`bde51d1`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/bde51d1168d49d00b66a54839effe921ee37fca0))

### Reliability

- Fix TOCTOU race condition in approval/ru-sync and DB update on failure
  ([`ed57397`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/ed5739746f80a03e992dab64ec5f34aa7cffa522))
- Add subprocess timeout and checkpoint overlap guard
  ([`11eeabd`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/11eeabd342f807733fb446a0057110f1b1703db1))
- Input bounds for DoS prevention
  ([`801d7a0`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/801d7a019cf02efb593d6e3eb449a83f4fab9e43))
- Bounds to prevent unbounded memory growth
  ([`4be8e5c`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/4be8e5ce551ddd798203aa5431e5ef057cd7e1fc))
- Export jobs `Map` cleanup to prevent memory leak
  ([`7f538ab`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/7f538ab3d65611eae844e69ae80773f387d94ca9))
- Job retry backoff respect
  ([`4ab6281`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/4ab6281dc6b57417ec8833d8002594c3e7b93b64))
- Properly kill timed-out CLI processes and prevent unhandled rejections
  ([`07e94a3`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/07e94a3d16b8c784fe8886e45f1312fd44e19cb3))
- Immutable listener arrays and safe index updates for concurrency
  ([`7b48e07`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/7b48e0788a941d32881ea5513f8889cddca48207))
- Fix concurrent duplicate hang when response not cached
  ([`31f739f`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/31f739fa16719cda1f95e1e6fbc881276b57ac7e))
- Ensure `reader.releaseLock()` called in SSE stream handling
  ([`542c193`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/542c193486c7e9ce19776ed3c71e0523c6971093))

### Null Safety

- Eliminate non-null assertions with safer alternatives across codebase
  ([`1b5272a`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/1b5272af0462b44a1e895e14af50012da2f02ad3),
   [`c5e4da3`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/c5e4da38a9a7b7f45399c98c6cb4802a9ce529aa),
   [`d2e817f`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/d2e817f54caf6dec226e707699599de22ad78756))
- Fix unsafe non-null assertions in `cursor.ts`
  ([`667965c`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/667965c59d36b6946687a1acb3d0917f8ec6fd0b))
- Add null safety checks to cost forecasting and metrics
  ([`75652c4`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/75652c441f32b632d15aa0d026f442618f7978ac))

### Dashboard and Frontend

- Implement HeatmapWidget for dashboard
  ([`98ea351`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/98ea351288bd218af7578319435dc7ec89a491bb))
- Add granular permission management for viewers and editors
  ([`bb060f0`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/bb060f0523c799334ad6ad644f6c75035baaeeea))
- Accessibility and code quality improvements across web app
  ([`d8afea1`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/d8afea15441552eb96f5741ef80731724e4c4906))
- Fix Biome a11y lint errors in chart components
  ([`754b1bc`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/754b1bc92d0d8449ce85772e643fd10147caab78))
- Improve auth middleware and WebSocket hub
  ([`c5f9164`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/c5f9164c3ca7b34924847ba2410d44bf19baa0ee))

### WebSocket Fixes

- Avoid double-send on reconnect
  ([`71e8ca0`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/71e8ca09946a9d9dbe98bd32f9019efd01b6cde6))
- Stable cost records cursor pagination
  ([`8112f1f`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/8112f1fed194a24c683c4b8ee8ad0ac15b4b2648))
- Update subscription cursor after backfill delivery
  ([`ecbcdf1`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/ecbcdf1d931b5c4fb7bdc8195dcef8c1952b0dd6))

### Checkpoint and Context

- Preserve delta chain parents during pruning
  ([`eb567bd`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/eb567bda0e93db9ab64855fb1679e17df6ae9de7))
- Timer cleanup and delta chain protection
  ([`6e28447`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/6e284477438144472294a0d7346776607f1f27ae))
- Guard context rotation `maxTokens`
  ([`ea2af7d`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/ea2af7d04627ae20b06dc6b21f2cb96f07217201))
- Performance monitor stop guard
  ([`8112b72`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/8112b723e9347868e0846f21c56963d9fdf40a46))

### Agent Health and Detection

- Correct Agent Mail capability detection env vars
  ([`9ebe106`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/9ebe10642d40cd3b2e40a86998f32694e692d59d))
- Fix idempotency expiration edge cases and chart scaling
  ([`9188fa9`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/9188fa92c7b582ce7e721a2635b86abb03a5600f))
- Auth-scoped idempotency keys
  ([`3688b4b`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/3688b4be6504dea66e445ad0137bbc4f6dc1d1cc))

### Operational

- Gate setup installs
  ([`4cd4f02`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/4cd4f022f4ae522956ed300330c60d800bce01b4))
- Fix git status parsing and keyboard shortcut modifier matching
  ([`9830a2c`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/9830a2c41b41074eba0cb5e85d98de64a97c3dd5))
- Prioritize admin user override check in `getRequestUserId`
  ([`1d949f3`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/1d949f3069c3be4ed7b6cccb0b7c80ab113602f0))
- Harden Slack notification with header truncation and URL masking
  ([`4040342`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/4040342ba0bc51f489c8f92410492302f728fb74))
- Extract URL security utilities to shared module
  ([`6725e96`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/6725e9698a7f1d8e489d9bf8fe701872baf6c8bf))

---

## 2026-01-29 — Slack Notifications, Test Infrastructure, and Safety

### Slack and Webhook Notifications

- Implement Slack Block Kit and webhook HMAC signatures
  ([`5ab4c6a`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/5ab4c6a986e2ec72357255e22a2c5a001f95d950))
- Add AbortSignal support to event subscription
  ([`e31c77c`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/e31c77c79cc997f65c0d20aa6518e4382f9ed1da))

### Safety and Security

- Prevent TOCTOU race in agent subscribe on termination
  ([`5169b3a`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/5169b3a443b416181e57b71a919d9c0e05e99ed2))
- Sanitize TextWidget markdown hrefs
  ([`ef3cc6c`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/ef3cc6cdac0420ef2ade7e70eb4d79c67cbec0cc))
- Atomic `tryConsume()` for rate limiting to prevent race condition bypass
  ([`35d2feb`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/35d2feb8034a97ef67ed68381c3c8e4664449be3))
- WebSocket auth hardening and cleanup jobs
  ([`0cbb67e`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/0cbb67e952ffa57301959a3e59b88e3c5d13dad2))
- Guard remaining `parseInt` calls against NaN
  ([`e991d95`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/e991d9589885846ea7ab714fb84444b3880a9881))
- Validate `Date`/`parseInt` from query params and fix `sendList` call
  ([`1824aa8`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/1824aa86dd19b31f04cd9a876573893fb73ba107))

### Test Infrastructure

- Comprehensive test refactoring and service improvements
  ([`52db1b1`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/52db1b1530cf8f95dd27edac9d5fd09ff2f2c5e1))
- Default DB to `:memory:` in Bun tests
  ([`6951024`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/6951024b271e6990ee347500874374f37c2ff664))
- Fix contract test typecheck issues
  ([`45a1bfb`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/45a1bfbc71dac13f420f6a94278fc252d5319d0e))
- Correct test runner invocation and simplify test glob
  ([`5119d7f`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/5119d7f60f1e30cea367268f4796e1cec69aef28))

### Agent Drivers

- Safe transform expressions, zombie detection, and agent spawn improvements
  ([`3050a60`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/3050a600f190acf49109e3370ea0074ea5a05eee))
- NTM driver additional test coverage
  ([`b8654ee`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/b8654ee8ee1dd338d39e368c55a090bab56aad20))

### Frontend

- Mock data fallback indicator and toast notifications
  ([`3eedfea`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/3eedfea501e0b2a41668d36138c80d0219eda995))
- Unmount guards to device code flow callbacks
  ([`60cda81`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/60cda81b86720d8b5b9cb73173268e70f382968e))
- Atomic SQL `json_set` for history replay count increment
  ([`0bec725`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/0bec725a982efe1797a6c8c872b74d280b2929cd))

### Services

- Secret loader service for tool credentials
  ([`b11187d`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/b11187d0edc2b080d4cbeeed0e10214ef3516d1e))
- Private overlay service for manifest overrides
  ([`1ce7ea6`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/1ce7ea642032ae85027f20a9793db38418344a60))
- Auto-migration, zero-division guard, `exactOptionalPropertyTypes` hardening
  ([`6c650b7`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/6c650b7b5a5f53d159cf11c5c6ec1d1904cbdca3))
- Collab WebSocket subscription refactored to use central hub
  ([`2bcc18e`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/2bcc18e7de4bce77b7205ba131f67831d14be1a1))
- Command categorization for task-type analytics
  ([`3cff1e9`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/3cff1e983c75dbcd58644115548eab0c700139fd))

---

## 2026-01-28 — Tool Ecosystem, Testing, and UI Pages

### Tool Registry and ACFS Integration

- ACFS manifest loader
  ([`7a144f7`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/7a144f7c4d4fddf8597e6d7b3401c9367dbc8d3f))
- Tool registry types
  ([`3565c9c`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/3565c9cf2597ba229bc333fb3ffcfa3cdbebcb1f))
- Manifest parser and normalization unit tests
  ([`48fb7dd`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/48fb7dd53cd17a80c00dafd1bfdadc1c8d1c5666))
- Registry compatibility layer with deprecation tracking
  ([`d24c266`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/d24c26606ee2c6075500051f409d8934d8c59eb2))
- Robot mode and MCP server capability specs
  ([`ff9d784`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/ff9d7842f590d8e29965e38b6995d5d2213781c5))
- TOON output parser and normalization utilities
  ([`5c1e80b`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/5c1e80bcf3fc7e0dd920a41b0d5261ab7019f343))

### UI Pages

- Add CM (Credential Manager) page
  ([`cc4c4e2`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/cc4c4e23ba199d0f2935c97701455f4d5250a2bd))
- Add NTM, CASS, and SLB UI pages
  ([`e01b79e`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/e01b79e6acc8735d660eab9c62fb06636bc823f0))
- Utilities page with giil/csctf/xf/pt workflows
  ([`9a73ddd`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/9a73ddd2a0cb049d150cddea73602b2d3c951625))

### Testing

- Circuit breaker for tool health checks
  ([`af077fa`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/af077fabf4ef5627c7514a38b9ce16b7df8dfcb9))
- WebSocket event loss telemetry for ring buffers
  ([`9353491`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/935349139bf9b848e8e1b8e2ed5c9c99a615e81e))
- Agent lifecycle E2E tests with rich logging
  ([`5001ca2`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/5001ca22662c7e137789067488faf03f9402e692))
- DCG block/approve + audit trail E2E tests
  ([`d818a6b`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/d818a6b832ca4486ad17f7cb65c01d7a2760e029))
- Service-layer integration tests with real DB
  ([`f2f069c`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/f2f069c1df36bc8a4d14ec31fcb30644f46f4b46))
- Setup-readiness integration tests
  ([`d81db5c`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/d81db5c2820705a6475d69bd3561a88bf6a42323))
- E2E runner with seeded temp DB
  ([`8386727`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/838672770e23976bbbe9d9b4bde609e7c8bce03d))
- Coverage gates and E2E artifact retention in CI
  ([`ec95152`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/ec951525c8987d0920f56f4b362a73aa4ebca9fc))
- Deterministic runtime controls for tests
  ([`8d5a446`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/8d5a446c735a8acc8a7c1ab6242cfcb9bff437fd))
- Real DB + service test harness
  ([`b2a1117`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/b2a111707e68ca829d4b36c237899854e23762c9))

### Client Libraries

- NTM client `projectHealth`, `alerts`, `activity` methods
  ([`c320bb6`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/c320bb6b0f1006fb3d70d0687643b7fc159046f8))
- 7 new Agent Mail client methods and gateway routes
  ([`ab648bb`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/ab648bbff16ef04e5a3a79a6aeff2f519a5bfbee))
- Install plan computation and remediation guidance
  ([`12b0d33`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/12b0d33b35cec401a187899a908ad0e18a434948))

### Health and Diagnostics

- Dependency-aware tool health diagnostics
  ([`68d164b`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/68d164b722a2868c8f2402f861d59808c0a1cdd1))
- Expand tool ecosystem detection and metrics
  ([`096a074`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/096a0743857ede73b571f297bfcce3cd9287b018))
- Unified tool unavailability taxonomy and error mapping
  ([`4a3c6e5`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/4a3c6e53a1fffa6ea857fcfd744720aa8410c02f))

---

## 2026-01-27 — NTM Driver, RU Client, Fleet Management

### NTM (Node Task Manager) Driver

- Implement NTM `AgentDriver`
  ([`775bcf9`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/775bcf9de474eb3ee2ee9242c24eeb67490e34c8))
- NTM-based work detection patterns
  ([`d6f7000`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/d6f700034215d0484f0568fdaae9afd01a2bb49b))
- NTM ingest: mark gateway agents as terminated when they disappear
  ([`117c877`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/117c877b3b9b3229d61c82edabc3e9de53fdeb22))
- NTM reference implementations
  ([`8383597`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/8383597c5b36da60765fe27d5c58356062d6d274))

### RU (Repo Updater) Client

- Add RU client to flywheel-clients package
  ([`fc3613e`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/fc3613e9612d4673038fe7234be50b9c2f0c5f1e))
- Fix `sweepPhase3` CLI argument format
  ([`d610e23`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/d610e236c12c648cefdc76478362d45efc73c3ce))
- Comprehensive unit tests for RU client
  ([`18d5ee8`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/18d5ee89330eaded45e76d86a9a1c2940d582ba1))

### Fleet and REST Routes

- REST routes for tool integrations
  ([`f465d64`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/f465d649bc6367bc47aa01839cc81e115f08ab62))
- `GET /setup/registry` endpoint and golden fixtures
  ([`6db4f56`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/6db4f5697f590254050c390d4a339d782caba05a))
- OpenAPI schema generation and comprehensive contract tests
  ([`700fcc9`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/700fcc9143da18ddce0362d90891e269d9874783))
- Observability instrumentation for snapshot and NTM services
  ([`308255b`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/308255b9faf6931994049724ad6dd97981aaf052))

### Agent Drivers and Safety

- `readStreamSafe()` for bounded stream reading (prevents memory exhaustion)
  ([`4f720c6`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/4f720c6ded24d180925c31f1b6f3436fa5560c8a))
- Prevent stack overflow from large output chunks in agent health
  ([`856eb45`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/856eb45c770e3bd7f0be36744ddf029175aef631))
- Admin authentication via `GATEWAY_ADMIN_KEY`
  ([`ebb2427`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/ebb242741a4e1f2fe029d0f3f218b66fda51110d))
- Conversation history passthrough for resumption
  ([`58a8080`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/58a80806257a9a9384f3fc7e2413e2d850fda71e))
- Persist safety configs and violations to database
  ([`3cf63c0`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/3cf63c0efbc769e86e1d94abc495cca34470acff))

### Documentation

- ADR: CLI logging standards
  ([`f788224`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/f78822471a674ff7394ee1e2636d5a3b5cee4aec))
- ADR: tool JSON schema versioning policy
  ([`24c0ba6`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/24c0ba6cee2e2650ca867a5eb71acfc0930fa18e))
- Snapshot latency budget and caching policy
  ([`4295f90`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/4295f90f61c6fdcafe84ff5682665c75214d109e))
- Gateway module map and integration coverage audit
  ([`a21736d`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/a21736d7a0fc3e82c28d39b07af58ab4f36b749e))

---

## 2026-01-22 — 2026-01-24 — Beads Integration and TypeScript Strictness

### Beads Routes and Schemas

- Add Beads (BR/BV) schemas and OpenAPI generation
  ([`753424b`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/753424b6468e1099ec3c02bccb0fddb36e3d0567))
- Extend beads routes and API schemas
  ([`955005e`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/955005e988728a67bff35e3344b8c65c60ac916f))
- Beads filter parity tests
  ([`487c044`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/487c04444d8dc27eba4ece112f9b7e85fb860158))

### Tool Registry

- Improve tool registry and setup UX
  ([`91569cc`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/91569cc1eece04441090b5a897694c6a44338816))
- Enhance service layer with improved CLI integration
  ([`c733660`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/c73366006ac63b30d25013f1e095966511f89e50))

### TypeScript Strictness

- Resolve `exactOptionalPropertyTypes` errors across packages
  ([`a54dbbf`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/a54dbbf2735625886093ee7a449c25b2fe068702),
   [`ee96a67`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/ee96a6701a97d4ea1e39d7142ff8974ba0c04958))

### API Documentation

- API documentation and contract test infrastructure
  ([`e439efc`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/e439efc39f8c0b3e4c8834099eb1776aa5b554e5))
- Setup readiness/install test harness
  ([`9f91cbb`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/9f91cbb478d597fc0f2bfdae631d6fbde56f8729))

---

## 2026-01-21 — NTM Integration, Collaboration, and Dashboard Builder

### NTM Integration

- NTM client integration and expand tool registry
  ([`c4bf2f6`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/c4bf2f6461f8ec8e2de0b67c19637d71c0bb42a9))
- NTM driver and update checker service
  ([`72b9b7d`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/72b9b7dc54fe04f8385bcf87a9cd8b11e3d21b44))
- APR and MS client additions
  ([`d7b847e`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/d7b847e8ec47493996228c5192812aeb739c4b6f))

### Refactoring to Tool Registry

- Refactor `setup.service.ts` to use ToolRegistry as primary source
  ([`167b262`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/167b26214ac1ea1c882facd69bd6ed4d74b82dfa))
- Refactor `agent-detection.service.ts` to use ToolRegistry
  ([`543e046`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/543e0464fa91ad3f673fbe3ce9cbf4aae35958dc))

### Agent Collaboration

- Agent health monitoring service
  ([`447d272`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/447d2724c3d68dacd1dd0492679228dc4de1d003))
- Graph visualization support for beads routes
  ([`226bb6a`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/226bb6a36aaf4eaf25d2b6dcaf3cf24008ac47f1))
- Snapshot summary panel for dashboard
  ([`8f13c82`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/8f13c82d6b6c4bb5564e9f9e30ab329359904633))

### Dashboard

- Custom Dashboard Builder
  ([`aad3bd9`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/aad3bd94f1282bd6e18182789618769351d8283b))
- Cost analytics frontend and comprehensive documentation
  ([`161d5a6`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/161d5a6f9b673c57ec0caaaa7911ce089e719d01))
- CAAM account management UI with device code flow
  ([`31f4877`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/31f48778215d48f72ac1000a110c584987498ca8))

### Safety and Pipelines

- SLB safety guardrails
  ([`11d841a`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/11d841aae99d694cfc22f3efea923906565d467d))
- Intelligent Conflict Resolution Assistant
  ([`ab6fbb5`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/ab6fbb51ad38a9f48ffc38ef4e474e070f68d8bd))
- First-Class Session Handoff Protocol
  ([`36ff136`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/36ff1363767a0322d22d7c3f07cce9b7c336aa5a))
- NTM alerting rules and safety posture monitoring tests
  ([`1d22ece`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/1d22ece762473f9f1fab8b6194e958a63136a0cd),
   [`3256e81`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/3256e813f75cb05786e63a08b55e78c51b3bcba1))

---

## 2026-01-20 — E2E, Idempotency, and Reservation Fixes

### E2E Testing

- Playwright E2E tests for agent lifecycle and DCG workflow
  ([`a4a2c0b`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/a4a2c0bc85e1916a4580502570dc837f54083c58))
- Harden Playwright E2E harness
  ([`050be1a`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/050be1a04574e03e231a36bb5e261ad59a773ab6))

### Idempotency

- Handle binary request bodies in idempotency middleware
  ([`a757709`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/a757709f3cd612c1791a618e0148a7b6978a7239))
- Optimize idempotency middleware memory cleanup
  ([`c1165a2`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/c1165a2375591a0f0571997f2a7e8c0955774bc2))

### Fixes

- DCG pagination and cache invalidation
  ([`f2ad053`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/f2ad053b7bc9ed3ba21e283711c0accb46d5729b))
- Pagination and checkpoint token restore
  ([`8880b91`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/8880b918a5494460e17b79bc4d9295ef2d0a6db4))
- Accumulate token usage instead of replacing
  ([`8475afd`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/8475afdb0b61883cfe2062022f6b9d3357619e78))
- Dashboard widget ID generation when blank
  ([`5d7e262`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/5d7e262f6044798eaa5431d88e6e22ebb6ad66ce))

---

## 2026-01-18 — Lint and CI Hardening

- Improve GitHub Actions workflows with best practices
  ([`1668a4b`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/1668a4b38e02a68759adfdc944355c8d5cfc18a3))
- Clear `setTimeout` in `Promise.race` patterns to prevent memory leaks
  ([`4fddfcb`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/4fddfcb04f79f8e5697b35da1e706b32491564dd))
- Capture Drizzle `query.limit()` return value
  ([`9f83e31`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/9f83e315db8c53c6c83fe3010569e7a65a9529ae))
- Fix DCG service test failures
  ([`7903698`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/790369890b1408523b6970ebcce4c5e832604fdd))

---

## 2026-01-17 — CLI, Installer, WebSocket Reconnect, and Tailwind 4

### Flywheel CLI

- Add `flywheel` operator CLI with `doctor`, `status`, `open` commands
  ([`afbd633`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/afbd633c312e4305d05c6f95544191a525c7ef20))
- Add `install.sh` with self-update and `flywheel update` command
  ([`b092f19`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/b092f19ef47518669ccad812de4cbdda3b219c6e))
- GitHub checksummed releases with auto-update
  ([`d8b0c54`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/d8b0c542a0bfa2495d6764da21a52c5f9793ec2e))

### WebSocket

- `WebSocketClient` class and reconnect unit tests
  ([`f181984`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/f181984455839e6e841f99402e26d8a9da2712ae))
- Complete WebSocket auto-reconnect integration
  ([`b48dd05`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/b48dd052245ec3d5570ad632fad8c8f725c8f3f4))

### Frontend

- Tailwind CSS 4 with `@theme` tokens
  ([`6149f12`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/6149f127655106d6054e49f0505b1d41fb745cfa))
- Tailwind CSS 4 Vite plugin integration
  ([`7249cbc`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/7249cbcc4efc28adf3f5484d19dabe788980bede))
- TanStack Query optimal caching defaults
  ([`4aa34f3`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/4aa34f375088bc0d3882290c842ec49e16fb0464))
- System color scheme auto-detection
  ([`48688a1`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/48688a1c09605966bef93bdcad22921125071dda))
- Enable React Compiler for automatic memoization
  ([`fd73161`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/fd73161c2e2ddd73959e501a8e6ad36c42d70fec))
- Setup wizard with step-based content and animations
  ([`8abf7a5`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/8abf7a57c269250b1df600b943fec98f2b0466e4))

### Gateway Services

- `flywheel.config.ts` configuration file support
  ([`c7e00e7`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/c7e00e7a6fb589e53c88b14b387a97a206e43c8f))
- Analytics query caching layer
  ([`01bd3e3`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/01bd3e3803df1c19e5ab20a9e59b7ce3f94cde3d))
- Integrate `meta_skill` (MS) knowledge management service
  ([`6548e34`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/6548e345e0a386fe65acd9b7844c730dfc981701))
- Integrate `process_triage` (PT) service for stuck process management
  ([`81cdf29`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/81cdf294f66b4ce15d683ba223ce400ae8a821b3))
- Fix ID generation modulo bias for cryptographic uniformity
  ([`442b888`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/442b888ccc44b0dba764f7ebc48c6f7234d53360))

---

## 2026-01-16 — Setup Wizard, SLB, and APR Integration

### Setup Wizard

- Setup wizard API endpoints
  ([`896375c`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/896375cb789fc13e3e7697643f27db5f83123792))
- Agent CLI auto-detection service and endpoint
  ([`9d1b6fd`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/9d1b6fdfad0bc6681542e8b690a17e8b3cefc553))

### Integrations

- SLB (Simultaneous Launch Button) approval service
  ([`cee81bd`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/cee81bd7160c98e952f80eadf1625c4065f0900f))
- Automated Plan Reviser (APR) CLI integration
  ([`2cef00e`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/2cef00e6c14584371bb4f1c4011b8cbdf8888219))
- `jeffreysprompts` (JFP) prompt library integration
  ([`ad1c08b`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/ad1c08bcd08844cc649419006ddf595d41534532))

### Health

- `/health/detailed` endpoint for comprehensive system health
  ([`a1972d5`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/a1972d5932e597ad156679e95c30d5c491083b3e))
- `ErrorCategory` type and `recoverable` field for API errors
  ([`3d948f7`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/3d948f766a6636473b4a3b688a7d9cc262d4e438))

### Frontend

- React Compiler with stats logging and CI rollback testing
  ([`586cc05`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/586cc055f4edd9e81ed592da2570807682783829))
- Keyboard handlers for accessibility
  ([`6b16a23`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/6b16a23d54f519e0cce6c4654c5593bfc5c2d514))

### Fixes

- Reservation conflict detection for intersecting wildcards
  ([`d282e24`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/d282e24840645863c45ad75aa56a9fb387462f4a))
- Daily budget projection logic bug with regression test
  ([`7c9d5fe`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/7c9d5fe2aa25aa963444469fc5e557fb0ec3e785))
- Allow READY and PAUSED states to transition to FAILED
  ([`073e4bb`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/073e4bb188553d94055e2a5d20256eab11343644))
- Checkpoint hash stability for Dates and undefined values
  ([`ce4bcf3`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/ce4bcf3847423962efdf2f23b30bd94d15e5ccb5))

---

## 2026-01-15 — Real-Time Notifications and Security Consolidation

### Notifications

- Real-time notification delivery via WebSocket hub
  ([`8211e86`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/8211e8657188ad889161206147c5ca8c81dc061c))
- Expand WebSocket ring buffer configs and improve reconnect auth
  ([`15e8470`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/15e847074aa5ce5edcd0e649026263c5a1da7e79))

### Agent Lifecycle

- Agent state lifecycle management and cleanup
  ([`cebcba3`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/cebcba3f09326cf8cf23cc3072a32b54be736f0c))
- Isolate pipeline step state per run for concurrent execution
  ([`a6cf41a`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/a6cf41a1655e32bfe092dd59c1b006dd38b81d65))

### DCG

- DCG command storage with database-backed pagination
  ([`b6c5b98`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/b6c5b9891e13f3d9a053ab859bb1413f94bb2248))
- AgentMail MCP config validation and debug logging
  ([`735a916`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/735a916ddc62402c29a7f2b726c40100096a5c66))

### Fixes

- Job Service concurrency race and zombie job recovery
  ([`978a5df`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/978a5dfdf7b88c00f55bfe65a8a5aa02f6555466))
- Audit redaction vulnerabilities and consolidation
  ([`859fa97`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/859fa97b81b3109fa0b55ce4b965d21903539044))
- Eliminate ID generation modulo bias in agent-drivers
  ([`2ea2829`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/2ea2829a82f637b8684c8474927c44a67e62d71e))
- Simplify ID generation using `crypto.randomUUID`
  ([`26258f1`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/26258f1ea769139ec4d26a55432867931665d3ef))

---

## 2026-01-14 — Lint Sweep and Performance

### Lint

- Fix 194 Biome lint errors
  ([`5c436b1`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/5c436b12c78716a2129789c48071caee8ce03667))
- Complete Biome linting fixes to zero errors
  ([`ec66486`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/ec664869581047861658a9f6c90a6a805dde30c0))
- Add `aria-hidden` to decorative icons
  ([`e30e056`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/e30e0569165da2889440131ebd7ae3d6b59bdaae))

### Fixes

- Critical logic bugs in Budget and DCG services
  ([`ed83f15`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/ed83f157f97d27bc2888897227644d5e8a3e8753))
- Optimize N+1 queries and improve cleanup tracking
  ([`0a53a5f`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/0a53a5f5903af6e2b7e21cc836d5835b752282f4))
- Prevent memory leaks and division by zero
  ([`a901a30`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/a901a30ad684908e4efaa43589f9a7c0f680b7eb))
- Exhaustive type check for `canPublish` authorization
  ([`6e9591a`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/6e9591aafb2ba6cd987195b35ad3ee44cd8b1852))

---

## 2026-01-13 — TypeScript Strictness Campaign

- Complete TypeScript strictness fixes for 298 errors
  ([`bcfacb5`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/bcfacb55e803c2eaaba6620a9173ecfe05a65d87))

---

## 2026-01-12 — Core Platform Build-Out

This date represents the platform's most intensive development sprint, with
350+ commits building out the majority of the gateway's service layer, frontend,
pipeline engine, and collaboration features.

### Pipeline and Workflow Engine

- Pipeline and Workflow Engine
  ([`2ba26d0`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/2ba26d0e948efb3f1c37a4492c6c19f0377a6b23))
- Pipeline Engine with DB persistence and new step types
  ([`e27e88a`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/e27e88a248b9cdf38027db224322deeac10b9a0f))
- Job orchestration for long-running operations
  ([`37d600e`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/37d600e1b137c936c2e1db74241000dac7886daa))

### Context and Health Management

- Auto-healing context window management
  ([`dc33d56`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/dc33d56eba368039bde31137284261a1869a3929))
- Health endpoints with version, uptime, and capabilities
  ([`e3fd727`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/e3fd727835f9a8c8790269879daa4012631272ea))

### Dashboard and UI

- Pipeline Engine frontend UI
  ([`1d2b73a`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/1d2b73ae3a82af1a5c1b2bb0188443d8cb273efc))
- Flywheel Velocity Dashboard
  ([`90e2b52`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/90e2b5292258d6f501a2049f1ca8a65db2c41ef2))
- DCG frontend dashboard with comprehensive controls
  ([`d6e0231`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/d6e023172c6424c15d88e42eb61855e8beb46f37))
- Fleet dashboard for RU repository management
  ([`fae29c0`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/fae29c02b2120c13a0f9483111c9d044ee990db2))
- Real-Time Agent Collaboration Graph
  ([`1da22d1`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/1da22d15da965009b93798206611d042eba4c165))
- OpenAPI schemas from Zod validators
  ([`e75a506`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/e75a506e03f366c758bbd4a9f801681aa519f2bd))
- Notification UI components
  ([`5af66ac`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/5af66acc7e43596ecc52a2e30807af62c8810636))
- Cost analytics frontend
  ([`161d5a6`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/161d5a6f9b673c57ec0caaaa7911ce089e719d01))
- Mobile optimization
  ([`aec1949`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/aec1949eaf01b9fb2ca7ed12b234a3eb4acd5d2f))
- Performance optimization (virtualization, lazy loading)
  ([`46120c6`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/46120c626784cb8edad30af44e5df7b3382e5116))

### Services

- Supervisor daemon management service
  ([`591f7ba`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/591f7baa8de8e51184451ce837b9a0931dff9954))
- Agent performance analytics service
  ([`e3831b5`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/e3831b577b21d7d1a219e727dfbb0b9fdf0c20a0))
- CASS-Memory (CM) integration
  ([`9eafbfb`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/9eafbfb148405055057ca8ede41b3b9bd5624684))
- Git Coordination Service
  ([`64030a7`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/64030a71fbf2116f0c53864457f54d3be7742e85))
- Comprehensive notification system
  ([`0b084fa`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/0b084faf475de3419a176df679573e60d9032da3))
- Collaboration graph WebSocket events
  ([`5f075ed`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/5f075ed9d04ec29c6cc63c112d97cffc0cfc2253))

### API Design

- HATEOAS link generation utilities and REST API responses
  ([`21563fc`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/21563fcb7da1865c2055b69a7e2f5ccb5c1748ad),
   [`e7ed1e7`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/e7ed1e78d2fb6b2d3369632d8880073ee7bb4ff6))
- Rate limit middleware with headers
  ([`40bb22e`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/40bb22e91cf654423bc0f81e8685db511e74381f))
- Security headers middleware
  ([`4dbe700`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/4dbe7002176d9c7d37b2f0096895b5fc2ebc7d43))
- Standardize HTTP status codes across endpoints
  ([`e65edc8`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/e65edc8937fc6ec3e128decd5c395ff01fbce747))
- Canonical API response envelope types
  ([`162a742`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/162a742ba5a9b357db8627d8a8333ccbfb76efa6))
- WebSocket throttle/backpressure message type
  ([`3acc6c3`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/3acc6c3df3c21109f10526e64aafa1514a8447d7))

### Risk and Testing

- Risk mitigation verification tests and runbooks
  ([`0552dfc`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/0552dfcd58cf3ab34442aa1ed537320c5e2ac6d7))
- Comprehensive testing suite
  ([`c4dd683`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/c4dd683c0c2a8f677c38d4913b50f414dcbc8462))
- Audit trail hardening
  ([`33dbc33`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/33dbc33e91e27d5e5d05d9bb36e4b446dccca665))
- UBS (Ultimate Bug Scanner) client
  ([`0d45589`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/0d455895b08f5b16c0d050cd4a420cd0cb1b3840))
- CM (CASS Memory) unit tests
  ([`bfac865`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/bfac865b51ab7ca2e07503d5b8bf4b349144a23c))

---

## 2026-01-11 — DCG Deep Integration, CASS, and Response Envelopes

### DCG (Destructive Command Guard)

- Deep CLI integration service
  ([`215f3ed`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/215f3ed0ec7b000051d4232f33bb49a23bff2395))
- Database-backed statistics service with trends and time series
  ([`18ed1c8`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/18ed1c86d92f555ef78328c97890a7f10b4b7528))
- Pending exceptions service for allow-once workflow
  ([`fe6fdaa`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/fe6fdaa090215ab24fc4ff7f1870fb6b5fd66034))
- Persistent configuration storage
  ([`832d2a0`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/832d2a0744f633cc5355d1e7b6cd0944286bddca))
- DCG-RU integration service for agent sweeps
  ([`960748a`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/960748aad9bfd4bf02a57faf13aa80c27deffa05))
- DCG integration REST API endpoints
  ([`570b438`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/570b438fba7b08bcf228e824decac2c600c0e991))

### CASS Search

- CASS Search Integration
  ([`37ecf5a`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/37ecf5acc22ff48f7cef94a6a496024066cb5adc))

### RU Fleet Management

- RU service layer for fleet management
  ([`a148c88`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/a148c8802fad6c1e9f0bdb083813d541e485ef76))
- RU fleet management schema tables
  ([`5e8f313`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/5e8f3130d884dd6bf4b4d5f9de25570bb3957ef6))
- WebSocket events for real-time RU updates
  ([`2d3c318`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/2d3c318e1cc0d9f6eb4e8c938f42ecb6938fc0ba))

### WebSocket

- Ack mode for critical topic channels
  ([`a98b734`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/a98b734a0f5703bc0701d6f0142aa7b7435bf5ca))
- AI hints in WebSocket error messages
  ([`0f9cbdb`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/0f9cbdb42a839517e443b8092e4b19040781bd4f))

### API

- Canonical response envelope types and wrapper utilities
  ([`162a742`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/162a742ba5a9b357db8627d8a8333ccbfb76efa6),
   [`9f99f84`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/9f99f848fff24833bd28d9d4edd80b5b3e64372e))
- Update all routes to use canonical response envelope
  ([`180f9c9`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/180f9c936207630930bddc248389d133c73dda98))
- Pagination utilities and DCG error handling
  ([`d3ce374`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/d3ce37468478fb386e6b87f0ebe6e5698418f9c6))
- Cursor-based pagination for checkpoints and multiple endpoints
  ([`d078ddf`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/d078ddffb74d133b1bfb5369ad9cba1824dde369),
   [`7f81785`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/7f817850eeb2a69343f8e685090ae0565f609669))

### UI/UX

- Comprehensive UI/UX enhancement system
  ([`a4c9fd8`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/a4c9fd88cfb4cdcbbcf32b2b8ade8cddaf53bc62))

### Security

- Replace insecure `Math.random()` with `crypto.getRandomValues()` across codebase
  ([`45442df`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/45442df4a8cab7c930a5f5a6b3544393fcdca554),
   [`77dfcac`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/77dfcacd1bb328b245bb4ca3b14d3d7c34e9e845),
   [`b75582e`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/b75582e60ba1320e5df1ccd09b404d587af386da))

### Documentation

- PLAN_CONDENSE.md: condensed platform specification
  ([`2716fb0`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/2716fb050a94b2c8311daf19a7431afc05651dd0))
- Code patterns and testing conventions in AGENTS.md
  ([`890a35a`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/890a35ad8c7451709d382e9114360a0d0c8384c9))

---

## 2026-01-10 — Checkpoint, Reservation, and CAAM Systems

### Checkpoint Service

- CheckpointService and context rotation
  ([`aebd075`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/aebd0755f1196cb08f861849ab687232d8a6dfba))
- Migrate from in-memory to SQLite storage
  ([`8a8be92`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/8a8be92d6b25955436f84f57edf0283592401201))
- Compression, auto-checkpointing, and compaction
  ([`2f297bf`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/2f297bf1a2a541e216eec01cbf2a0aa897cb12d0))
- Auto-checkpoint and conflict detection services
  ([`11c06ee`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/11c06eeabbae734500591df844ff3d3177d0428c))
- Error checkpoint support for failure recovery
  ([`e4e5889`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/e4e588999a772eee664eff649e3e8117d1400d1e))
- Prometheus metrics for checkpoint operations
  ([`60852f0`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/60852f08ca4f6c139b21fbf85e5fcc3a8a574b28))

### File Reservation System

- File reservation conflict detection engine
  ([`b7f3b41`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/b7f3b41b11e216e4e11f2ef358db38f7a0e51f44))
- Implement File Reservation System
  ([`6c2ea3c`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/6c2ea3ced56ead417388ae24c767e2e8ac84007c))

### CAAM (Cloud Account and Authentication Manager)

- CAAM CLI Runner service for workspace integration
  ([`613dd7e`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/613dd7ee915614b78c3ceb0a1e26796114741ec7))
- Harmonize CAAM types with CLI
  ([`64e1359`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/64e1359ec613eea3062cfa5b73e5181f5e3af32e))

### Agent Lifecycle

- Agent lifecycle state machine
  ([`ff1120b`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/ff1120b52ed13896d8a0a12b94184a319325e73c))
- Context Pack Builder with Token Budgeting
  ([`5604326`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/56043265430bcd4eb267faed067dfa9504f30996))
- Metrics and Alerts System
  ([`92ce9e6`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/92ce9e6bc0002d7e1a504d0f754ee1e866a76a0b))

### WebSocket

- Integrate WebSocket hub with heartbeat and agent events
  ([`6a57351`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/6a57351011e0826024d0c97a4efbdf17d9927428))

### Agent Mail

- Idempotency middleware for safe request retries
  ([`054d3f4`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/054d3f406fde6fe89d77f0d7c1da8ec779c18cae))
- Agent Mail REST routes
  ([`40760f8`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/40760f8d2c44182d60159da8f12a53ac23ae1167))
- Mail events service for WebSocket publishing
  ([`0278939`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/0278939ea102ee2202b132ed892e7f9b5f2b9877))

---

## 2026-01-09 — Foundation Sprint

The initial build-out day where the core platform was assembled in a single
intensive sprint (100+ commits).

### Scaffolding

- Initialize Bun workspaces with TypeScript and Biome baseline
  ([`da1ebcc`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/da1ebcca7833f781d7ac03ee8825d50caf28032a))
- `@flywheel/shared` with `GatewayError` and canonical error codes
  ([`8149d13`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/8149d1304ef6ab0f68bb59e1af0b26750a424834))
- `@flywheel/test-utils` workspace package
  ([`50543c9`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/50543c948b7386cdf5e50228b1ebe1e01a2cfd95))
- AgentDriver abstraction and driver namespaces
  ([`2af5128`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/2af51280e7570af40d826a01470b7b10271adcfb))
- Flywheel ecosystem client package
  ([`d3812a1`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/d3812a10813690e1d16c11bb05dcc8490ebfc627))
- Bun/Hono app with basic health endpoint
  ([`7e14a03`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/7e14a036849ceae9c9240997948cfc50a41495f2))
- Vite + React 19 UI shell
  ([`977db41`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/977db41b93960ce1e35bf52fdd614fc341a22197))
- Top-level test suite directories (contract/e2e/load)
  ([`ed6d7d7`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/ed6d7d70455352b867da068f8d83c78bb1a9bc1b))
- CI workflow and TypeScript strict mode
  ([`c4d6f45`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/c4d6f45fdbd08b27f9a1a7478134154996b33ea4))

### Core Systems

- Structured logging infrastructure
  ([`f1a6ab7`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/f1a6ab710539bf141a640387fb6322fc802c158a))
- Command Registry system
  ([`202acab`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/202acab6bebbff6e19722d5db4e00840de71fd47))
- Agent Driver Abstraction Layer
  ([`f0010cc`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/f0010ccdc720697483c8a89a75cad77cef3924ce))
- ACP and Tmux drivers
  ([`67e9376`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/67e937602dc2230ee6900e32af10c42b9e26ba40))
- Codegen for REST routes, OpenAPI spec, tRPC, WebSocket, and TypeScript client SDK
  ([`20daf33`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/20daf33b79beadaa7c88edd318daf6b85cd7b9f7),
   [`8c4f24e`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/8c4f24eac7465af8165538408d43d4643bbb666d),
   [`ca6d944`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/ca6d94432fea0ef19b5381704e66a98ea1c45add))
- Database schema and REST API
  ([`2953af0`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/2953af0b580e912db7ef3f013944814327e587ea))
- Database, WebSocket, and E2E test infrastructure
  ([`21a87cf`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/21a87cf8bb9f04be9844161111dc9238030bcf6f))

### Agent Services

- Output streaming system
  ([`0e097de`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/0e097de1d73596f57aa47ae79457ab363ad46761))
- History tracking service
  ([`4a67f40`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/4a67f403ea7230b49265aed2f89faa4e80077ae0))
- DCG integration for destructive command guard
  ([`696d744`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/696d7442bc02a17a5f32ee370429e7c982b2dd66))
- Developer utilities service (giil, csctf)
  ([`ee6ed6d`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/ee6ed6ddd61dfe923f9ea8866b8ac6a357d5cffb))
- Type-safe Agent Mail client
  ([`0ea009e`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/0ea009e2b12e4398718a3255441d36e1c038b9fd))

### Frontend

- Comprehensive design system with dawn/dusk themes
  ([`6d37cd9`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/6d37cd9fa5d6fd1469b555af38fdddab9d959372))
- WebSocket context and 404 page
  ([`96982b3`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/96982b3aa3147ba4b8f0c9f7787dcde9c6994f19))

---

## 2026-01-08 — Project Inception

- Initial commit: Flywheel Gateway
  ([`abbca6d`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/abbca6d08da6f6bb65b8aa35255ce002a0781d6f))
- Ecosystem tools defined: RU, DCG, giil, csctf
  ([`82bf87e`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/82bf87eb9e908a34abade1247f937752212a52ad))
- Public/private content separation rules
  ([`8d88f16`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/8d88f1677c184d8416e444a4c4549d0372d867c1))
- Sibling repos pattern for public/private separation
  ([`eeffd73`](https://github.com/Dicklesworthstone/flywheel_gateway/commit/eeffd73d93a8a4be67be2ddd563bea783f29a444))

---

## Statistics

| Metric | Value |
|--------|-------|
| Total commits | 1,170 |
| First commit | 2026-01-08 |
| Latest commit | 2026-03-13 |
| Tags / Releases | None |
| Contributors | Agent-driven development |
| Primary runtime | Bun 1.3+ |
| Backend framework | Hono 4.11+ |
| Frontend framework | React 19 + Vite 7 |
| Database | bun:sqlite via Drizzle ORM |
| Linter | Biome 2.0+ |
