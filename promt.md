# Project: Tender PDF Package Builder

## Role

You are a senior frontend engineer and product designer.

Build a polished, production-quality **frontend-only web application** that helps office staff turn a collection of PDF files into one complete, validated, correctly ordered PDF submission package for a tender.

The application must work with arbitrary `sample-pack.zip`-style input packs supplied by judges. **Do not hardcode the sample data, document names, tender ID, or expected files.** Everything must be dynamically derived from the uploaded `requirements.json` and uploaded PDF files.

The app must run entirely in the browser. No backend is required.

---

# 1. Core User Goal

The user should be able to:

1. Open/import `requirements.json`.
2. See the tender information and required documents.
3. Upload multiple PDF files.
4. See each PDF's filename and page count.
5. Reject non-PDF files with a clear error.
6. Detect exact duplicate PDFs by file content, even when filenames differ.
7. Match each PDF to at most one tender requirement.
8. Ensure each requirement has at most one matched PDF.
9. Enter expiry dates for documents that require expiry validation.
10. Immediately see the validation status of every requirement.
11. Understand why the package cannot yet be generated.
12. Generate one correctly ordered combined PDF when all blocking issues are resolved.
13. Download it as:

`<tender_id>_Package.pdf`

The generated package must conform exactly to the package rules described below.

---

# 2. Technical Requirements

Use:

- React
- TypeScript
- Vite
- Tailwind CSS
- A clean component architecture
- Browser-only processing
- PDF.js for reading PDF metadata/page counts
- pdf-lib for merging PDFs and generating the cover/footer
- Web Crypto API (`crypto.subtle.digest`) for duplicate-content detection
- JSZip for optionally importing `sample-pack.zip`
- date-fns or equivalent lightweight date utility if useful

Do not require a backend.

Do not upload user PDFs to any server.

All PDF processing must happen locally in the browser.

---

# 3. Application Structure

Create a professional desktop-first application with responsive behavior.

Suggested structure:

```text
src/
  components/
    AppShell.tsx
    Header.tsx
    LanguageSwitcher.tsx
    TenderSummary.tsx
    RequirementsPanel.tsx
    RequirementRow.tsx
    UploadZone.tsx
    UploadedFilesTable.tsx
    FileRow.tsx
    MatchSelector.tsx
    ExpiryDateInput.tsx
    ValidationSummary.tsx
    GeneratePackageButton.tsx
    EmptyState.tsx
    ErrorAlert.tsx
    Toast.tsx
    PackagePreview.tsx

  lib/
    pdf.ts
    validation.ts
    matching.ts
    duplicates.ts
    requirements.ts
    zip.ts
    i18n.ts
    dates.ts
    utils.ts

  types/
    requirements.ts
    documents.ts
    app.ts

  hooks/
    useRequirements.ts
    useDocuments.ts
    useValidation.ts
    useLanguage.ts

  App.tsx
  main.tsx
  index.css
```

Use reusable components rather than putting everything inside `App.tsx`.

---

# 4. Input Format

The application must support the following `requirements.json` structure:

```json
{
  "tender": {
    "tender_id": "T-2026-0417",
    "title": "Supply of IT Equipment",
    "procuring_entity": "Example Directorate",
    "bidder": "Example Company Ltd.",
    "submission_deadline": "2026-10-20"
  },
  "requirements": [
    {
      "id": "R01",
      "order": 1,
      "title_en": "Trade License",
      "title_bn": "<Bangla title>",
      "mandatory": true,
      "has_expiry": true
    }
  ]
}
```

Define TypeScript types for this structure.

Validate the imported JSON.

If required fields are missing or invalid, show a useful error instead of crashing.

---

# 5. Requirements Loading

Provide a clear initial state:

> Load Tender Requirements

Allow the user to:

- Select `requirements.json`
- Drag and drop `requirements.json`
- Optionally select a `.zip` pack containing:
  - `requirements.json`
  - `documents/`

If a ZIP is uploaded, automatically find and parse:

```text
requirements.json
```

and optionally preload PDFs from:

```text
documents/
```

Do not assume the directory name is always exactly `documents/`; search the ZIP for PDF files if necessary.

After loading:

Display:

### Tender information

- Tender ID
- Tender title
- Procuring entity
- Bidder
- Submission deadline

### Required documents

Sort requirements by:

```text
order ASC
```

Show:

