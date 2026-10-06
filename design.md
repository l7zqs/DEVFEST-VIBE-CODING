# Design

Plain, dense, utility-style interface for checking documents.

- **Colors:** background `#f5f6f2`, text `#172333`, primary button `#173c4b` (hover `#225567`), focus ring and accent `#2c7a78`, borders `#d8ddd7`.
- **Status colors:** green = OK, amber = needs attention (expiry date missing), red = blocking (missing mandatory document or expired), grey = optional and not provided. Defined as `.status-*` classes in `app/globals.css`.
- **Type:** Arial, with Noto Sans Bengali / Nirmala UI as fallback for Bangla. No web fonts are downloaded, so Bangla uses whichever of those fonts is installed on the device.
- **Shape:** 4–6px corners, white table surfaces, no gradients.
- **Layout:** header with language switch; tender summary; requirements table (order, document, status, file, expiry) beside the uploaded-files list. Stacks to one column on small screens.
- **Accessibility:** native buttons, selects and date inputs; every select and date field has an `aria-label`; language buttons use `aria-pressed`; errors use `role="alert"`; visible focus outline.
- **Cover page:** English only, plain text, with a contents table.
