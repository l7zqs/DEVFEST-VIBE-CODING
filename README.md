# Tender package builder

A browser-only tool that checks a set of PDFs against a tender's requirements list and merges them into one submission PDF. Nothing is uploaded anywhere; all processing happens in the browser.

## What it does

- Loads `requirements.json`, or a ZIP containing `requirements.json` and PDFs (see `sample/requirements.json` for the format).
- Reads each PDF: page count, SHA-256 hash, and a clear error for damaged or password-protected files.
- Matches one PDF to each requirement. Files with identical content are flagged, and one copy cannot be used for two requirements.
- Checks expiry dates against the submission deadline. A document is valid through the deadline day and expired if its date is earlier.
- Generates `<tender_id>_Package.pdf`: an English cover page with a contents table (document, page count, page range), followed by the documents in requirement order.
- English and Bangla interface. The choice is saved in localStorage. Document names come from `title_en` / `title_bn`.

## Known limits

- The cover page uses Helvetica, so characters outside Latin-1 (for example Bangla) in the tender title, entity or bidder name print as `?`. The cover is English-only by design.
- Matching is manual (or preset in the demo); the app does not read PDF contents.

## Run locally

```bash
pnpm install
pnpm dev
```

`pnpm build` produces a static site in `out/` (`output: 'export'`), which can be hosted anywhere. No environment variables are needed. After changing dependencies, run `pnpm install` and commit the updated `pnpm-lock.yaml`.

Use **Load provided demo documents** on the start screen to try the app with the sample data in `public/demo-documents/` (these are generated sample files, not real records; `experience-certificate.pdf` and `experience-certificate-2.pdf` are deliberately identical to demonstrate duplicate detection).

## AI tools

No AI runs inside the app. It is deterministic and works offline.