- Order
- Document name
- Mandatory/Optional
- Expiry required/not required
- Current status
- Matched filename
- Expiry date where relevant

---

# 6. Language Support

The entire application must support:

- English
- Bangla

Provide a language switcher in the header:

```text
English | বাংলা
```

When Bangla is selected:

- UI labels should be translated.
- Document names should use `title_bn`.
- Status labels should be translated.
- Buttons and help text should be translated.
- Error messages should be translated where practical.

When English is selected:

- Document names must use `title_en`.

Use a centralized translation dictionary.

Example:

```ts
const translations = {
  en: {
    dashboard: "Tender Package",
    upload: "Upload Documents",
    generate: "Generate Package",
    missing: "Missing",
    expiryNeeded: "Expiry date needed",
    expired: "Expired",
    notProvided: "Not provided",
    ok: "OK",
    duplicate: "Duplicate"
  },
  bn: {
    dashboard: "টেন্ডার প্যাকেজ",
    upload: "ডকুমেন্ট আপলোড করুন",
    generate: "প্যাকেজ তৈরি করুন",
    missing: "অনুপস্থিত",
    expiryNeeded: "মেয়াদ শেষের তারিখ প্রয়োজন",
    expired: "মেয়াদ শেষ",
    notProvided: "দেওয়া হয়নি",
    ok: "ঠিক আছে",
    duplicate: "ডুপ্লিকেট"
  }
};
```

The generated PDF cover must remain **English**, regardless of the application language.

---

# 7. PDF Upload

Create a large drag-and-drop upload area.

Accept multiple files.

Allowed type:

```text
application/pdf
```

Also check the file extension where appropriate.

For each uploaded PDF show:

- Filename
- Number of pages
- File size
- Duplicate indicator
- Matched requirement
- Remove button

Example:

```text
┌────────────────────────────────────────────────────────────┐
│  Drop PDF files here or Browse                             │
│                                                            │
│  PDF only • Multiple files supported                       │
└────────────────────────────────────────────────────────────┘
```

For each uploaded file:

```text
TradeLicense.pdf
12 pages
2.4 MB
Matched: Trade License
[Remove]
```

---

# 8. Invalid File Handling

If the user attempts to upload:

- DOCX
- XLSX
- PNG
- JPG
- TXT
- ZIP as individual document input
- Any unsupported format

reject it.

Show a clear message such as:

> `example.docx` was not added. Only PDF files are supported.

Do not crash.

Allow valid files in the same upload operation to continue processing.

---

# 9. PDF Parsing

When a PDF is uploaded:

1. Read it locally.
2. Verify it can be parsed.
3. Determine its page count.
4. Generate a stable content hash.
5. Add it to the document list.

Use PDF.js to determine page count.

Use pdf-lib for later merging.

If the PDF is:

- corrupted
- unreadable
- malformed
- password protected/encrypted
- otherwise unsupported

do not crash.

Show:

> Unable to read `filename.pdf`. The file may be damaged or password protected.

Allow the user to remove the problematic file.

---

# 10. Duplicate Detection

This is mandatory.

Two files must be considered duplicates when they have **exactly the same content**, even if their filenames differ.

Example:

```text
license.pdf
license-copy.pdf
```

If their bytes are identical, mark both as duplicates.

Use:

```ts
crypto.subtle.digest("SHA-256", arrayBuffer)
```

Store:

```ts
contentHash
```

Group files by hash.

A duplicate group should be visually obvious.

Example:

```text
⚠ Duplicate files detected

license.pdf
license-copy.pdf

These files have identical content.
Only one copy may be used in the package.
```

---

# 11. Duplicate Matching Rule

A duplicate PDF must not be matched to two different requirements.

For example:

```text
A.pdf       hash = ABC
A-copy.pdf  hash = ABC
```

The user must not be able to do:

```text
Trade License → A.pdf
VAT Certificate → A-copy.pdf
```

because they are identical.

Prevent this.

If the user tries, show:

> This file is an exact duplicate of another uploaded file and cannot be used for another requirement.

It is acceptable to allow the user to match one representative of the duplicate group to one requirement.

---

# 12. Matching UI

The user must be able to match:

```text
uploaded PDF → requirement
```

and also:

```text
requirement → uploaded PDF
```

Use a convenient interface.

Recommended layout:

### Requirements

