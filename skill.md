# Architecture notes

- Next.js App Router. The whole UI is one client component in `app/page.tsx`; the site is exported statically (`output: 'export'`).
- No server, database or external API. State lives in React state for the session; only the language choice is stored in localStorage.
- PDFs are parsed and merged with `pdf-lib`, hashed with Web Crypto (`SHA-256`), and ZIP packs are read with `jszip`.
- `parseRequirements` validates the JSON (tender fields, ISO deadline, unique requirement ids, required field types).
- All interface text is in the `t` dictionary (`en` / `bn`). Requirement names come from the loaded data.
- Rules: one PDF per requirement; a file whose hash is already matched to another requirement cannot be reused; generation is blocked while any mandatory document is missing/expired or an attached document has no expiry date.
- State updates after async work use functional `setDocs(prev => ...)` so uploads cannot overwrite each other.
