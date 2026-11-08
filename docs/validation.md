# Validation record

Validated locally on Windows with Node 24 on 2026-11-08.

- `npm run check`: passed TypeScript checks, **7 backend/SDK transport tests**, and the production client/server build.
- `npm run test:e2e`: **10 browser tests passed**, covering desktop (1440 px) and mobile (390 px) with Chromium.
- Browser journeys exercised a first turn, a same-session follow-up, a fresh session with reused configuration, session switching, all teaching tabs, five quiz answers, saved reading size, cancellation, invalid session rejection, and cross-origin mutation rejection.
- Reviewed desktop and mobile screenshots. The larger reading size produced no horizontal document overflow in either browser project.
- The SDK transport test uses the **real official SDK with a mocked HTTP/SSE response**, checking managed endpoint request bodies, beta headers, and opening the stream before sending input.
- Additional browser checks verify rich response headings/lists/tables, syntax colors throughout the application, literal code containing HTML tags, removal of executable model HTML/unsafe links, and all ten selectable UML workflow steps. The stop-button browser check uses a controlled event stream so short demo timing does not race mobile scrolling; real provider cancellation remains covered by the backend test.
- A billable live Managed Agents run was **not** performed as part of these checks. Live integration still requires account-specific validation with a Managed Agents-enabled API key and available model.

The screenshots show the explicitly labelled scripted demo. They are interface evidence, not evidence of live cloud inference.