| Order | Requirement | Required | Expiry | File | Status |
|---|---|---|---|---|---|
| 1 | Trade License | Required | Yes | Select file | Missing |
| 2 | TIN Certificate | Required | No | TIN.pdf | OK |
| 3 | VAT Certificate | Optional | Yes | — | Not provided |

For each requirement, provide a dropdown showing eligible uploaded PDFs.

Already matched files should not be available for another requirement.

Allow:

- Match
- Change match
- Clear match

Changes must update validation immediately.

---

# 13. Matching Constraints

Enforce:

### Requirement constraint

One requirement → maximum one file.

### File constraint

One file → maximum one requirement.

### Duplicate constraint

Files with identical content → cannot be used for different requirements.

The UI should prevent invalid combinations rather than relying only on error messages.

---

# 14. Expiry Dates

If:

```ts
has_expiry === true
```

and a file is matched:

show an expiry date field.

Example:

```text
Trade License
TradeLicense.pdf

Expiry date:
[ 2026-12-31 ]
```

Use a native date input or date picker.

If no expiry date is entered, status must be:

```text
Expiry date needed
```

This blocks package generation.

If the expiry date is before the submission deadline:

```text
Expired
```

This blocks package generation.

If expiry date is equal to or after the submission deadline:

```text
OK
```

This does not block package generation.

---

# 15. Exact Status Rules

Every requirement must show exactly one of these statuses:

## Missing

Condition:

```text
mandatory === true
AND no file matched
```

Blocks package:

```text
YES
```

---

## Expiry date needed

Condition:

```text
has_expiry === true
AND file matched
AND expiry date missing
```

Blocks package:

```text
YES
```

---

## Expired

Condition:

```text
has_expiry === true
AND file matched
AND expiryDate < submissionDeadline
```

Blocks package:

```text
YES
```

---

## Not provided

Condition:

```text
mandatory === false
AND no file matched
```

Blocks package:

```text
NO
```

---

## OK

Condition:

```text
file matched
AND (
  has_expiry === false
  OR expiryDate >= submissionDeadline
)
```

Blocks package:

```text
NO
```

Implement this logic centrally:

```ts
type RequirementStatus =
  | "missing"
  | "expiry_needed"
  | "expired"
  | "not_provided"
  | "ok";
```

Do not duplicate validation logic throughout the UI.

---

# 16. Important Date Rule

Use date-only comparison.

Do not introduce timezone-related bugs.

For:

```text
submission deadline = 2026-10-20
expiry date = 2026-10-20
```

the status must be:

```text
OK
```

For:

```text
expiry date = 2026-10-19
```

the status must be:

```text
Expired
```

---

# 17. Validation Summary

Create a prominent validation summary.

Example:

```text
Package readiness

✓ 7 documents ready
⚠ 1 optional document not provided
✕ 2 blocking problems
```

If blocking issues exist, explain them.

Example:

```text
Cannot generate package yet

• Trade License is missing
• Bank Solvency Letter has expired
```

The Generate button must be disabled.

---

# 18. Generate Button

Button:

```text
Generate Package
```

Requirements:

```text
disabled = true
```

if ANY required document has:

- Missing
- Expiry date needed
- Expired

Do not disable because of:

- Not provided
- OK

Show a tooltip or inline explanation when disabled.

Example:

> Resolve 2 blocking issues before generating the package.

---

# 19. Package Generation

When all blocking problems are resolved, generate one PDF.

Use `pdf-lib`.

The output filename must be:

```text
<tender_id>_Package.pdf
```

Example:

```text
T-2026-0417_Package.pdf
```

---

# 20. Package Page Order

The final PDF must follow exactly:

```text
Page 1
Cover page

Then:

Requirement order 1
Requirement order 2
Requirement order 3
...
```

Only include matched documents.

Skip optional requirements with no matched file.

For each included PDF:

- Include every page.
- Preserve original page order.
- Do not modify the original content.
- Do not omit pages.

---

# 21. Cover Page

The cover must be page 1.

It must be written in **English**, regardless of selected UI language.

Include:

```text
TENDER SUBMISSION PACKAGE

Tender ID:
T-2026-0417

Tender Title:
Supply of IT Equipment

Procuring Entity:
Example Directorate

Bidder:
Example Company Ltd.

Submission Deadline:
20 October 2026

Package Created:
[actual package creation date]

Included Documents

1. Trade License
2. TIN Certificate
3. VAT Certificate
4. Bank Solvency Letter
...
```

Use the actual values from `requirements.json`.

Use the document's `title_en` on the cover.

Do not hardcode any tender information.

---

# 22. Cover Design

Make the cover look professional and suitable for a real tender submission.

Recommended:

- A4 page
- Clear hierarchy
- Large title
- Tender metadata in a structured table
- Included-document list
- Professional spacing
- Neutral corporate visual design

Avoid excessive decoration.

---

# 23. Footer Requirement

Every page in the final package must contain:

```text
<tender_id> | Page X of Y
```

Example:

```text
T-2026-0417 | Page 4 of 37
```

Important:

`Y` must be the total number of pages in the complete final PDF.

Therefore, determine the final page count before writing the final footer.

The footer must:

- Appear on every page.
- Be readable.
- Be at the bottom.
- Not cover existing document content.

---

# 24. Footer Placement

For generated cover pages, reserve enough bottom margin.

For imported document pages, add the footer in a safe bottom area.

Do not blindly place text over document content.

Prefer:

- slightly reduced page scale when necessary, or
- add a footer area by scaling the original page content upward slightly.

The original document should remain readable.

The footer must never make important content unreadable.

---

# 25. Page Size Handling

Uploaded PDFs may contain different page sizes.

Handle:

- A4
- Letter
- Legal
- landscape pages
- portrait pages

Do not assume every uploaded PDF is A4.

Preserve the original page dimensions where possible.

Place the footer relative to the page dimensions.

For example:

```text
footerY = 15–25 points from bottom
```

and reserve sufficient space.

---

# 26. Page Number Calculation

Before writing footers:

1. Determine cover page count.
2. Determine page count of every selected source PDF.
3. Calculate total pages.
4. Create/assemble the output.
5. Add footer to every page using:

```text
Page ${currentPage} of ${totalPages}
```

Do not show:

```text
Page 1 of ?
```

in the final file.

---

# 27. Original PDF Content

When adding source PDFs:

- Preserve every page.
- Preserve original page sequence.
- Do not rasterize unnecessarily.
- Do not convert pages to images.
- Preserve text/vector quality as much as possible.

Use pdf-lib's page-copying facilities.

---

# 28. Package Preview

Before download, show a summary such as:

```text
Package ready

T-2026-0417_Package.pdf

37 pages
8 documents
1 optional document skipped

[Generate & Download]
```

Optionally show:

```text
Package order

1. Cover
2. Trade License — 3 pages
3. TIN Certificate — 2 pages
4. VAT Certificate — 4 pages
...
```

---

# 29. Download

Use a browser download.

The filename must exactly be:

```text
<tender_id>_Package.pdf
```

Example:

```text
T-2026-0417_Package.pdf
```

Do not add random suffixes.

---

# 30. Optional ZIP Workflow

Because the judge may provide:

```text
sample-pack.zip
```

support ZIP import.

ZIP may contain:

```text
requirements.json
documents/
  license.pdf
  tin.pdf
  vat.pdf
```

When a ZIP is imported:

1. Find `requirements.json`.
2. Parse it.
3. Find PDFs.
4. Add them to the uploaded files list.
5. Process page counts.
6. Compute hashes.
7. Detect duplicates.

Do not assume filenames correspond perfectly to requirement names.

---

# 31. Auto-Match Bonus

Implement automatic match suggestions if practical.

Use filename similarity.

For example:

```text
trade_license.pdf
trade-license-2026.pdf
TIN Certificate.pdf
bank_solvency.pdf
```

could suggest matching requirements.

However:

**Suggestions must never silently create invalid matches.**

Show:

```text
Suggested match:
Trade License → trade_license.pdf

[Accept] [Ignore]
```

Use a simple scoring algorithm based on:

- normalized filename
- requirement title English
- requirement title Bangla
- requirement ID
- common abbreviations

Do not rely solely on exact filenames.

---

# 32. Duplicate UX

Show duplicate warnings prominently.

Example:

```text
⚠ 2 exact duplicates detected

trade_license.pdf
trade_license_copy.pdf

SHA-256:
abc123...

Only one file from this duplicate group can be used.
```

Do not require users to understand hashes; show hashes only as supporting information.

---

# 33. File List UX

Create a professional table.

Columns:

```text
File
Pages
Size
Match
Expiry
Duplicate
Actions
```

Example:

```text
┌──────────────────────────────────────────────────────────────────┐
│ File                  Pages   Match             Duplicate Action │
├──────────────────────────────────────────────────────────────────┤
│ trade_license.pdf      3      Trade License     —         Remove  │
│ tin.pdf                2      TIN Certificate   —         Remove  │
│ license-copy.pdf       3      Unmatched         ⚠ Duplicate Remove│
└──────────────────────────────────────────────────────────────────┘
```

---

# 34. Requirement List UX

Each requirement should have a visual status indicator.

Suggested visual language:

- Missing → red
- Expiry needed → amber
- Expired → red
- Not provided → neutral/gray
- OK → green

Do not rely solely on color. Include text/icons.

Example:

```text
● Missing
● Expiry date needed
● Expired
● Not provided
● OK
```

Ensure accessible contrast.

---

# 35. Responsive Design

Desktop is the primary target.

Still support smaller screens.

On mobile:

- Stack sections vertically.
- Make tables horizontally scrollable.
- Keep actions accessible.
- Keep Generate button visible.

---

# 36. Application Layout

Recommended overall layout:

```text
┌─────────────────────────────────────────────────────────────────┐
│ Logo / Tender Package Builder              English | বাংলা      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Tender Summary                                                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Tender ID      T-2026-0417                                  │ │
│ │ Title          Supply of IT Equipment                       │ │
│ │ Bidder         Example Company Ltd.                         │ │
│ │ Deadline       20 Oct 2026                                  │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ Requirements                                                    │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 1  Trade License       Required   OK       license.pdf      │ │
│ │ 2  TIN Certificate     Required   OK       tin.pdf          │ │
│ │ 3  VAT Certificate     Optional   Missing  —                │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ Upload PDFs                                                     │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Drop PDFs here or browse                                    │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ Uploaded Files                                                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ ...                                                         │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ Validation                                                     │
│ ✓ Ready documents: 7                                           │
│ ⚠ Optional: 1                                                  │
│ ✕ Blocking issues: 0                                           │
│                                                                 │
│                         [Generate Package]                      │
└─────────────────────────────────────────────────────────────────┘
```

---

# 37. State Management

Maintain a clean central application state.

Suggested state:

```ts
interface AppState {
  language: "en" | "bn";

  tender: Tender | null;

  requirements: Requirement[];

  files: UploadedFile[];

  matches: Record<string, string | null>;
  
  expiryDates: Record<string, string | null>;

  errors: AppError[];

  isGenerating: boolean;

  generatedPackage: {
    blob: Blob;
    filename: string;
    pageCount: number;
  } | null;
}
```

Where:

```ts
interface UploadedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  pageCount: number;
  contentHash: string;
  isDuplicate: boolean;
  duplicateGroupId?: string;
}
```

---

# 38. Derived Validation

Do not store statuses manually.

Calculate them from:

- requirements
- matches
- expiry dates
- submission deadline

Example:

```ts
function getRequirementStatus(
  requirement,
  matchedFile,
  expiryDate,
  submissionDeadline
): RequirementStatus
```

This guarantees that status updates immediately after every user action.

---

# 39. Package Blocking Logic

Implement:

```ts
const blockingStatuses = [
  "missing",
  "expiry_needed",
  "expired"
];
```

Then:

```ts
const canGenerate =
  requirements.every(
    requirement =>
      !blockingStatuses.includes(
        getRequirementStatus(...)
      )
  );
```

The Generate button must use this derived value.

---

# 40. Error Handling

Every major operation must have safe error handling:

### Requirements JSON

If invalid:

> Unable to load requirements.json. Please check that it contains a valid tender and requirements list.

### PDF

If invalid:

> Unable to read `file.pdf`. The PDF may be damaged or password protected.

### ZIP

If no requirements file:

> This ZIP does not contain a requirements.json file.

### ZIP with no PDFs

Allow it, but show:

> No PDF documents were found in this pack.

### Package generation

If generation fails:

> The package could not be generated. Please check the uploaded files and try again.

Never leave the UI frozen.

---

# 41. Security / Privacy

Because this is frontend-only:

- Do not upload files to a remote server.
- Do not log PDF contents.
- Do not send document data to external APIs.
- Do not expose file contents in URLs.
- Revoke temporary object URLs when appropriate.

All sensitive tender documents should stay in the browser.

---

# 42. Performance

The judge may upload multiple PDFs.

Optimize for:

- asynchronous PDF parsing
- progress indicators
- avoiding unnecessary copies of ArrayBuffers
- lazy UI rendering if there are many files
- hashing files asynchronously

Show processing state:

```text
Reading files...

3 / 8 processed
```

Do not block the UI unnecessarily.

---

# 43. Processing Progress

When many PDFs are uploaded, show progress:

```text
Processing documents
████████████░░░░ 6 / 8

Checking:
bank_solvency.pdf
```

After processing:

```text
8 PDFs processed successfully
```

---

# 44. Accessibility

Use:

- semantic HTML
- keyboard-accessible controls
- visible focus states
- labels for inputs
- ARIA labels where necessary
- accessible status text

Do not make critical information available only through color.

---

# 45. Empty States

Before requirements are loaded:

```text
No tender loaded

Upload requirements.json or a tender ZIP package to begin.
```

Before PDFs:

```text
No documents uploaded

Upload the PDFs you want to include in the tender package.
```

---

# 46. Reset / New Tender

Provide:

```text
New Tender
```

or:

```text
Reset
```

with confirmation if data has already been loaded.

Example:

> Start a new tender? Current matches and uploaded files will be cleared.

---

# 47. Bonus: Index Page

If implementing the bonus:

Place an index after the cover.

It should show:

```text
DOCUMENT INDEX

Document                         Starts on page

Trade License                   2
TIN Certificate                 5
VAT Certificate                 7
Bank Solvency Letter            10
...
```

Page numbers must account for:

- cover
- index
- all document pages

If the index is enabled, it becomes:

```text
Page 1: Cover
Page 2: Index
Page 3+: Documents
```

The footer must still show correct total page count.

---

# 48. Bonus: CSV Export

Provide:

```text
Export Checklist
```

Download:

```text
<tender_id>_Checklist.csv
```

Columns:

```text
Document
File Name
Pages
Expiry Date
Status
Mandatory
```

---

# 49. Bonus: Excel Export

If implementing Excel, generate:

```text
<tender_id>_Checklist.xlsx
```

with the same information.

Do this entirely in the browser.

---

# 50. Bonus: Save / Reopen

Optionally support project export/import.

Project file might contain:

```json
{
  "version": 1,
  "tender": {},
  "requirements": [],
  "matches": {},
  "expiryDates": {}
}
```

Do not embed massive PDF binary data into JSON unless necessary.

A project can instead preserve configuration while requiring PDFs to be uploaded again.

Alternatively use IndexedDB for local persistence.

---

# 51. Bonus: Signature / Seal

If implemented:

- Accept PNG.
- Let user choose pages.
- Let user position/scale the seal.
- Apply it using pdf-lib.
- Keep it optional and separate from the main workflow.

Do not allow this feature to interfere with core package generation.

---

# 52. Bangla PDF Bonus

The application UI must support Bangla.

If generating Bangla content inside PDF:

- bundle/use an appropriate Unicode Bangla font
- embed it with pdf-lib
- verify rendering

However, the mandatory cover is English, so Bangla PDF rendering is a bonus only.

---

# 53. Visual Design

Design should feel like a serious internal office tool rather than a generic demo.

Style direction:

- clean
- professional
- trustworthy
- minimal
- excellent information hierarchy
- subtle borders
- moderate rounded corners
- restrained shadows
- strong status indicators
- plenty of whitespace

Suggested visual hierarchy:

```text
Header
↓
Tender summary
↓
Requirements checklist
↓
Document upload
↓
Uploaded documents
↓
Validation summary
↓
Generate
```

Avoid unnecessary animations.

Use animations only for small transitions.

---

# 54. Important Judge Scenario

The judges will not necessarily use the provided sample pack.

They will provide another pack in the same format.

Therefore:

## NEVER hardcode:

- Tender ID
- Tender title
- Bidder
- Procuring entity
- Deadline
- Requirement IDs
- Requirement names
- Number of requirements
- Expected PDFs
- File names
- Expiry dates
- Duplicate files
- Document order

Everything must come from the input files/user actions.

---

# 55. Hidden Problem Detection

The application should naturally detect common hidden problems in arbitrary packs:

### Missing required document

Example:

```text
Trade License → no match
```

→ Missing

### Missing expiry date

Example:

```text
VAT Certificate → matched
has_expiry = true
expiry = empty
```

→ Expiry date needed

### Expired document

Example:

```text
expiry = 2026-09-01
deadline = 2026-10-20
```

→ Expired

### Duplicate content

Example:

```text
certificate.pdf
certificate-final.pdf
```

with identical bytes.

→ Duplicate

### Optional missing document

```text
mandatory = false
no match
```

→ Not provided, does not block

### Valid same-day expiry

```text
expiry = deadline
```

→ OK

### Incorrect order

Do not trust filesystem order or upload order.

Always generate according to:

```text
requirement.order
```

---

# 56. Testing Requirements

Create unit tests for at least:

### Validation

```text
mandatory + no file → missing
optional + no file → not provided
expiry required + no date → expiry_needed
expiry before deadline → expired
expiry equal deadline → ok
expiry after deadline → ok
non-expiring matched document → ok
```

### Duplicate detection

```text
same bytes + different filenames → duplicate
different bytes → not duplicate
```

### Ordering

Given requirements:

```text
order 3
order 1
order 2
```

the generated order must be:

```text
1
2
3
```

### Package filename

```text
T-2026-0417
→ T-2026-0417_Package.pdf
```

### Optional omission

An optional unmatched document must not appear in the final package.

---

# 57. Acceptance Criteria

The implementation is complete only when all of these work:

- [ ] Load `requirements.json`
- [ ] Display tender details
- [ ] Sort requirements by order
- [ ] Upload multiple PDFs
- [ ] Reject non-PDFs
- [ ] Show PDF page counts
- [ ] Remove uploaded files
- [ ] Match PDFs to requirements
- [ ] Change matches
- [ ] Clear matches
- [ ] Enforce one-to-one matching
- [ ] Detect exact duplicate PDFs by content
- [ ] Prevent duplicate files from being used for different requirements
- [ ] Enter expiry dates
- [ ] Validate expiry dates against submission deadline
- [ ] Correctly show all five statuses
- [ ] Update status immediately
- [ ] Identify all blocking issues
- [ ] Disable Generate when blocked
- [ ] Generate combined PDF
- [ ] Generate English cover
- [ ] Include all matched pages
- [ ] Preserve source page order
- [ ] Sort documents by requirement order
- [ ] Skip unmatched optional documents
- [ ] Add footer to every page
- [ ] Correctly calculate `Page X of Y`
- [ ] Download correct filename
- [ ] Switch entire UI between English and Bangla
- [ ] Work with arbitrary requirements.json
- [ ] Work with arbitrary document filenames
- [ ] Handle malformed PDFs safely
- [ ] Handle ZIP packs
- [ ] Never hardcode sample-pack data

---

# 58. Final Deliverable

Produce a complete runnable project.

Include:

```text
package.json
vite.config.ts
tsconfig.json
index.html
src/...
README.md
```

README must explain:

1. How to install.
2. How to run locally.
3. How to build.
4. Main dependencies.
5. How PDF processing works.
6. How duplicate detection works.
7. How validation works.
8. How the package is generated.
9. Browser compatibility considerations.

Commands should be:

```bash
npm install
npm run dev
```

and:

```bash
npm run build
```

---

# 59. Implementation Priority

Work in this order:

## Phase 1 — Mandatory

1. App shell
2. requirements.json import
3. Tender display
4. Requirements list
5. PDF upload
6. PDF page count
7. PDF validation
8. Duplicate hashing
9. Matching
10. Expiry input
11. Validation statuses
12. Blocking logic
13. PDF package generation
14. Cover page
15. Footer/page numbering
16. Download
17. English/Bangla UI

## Phase 2 — Quality

18. Better error states
19. Processing progress
20. Responsive design
21. Accessibility
22. Reset workflow
23. ZIP import

## Phase 3 — Bonus

24. Auto-match suggestions
25. Index page
26. CSV export
27. Excel export
28. Save/reopen
29. PNG seal/signature
30. Bangla PDF text

Do not sacrifice mandatory functionality for bonus features.

---

# 60. Final Instruction to the Coding Agent

Build the application completely rather than merely producing a design mockup.

The application must actually:

- read real files
- parse real JSON
- parse real PDFs
- calculate real page counts
- hash real PDF contents
- detect real duplicates
- perform real validation
- merge real PDFs
- generate a real downloadable PDF

Do not use mocked document data in the production workflow.

Do not hardcode the sample tender.

Do not fake PDF generation.

Do not assume the number or names of requirements.

Do not assume filenames correspond to requirements.

The application should be robust enough that a judge can drop in an entirely different `sample-pack.zip` following the specified format and successfully prepare the final tender package.

Prioritize correctness of validation and generated PDF output over visual effects.

At the end, verify the app by testing at least these scenarios:

1. All mandatory documents valid → Generate enabled.
2. One mandatory document missing → Generate disabled.
3. Expiry date missing → Generate disabled.
4. Expired document → Generate disabled.
5. Expiry equals deadline → Generate enabled.
6. Optional document missing → Generate enabled.
7. Two identical PDFs with different names → duplicate warning.
8. Attempt to match duplicate copies to two requirements → prevented.
9. Requirements supplied in non-order sequence → output follows `order`.
10. Uploaded PDF contains multiple pages → all pages included.
11. Non-PDF upload → rejected safely.
12. Malformed/password-protected PDF → clear error, no application crash.
13. Final PDF has correct total page count and footer on every page.
14. Download filename exactly follows `<tender_id>_Package.pdf`.
15. Switching to Bangla changes UI/document names while generated mandatory cover remains English.

The result should feel like a real, reliable tender-document preparation tool that an office employee could confidently use before submitting a bid. 
CONTEST RULES (all must be satisfied)

Technical
- Frontend-only web app. No backend, serverless functions, Firebase/Supabase/Appwrite, or online storage. Persistence only via localStorage/sessionStorage/IndexedDB.
- Core features must work without AI and without external APIs. Any external API must be HTTPS and CORS-friendly, with a friendly fallback if it fails.
- Optional AI features: the user types their own API key (kept in memory only). No secrets in code, repo, or commits.
- Static deploy: provide build command and output folder, use relative asset paths. Must open in latest Chrome with no login or install, on desktop and mobile.
- Libraries via npm/CDN only if truly needed. No code copied from other projects.

Functionality
- Useful for an organization: clear workflows, tables/lists, search/filter, validation, and CSV/JSON export/import where relevant.
- Main tasks first; bonus tasks only after the main ones fully work.
- Include the problem's sample data so the app is demonstrable immediately.
- Handle empty, loading, invalid-input, and large-input states. No console errors.

Bilingual (Bangla + English)
- Visible language switch (বাংলা | EN) in the same header spot on every screen; remember the choice in localStorage.
- ALL labels, buttons, messages, errors, placeholders, and instructions exist in both languages. Use one i18n file (en/bn); never hardcode UI text.
- Format numbers and dates correctly per language.

DESIGN RULES (anti-AI-slop; save in design.md)

Goal: the app must look designed by a real product designer for this specific organization and problem, not AI-generated.
- Avoid: generic landing pages (first screen is the working tool), gradients, glassmorphism, glowing borders, neon, particles, blobs, excessive rounded corners, oversized headings, purposeless empty space, repeating the same card grid everywhere, decorative animation, trend-chasing.
- Do: one restrained palette (1 accent, neutral greys, semantic colors) as CSS variables; consistent type scale, spacing, borders, radii, shadows; clear hierarchy with one primary action per screen; tables, lists, split panes, or sidebars where they fit the data; some asymmetry or domain-specific detail; subtle transitions (150-200ms) only for state feedback; visible hover/focus/disabled/empty/loading/error states; good contrast and keyboard access.
- Bangla typography: use Noto Sans Bengali (or similar), line-height about 1.6, no fixed-width buttons or labels, layouts must survive longer Bangla text.
- Decision rule: before adding any visual effect or component, ask "Does this improve the user's experience or communicate something important?" If not, don't add it.

DELIVERABLES
- README.md: overview, main/bonus features, run locally, build command, deployment steps, live URL placeholder, language support note, how AI tools were used.
- MIT LICENSE, .gitignore (node_modules, dist, .env).
- skill.md (architecture and coding rules) and design.md (from the design rules above, with actual palette and fonts filled in).

WORKFLOW
1. First reply: a plan in max 10 lines (main tasks, bonus tasks, stack, folder structure, palette and fonts). Then wait for my "go".
2. Then build main tasks one small step at a time, giving only changed files or diffs.
3. After each step, a 3-line checklist: working / broken / next.
4. Before I say "final", check every rule above and report any gaps.
