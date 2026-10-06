'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { PDFDocument, StandardFonts, rgb, type PDFFont } from 'pdf-lib'
import JSZip from 'jszip'
import { AlertTriangle, Check, FileArchive, FileText, FolderOpen, Languages, RefreshCcw, Trash2, Upload, X } from 'lucide-react'

/* ---------- Types ---------- */

type Lang = 'en' | 'bn'
type Tone = 'good' | 'warn' | 'bad' | 'muted'
type Requirement = { id: string; order: number; title_en: string; title_bn: string; mandatory: boolean; has_expiry: boolean }
type Tender = { tender_id: string; title: string; procuring_entity: string; bidder: string; submission_deadline: string }
type RequirementsFile = { tender: Tender; requirements: Requirement[] }
type Doc = { id: string; file: File; pages: number; hash: string; match?: string; expiry?: string; error?: string }
type DemoDocument = { path: string; name: string; match?: string; expiry?: string }

/* ---------- UI text (all interface copy lives here) ---------- */

const t = {
  en: {
    app: 'Tender package builder', eyebrow: 'LOCAL WORKSPACE',
    load: 'Load requirements', loadHint: 'Open requirements.json or a ZIP pack to begin.',
    demo: 'Load provided demo documents', drop: 'Drop requirements.json or ZIP here', browse: 'Browse files',
    tender: 'Tender ID', requirements: 'Required documents', documents: 'Uploaded PDF files',
    addPdf: 'Add PDF files', pdfHint: 'PDF only · files stay in your browser', status: 'Status',
    file: 'Matched file', expiry: 'Expiry date', required: 'Required', optional: 'Optional', yes: 'Yes', no: 'No',
    missing: 'Missing', needed: 'Expiry date needed', expired: 'Expired', ok: 'OK', notProvided: 'Not provided',
    generate: 'Generate package', generating: 'Generating…', clear: 'Clear workspace',
    duplicate: 'Exact duplicate', duplicateHint: 'Identical content. Only one copy can be used.',
    remove: 'Remove', noDocs: 'No PDFs uploaded yet', noDocsHint: 'Add the documents that belong to this tender.',
    invalid: 'Only PDF files are supported.',
    badJson: 'Could not read this file. Check that it is a valid requirements JSON or ZIP pack.',
    demoFailed: 'Could not load the demo documents.', generateFailed: 'Could not generate the package. Check the uploaded PDFs and try again.',
    loaded: 'Loaded', blockers: 'blocking issues', ready: 'Ready to generate', language: 'Language',
    order: 'Order', pages: 'pages', size: 'MB', choose: 'Choose a file', packageReady: 'Package downloaded',
    invalidPdf: 'Unable to read this PDF. It may be damaged or password protected.',
    complete: 'mandatory complete', deadline: 'Submission deadline', entity: 'Procuring entity', bidder: 'Bidder',
    localNote: 'Everything runs locally in this browser.', zipJson: 'ZIP pack / JSON',
  },
  bn: {
    app: 'টেন্ডার প্যাকেজ বিল্ডার', eyebrow: 'লোকাল ওয়ার্কস্পেস',
    load: 'প্রয়োজনীয়তা লোড করুন', loadHint: 'শুরু করতে requirements.json অথবা ZIP প্যাক খুলুন।',
    demo: 'প্রদত্ত ডেমো ডকুমেন্ট লোড করুন', drop: 'requirements.json বা ZIP এখানে ছাড়ুন', browse: 'ফাইল বাছাই করুন',
    tender: 'টেন্ডার আইডি', requirements: 'প্রয়োজনীয় ডকুমেন্ট', documents: 'আপলোড করা PDF',
    addPdf: 'PDF ফাইল যোগ করুন', pdfHint: 'শুধু PDF · ফাইল ব্রাউজারেই থাকে', status: 'স্ট্যাটাস',
    file: 'ম্যাচ করা ফাইল', expiry: 'মেয়াদ শেষের তারিখ', required: 'আবশ্যিক', optional: 'ঐচ্ছিক', yes: 'হ্যাঁ', no: 'না',
    missing: 'অনুপস্থিত', needed: 'মেয়াদ শেষের তারিখ প্রয়োজন', expired: 'মেয়াদ শেষ', ok: 'ঠিক আছে', notProvided: 'দেওয়া হয়নি',
    generate: 'প্যাকেজ তৈরি করুন', generating: 'তৈরি হচ্ছে…', clear: 'ওয়ার্কস্পেস পরিষ্কার করুন',
    duplicate: 'হুবহু ডুপ্লিকেট', duplicateHint: 'একই কনটেন্ট। শুধু একটি কপি ব্যবহার করা যাবে।',
    remove: 'সরান', noDocs: 'এখনও কোনো PDF নেই', noDocsHint: 'এই টেন্ডারের ডকুমেন্টগুলো যোগ করুন।',
    invalid: 'শুধু PDF ফাইল সমর্থিত।',
    badJson: 'ফাইল পড়া যায়নি। সঠিক requirements JSON বা ZIP প্যাক কি না দেখুন।',
    demoFailed: 'ডেমো ডকুমেন্ট লোড করা যায়নি।', generateFailed: 'প্যাকেজ তৈরি করা যায়নি। আপলোড করা PDF দেখে আবার চেষ্টা করুন।',
    loaded: 'লোড হয়েছে', blockers: 'সমস্যা বাকি', ready: 'তৈরি করা যাবে', language: 'ভাষা',
    order: 'ক্রম', pages: 'পৃষ্ঠা', size: 'MB', choose: 'ফাইল বাছাই করুন', packageReady: 'প্যাকেজ ডাউনলোড হয়েছে',
    invalidPdf: 'PDF পড়া যায়নি। ফাইলটি ক্ষতিগ্রস্ত বা পাসওয়ার্ড-সুরক্ষিত হতে পারে।',
    complete: 'আবশ্যিক সম্পূর্ণ', deadline: 'জমাদানের শেষ তারিখ', entity: 'ক্রয়কারী প্রতিষ্ঠান', bidder: 'দরদাতা',
    localNote: 'সবকিছু এই ব্রাউজারেই চলে।', zipJson: 'ZIP প্যাক / JSON',
  },
}

/* ---------- Demo data ---------- */

const sample: RequirementsFile = {
  tender: { tender_id: 'T-2026-0417', title: 'Supply of IT Equipment', procuring_entity: 'Example Directorate', bidder: 'Example Company Ltd.', submission_deadline: '2026-10-20' },
  requirements: [
    { id: 'R01', order: 1, title_en: 'Trade License', title_bn: 'ট্রেড লাইসেন্স', mandatory: true, has_expiry: true },
    { id: 'R02', order: 2, title_en: 'TIN Certificate', title_bn: 'টিআইএন সার্টিফিকেট', mandatory: true, has_expiry: false },
    { id: 'R03', order: 3, title_en: 'VAT Certificate', title_bn: 'ভ্যাট সার্টিফিকেট', mandatory: false, has_expiry: true },
    { id: 'R04', order: 4, title_en: 'Bank Solvency Certificate', title_bn: 'ব্যাংক সলভেন্সি সার্টিফিকেট', mandatory: true, has_expiry: false },
  ],
}

const demoDocuments: DemoDocument[] = [
  { path: '/demo-documents/financial-proposal.pdf', name: 'financial-proposal.pdf' },
  { path: '/demo-documents/technical-proposal.pdf', name: 'technical-proposal.pdf' },
  { path: '/demo-documents/tin-certificate.pdf', name: 'tin-certificate.pdf', match: 'R02' },
  { path: '/demo-documents/vat-certificate.pdf', name: 'vat-certificate.pdf', match: 'R03', expiry: '2026-12-31' },
  { path: '/demo-documents/bank-solvency.pdf', name: 'bank-solvency.pdf', match: 'R04' },
  { path: '/demo-documents/experience-certificate.pdf', name: 'experience-certificate.pdf' },
  { path: '/demo-documents/experience-certificate-2.pdf', name: 'experience-certificate-2.pdf' },
  { path: '/demo-documents/declaration.pdf', name: 'declaration.pdf' },
  { path: '/demo-documents/trade-license-2025.pdf', name: 'trade-license-2025.pdf' },
  { path: '/demo-documents/trade-license-2026.pdf', name: 'trade-license-2026.pdf', match: 'R01', expiry: '2026-12-31' },
]

/* ---------- Helpers ---------- */

const isoDate = /^\d{4}-\d{2}-\d{2}$/
const isStr = (v: unknown): v is string => typeof v === 'string' && v.trim() !== ''

/** Validates the requirements JSON. Returns null when the shape is wrong. */
function parseRequirements(json: unknown): RequirementsFile | null {
  const j = json as { tender?: Record<string, unknown>; requirements?: unknown[] } | null
  if (!j || typeof j !== 'object' || !j.tender || !Array.isArray(j.requirements) || j.requirements.length === 0) return null
  const tn = j.tender
  if (!isStr(tn.tender_id) || !isStr(tn.title) || !isStr(tn.submission_deadline) || !isoDate.test(tn.submission_deadline)) return null
  const ids = new Set<string>()
  const requirements: Requirement[] = []
  for (const raw of j.requirements) {
    const r = raw as Record<string, unknown>
    if (!r || !isStr(r.id) || !isStr(r.title_en) || typeof r.order !== 'number' || typeof r.mandatory !== 'boolean' || typeof r.has_expiry !== 'boolean') return null
    if (ids.has(r.id)) return null
    ids.add(r.id)
    requirements.push({ id: r.id, order: r.order, title_en: r.title_en, title_bn: isStr(r.title_bn) ? r.title_bn : r.title_en, mandatory: r.mandatory, has_expiry: r.has_expiry })
  }
  return {
    tender: {
      tender_id: tn.tender_id, title: tn.title, submission_deadline: tn.submission_deadline,
      procuring_entity: isStr(tn.procuring_entity) ? tn.procuring_entity : '', bidder: isStr(tn.bidder) ? tn.bidder : '',
    },
    requirements,
  }
}

function formatMB(bytes: number) { return (bytes / 1024 / 1024).toFixed(2) }

function statusFor(r: Requirement, d: Doc | undefined, deadline: string, s: (typeof t)['en']): { label: string; tone: Tone } {
  if (!d) return r.mandatory ? { label: s.missing, tone: 'bad' } : { label: s.notProvided, tone: 'muted' }
  if (r.has_expiry && !d.expiry) return { label: s.needed, tone: 'warn' }
  // Valid through the deadline day; ISO dates compare correctly as strings.
  if (r.has_expiry && d.expiry! < deadline) return { label: s.expired, tone: 'bad' }
  return { label: s.ok, tone: 'good' }
}

/** True when another file with identical content is already matched to a different requirement. */
function hashUsedElsewhere(docs: Doc[], target: Doc, reqId: string) {
  return docs.some(y => y.id !== target.id && y.hash !== '' && y.hash === target.hash && y.match !== undefined && y.match !== reqId)
}

/** Helvetica (WinAnsi) cannot draw other scripts; replace unsupported characters. */
const pdfSafe = (v: string) => v.replace(/[^\x20-\x7E\u00A0-\u00FF]/g, '?')

function fitText(text: string, font: PDFFont, size: number, maxW: number) {
  let out = pdfSafe(text)
  if (font.widthOfTextAtSize(out, size) <= maxW) return out
  while (out.length > 1 && font.widthOfTextAtSize(out + '...', size) > maxW) out = out.slice(0, -1)
  return out + '...'
}

function wrapText(text: string, font: PDFFont, size: number, maxW: number, maxLines: number) {
  const lines: string[] = []
  let line = ''
  for (const word of pdfSafe(text).split(/\s+/)) {
    const next = line ? `${line} ${word}` : word
    if (font.widthOfTextAtSize(next, size) <= maxW) line = next
    else { if (line) lines.push(line); line = word }
  }
  if (line) lines.push(line)
  return lines.slice(0, maxLines).map(l => fitText(l, font, size, maxW))
}

/* ---------- Page ---------- */

export default function Page() {
  const [lang, setLang] = useState<Lang>('en')
  const [data, setData] = useState<RequirementsFile | null>(null)
  const [docs, setDocs] = useState<Doc[]>([])
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [drag, setDrag] = useState(false)
  const [busy, setBusy] = useState(false)
  const reqRef = useRef<HTMLInputElement>(null)
  const pdfRef = useRef<HTMLInputElement>(null)
  const s = t[lang]

  // Read the saved language after mount so server and client render the same first HTML.
  useEffect(() => {
    try {
      const saved = localStorage.getItem('tender-lang')
      if (saved === 'en' || saved === 'bn') setLang(saved)
    } catch { /* storage unavailable */ }
  }, [])
  useEffect(() => { document.documentElement.lang = lang }, [lang])

  const setLanguage = (l: Lang) => {
    setLang(l)
    try { localStorage.setItem('tender-lang', l) } catch { /* storage unavailable */ }
  }

  const reqs = useMemo(() => (data ? [...data.requirements].sort((a, b) => a.order - b.order) : []), [data])
  const rows = useMemo(
    () => reqs.map(r => {
      const doc = docs.find(x => x.match === r.id)
      return { r, doc, st: statusFor(r, doc, data!.tender.submission_deadline, s) }
    }),
    [reqs, docs, data, s],
  )
  const blockers = rows.filter(x => x.st.tone === 'bad' || x.st.tone === 'warn').length
  const mandatoryTotal = rows.filter(x => x.r.mandatory).length
  const mandatoryDone = rows.filter(x => x.r.mandatory && x.st.tone === 'good').length

  /* --- loading --- */

  async function addFiles(files: File[], metadata: DemoDocument[] = []) {
    setBusy(true)
    const added: Doc[] = []
    const problems: string[] = []
    try {
      for (const file of files) {
        if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) { problems.push(`${file.name}: ${s.invalid}`); continue }
        const meta = metadata.find(item => item.name === file.name)
        const base = { id: crypto.randomUUID(), file, match: meta?.match, expiry: meta?.expiry }
        try {
          const bytes = await file.arrayBuffer()
          const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))).map(x => x.toString(16).padStart(2, '0')).join('')
          const pdf = await PDFDocument.load(bytes)
          added.push({ ...base, pages: pdf.getPageCount(), hash })
        } catch {
          added.push({ ...base, match: undefined, expiry: undefined, pages: 0, hash: '', error: s.invalidPdf })
        }
      }
      setDocs(prev => [...prev, ...added])
      if (problems.length) setError(problems.join(' '))
    } finally {
      setBusy(false)
    }
  }

  async function loadInput(file: File) {
    setError(''); setNotice('')
    const name = file.name.toLowerCase()
    try {
      if (name.endsWith('.zip')) {
        const zip = await JSZip.loadAsync(file)
        const entries = Object.values(zip.files).filter(x => !x.dir && !x.name.startsWith('__MACOSX/'))
        const jsonEntry = entries.find(x => x.name.toLowerCase().endsWith('requirements.json'))
        const parsed = jsonEntry ? parseRequirements(JSON.parse(await jsonEntry.async('string'))) : null
        if (!parsed) { setError(s.badJson); return }
        setData(parsed); setDocs([])
        const pdfFiles = await Promise.all(
          entries.filter(x => x.name.toLowerCase().endsWith('.pdf')).map(async x => new File([await x.async('blob')], x.name.split('/').pop() || 'document.pdf', { type: 'application/pdf' })),
        )
        await addFiles(pdfFiles)
      } else if (name.endsWith('.json')) {
        const parsed = parseRequirements(JSON.parse(await file.text()))
        if (!parsed) { setError(s.badJson); return }
        setData(parsed); setDocs([])
      } else {
        setError(s.badJson)
      }
    } catch {
      setError(s.badJson)
    }
  }

  async function loadDemo() {
    setBusy(true); setError(''); setNotice('')
    try {
      const files = await Promise.all(
        demoDocuments.map(async item => {
          const res = await fetch(item.path)
          if (!res.ok) throw new Error(item.path)
          return new File([await res.blob()], item.name, { type: 'application/pdf' })
        }),
      )
      setData(sample); setDocs([])
      await addFiles(files, demoDocuments)
    } catch {
      setError(s.demoFailed)
    } finally {
      setBusy(false)
    }
  }

  /* --- editing --- */

  function matchDoc(id: string, reqId: string) {
    const target = docs.find(d => d.id === id)
    if (!target || target.error) return
    if (hashUsedElsewhere(docs, target, reqId)) { setError(s.duplicateHint); return }
    setError('')
    setDocs(prev => prev.map(d => {
      if (d.id === id) return { ...d, match: reqId, expiry: d.match === reqId ? d.expiry : undefined }
      if (d.match === reqId) return { ...d, match: undefined, expiry: undefined }
      return d
    }))
  }
  const unmatch = (id: string) => setDocs(prev => prev.map(d => (d.id === id ? { ...d, match: undefined, expiry: undefined } : d)))
  const removeDoc = (id: string) => setDocs(prev => prev.filter(d => d.id !== id))
  const setExpiry = (reqId: string, value: string) => setDocs(prev => prev.map(d => (d.match === reqId ? { ...d, expiry: value } : d)))
  const resetWorkspace = () => { setData(null); setDocs([]); setError(''); setNotice('') }

  /* --- package generation --- */

  async function generate() {
    if (!data || blockers > 0 || busy) return
    setBusy(true); setError(''); setNotice('')
    let url = ''
    try {
      const included = rows.filter(x => x.doc && !x.doc.error) as { r: Requirement; doc: Doc }[]
      const out = await PDFDocument.create()
      const font = await out.embedFont(StandardFonts.Helvetica)
      const bold = await out.embedFont(StandardFonts.HelveticaBold)
      const W = 595, H = 842, M = 48, FIRST_ROWS = 22, NEXT_ROWS = 32
      const coverCount = 1 + Math.ceil(Math.max(0, included.length - FIRST_ROWS) / NEXT_ROWS)
      const ink = rgb(0.09, 0.14, 0.2)

      // Cover page(s): tender details plus a table of contents with page ranges.
      let cover = out.addPage([W, H])
      let y = H - 62
      cover.drawText('TENDER SUBMISSION PACKAGE', { x: M, y, size: 20, font: bold, color: ink }); y -= 34
      for (const line of wrapText(data.tender.title, bold, 14, W - 2 * M, 3)) { cover.drawText(line, { x: M, y, size: 14, font: bold, color: ink }); y -= 20 }
      y -= 10
      const info = [`Tender ID: ${data.tender.tender_id}`, `Procuring entity: ${data.tender.procuring_entity || '-'}`, `Bidder: ${data.tender.bidder || '-'}`, `Submission deadline: ${data.tender.submission_deadline}`]
      for (const line of info) { cover.drawText(fitText(line, font, 11, W - 2 * M), { x: M, y, size: 11, font, color: ink }); y -= 18 }
      y -= 14

      const header = (page: typeof cover, yy: number, title: string) => {
        page.drawText(title, { x: M, y: yy, size: 12, font: bold, color: ink })
        yy -= 22
        page.drawText('No.', { x: M, y: yy, size: 9, font: bold }); page.drawText('Document', { x: M + 40, y: yy, size: 9, font: bold })
        page.drawText('Pages', { x: 430, y: yy, size: 9, font: bold }); page.drawText('Page range', { x: 490, y: yy, size: 9, font: bold })
        return yy - 20
      }
      y = header(cover, y, 'Contents')

      let nextPage = coverCount + 1
      let rowsOnPage = 0
      let capacity = FIRST_ROWS
      included.forEach(({ r, doc }, i) => {
        if (rowsOnPage === capacity) {
          cover = out.addPage([W, H]); y = header(cover, H - 62, 'Contents (continued)'); rowsOnPage = 0; capacity = NEXT_ROWS
        }
        const range = doc.pages === 1 ? `${nextPage}` : `${nextPage}-${nextPage + doc.pages - 1}`
        cover.drawText(String(i + 1).padStart(2, '0'), { x: M, y, size: 10, font })
        cover.drawText(fitText(r.title_en, font, 10, 370), { x: M + 40, y, size: 10, font })
        cover.drawText(String(doc.pages), { x: 430, y, size: 10, font })
        cover.drawText(range, { x: 490, y, size: 10, font })
        nextPage += doc.pages; y -= 20; rowsOnPage++
      })

      // Source documents, in requirement order.
      for (const { doc } of included) {
        const src = await PDFDocument.load(await doc.file.arrayBuffer())
        const copied = await out.copyPages(src, src.getPageIndices())
        copied.forEach(p => out.addPage(p))
      }

      const bytes = await out.save()
      url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `${data.tender.tender_id.replace(/[^\w.-]+/g, '_')}_Package.pdf`
      document.body.appendChild(a); a.click(); a.remove()
      setNotice(s.packageReady)
    } catch {
      setError(s.generateFailed)
    } finally {
      if (url) setTimeout(() => URL.revokeObjectURL(url), 2000)
      setBusy(false)
    }
  }

  /* --- view --- */

  const errorBox = error && (
    <div role="alert" className="mt-4 flex items-start gap-2 rounded-md border border-[#e3aaa1] bg-[#fff4f1] p-3 text-sm text-[#9d3e32]">
      <AlertTriangle size={16} className="mt-0.5 shrink-0" />
      <span>{error}</span>
      <button type="button" aria-label="Dismiss" onClick={() => setError('')} className="ml-auto"><X size={15} /></button>
    </div>
  )

  return (
    <main className="min-h-screen bg-[#f5f6f2] text-[#172333]">
      <header className="border-b border-[#d8ddd7] bg-[#fbfcf9]">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-4 lg:px-10">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#105b74] text-white"><FileText size={18} aria-hidden="true" /></div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#50717b]">{s.eyebrow}</p>
              <h1 className="text-base font-semibold tracking-tight">{s.app}</h1>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm" role="group" aria-label={s.language}>
            <Languages size={16} className="text-[#50717b]" aria-hidden="true" />
            <button type="button" aria-pressed={lang === 'en'} onClick={() => setLanguage('en')} className={lang === 'en' ? 'font-semibold text-[#173c4b]' : 'text-[#75818a]'}>EN</button>
            <span className="text-[#c2c9c5]" aria-hidden="true">|</span>
            <button type="button" aria-pressed={lang === 'bn'} onClick={() => setLanguage('bn')} className={lang === 'bn' ? 'font-semibold text-[#173c4b]' : 'text-[#75818a]'}>বাংলা</button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1440px] px-5 py-7 lg:px-10">
        {!data ? (
          <section className="mx-auto max-w-2xl pt-16">
            <div className="mb-8">
              <h2 className="text-3xl font-semibold tracking-[-.03em]">{s.load}</h2>
              <p className="mt-3 text-sm leading-6 text-[#66737c]">{s.loadHint}</p>
            </div>
            <div
              onDragOver={e => { e.preventDefault(); setDrag(true) }}
              onDragLeave={() => setDrag(false)}
              onDrop={e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) loadInput(f) }}
              className={`rounded-lg border-2 border-dashed p-12 text-center transition-colors ${drag ? 'border-[#2c7a78] bg-[#edf6f2]' : 'border-[#bbc8c4] bg-[#fbfcf9]'}`}
            >
              <FileArchive className="mx-auto mb-4 text-[#50717b]" size={32} aria-hidden="true" />
              <p className="text-sm font-medium">{s.drop}</p>
              <p className="mt-2 text-xs text-[#7b878b]">{s.zipJson}</p>
              <button type="button" onClick={() => reqRef.current?.click()} className="mt-6 inline-flex items-center gap-2 rounded-md bg-[#173c4b] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#225567]">
                <FolderOpen size={16} aria-hidden="true" />{s.browse}
              </button>
              <input ref={reqRef} hidden type="file" accept=".json,.zip,application/json,application/zip" onChange={e => { const f = e.target.files?.[0]; if (f) loadInput(f); e.target.value = '' }} />
            </div>
            {errorBox}
            <div className="mt-8 flex flex-wrap items-center gap-2 text-xs text-[#78858a]">
              <button type="button" onClick={loadDemo} disabled={busy} className="rounded-md border border-[#9eb5af] bg-[#edf6f2] px-3 py-2 font-semibold text-[#245f60] hover:bg-[#e1f0eb] disabled:opacity-50">{s.demo}</button>
              <span aria-hidden="true">·</span>
              <span>{s.localNote}</span>
            </div>
          </section>
        ) : (
          <>
            <div className="mb-7 flex flex-col justify-between gap-4 border-b border-[#d8ddd7] pb-6 md:flex-row md:items-end">
              <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[.16em] text-[#6d8585]">{s.loaded} · {data.tender.tender_id}</p>
                <h2 className="text-2xl font-semibold tracking-[-.03em]">{data.tender.title}</h2>
              </div>
              <div className="flex items-center gap-3">
                <button type="button" onClick={resetWorkspace} className="inline-flex items-center gap-2 rounded-md border border-[#cbd4d0] bg-white px-3 py-2 text-sm font-medium text-[#43545c] hover:bg-[#f2f5f2]">
                  <RefreshCcw size={15} aria-hidden="true" />{s.clear}
                </button>
                <button type="button" disabled={blockers > 0 || busy} onClick={generate} className="inline-flex items-center gap-2 rounded-md bg-[#173c4b] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#225567] disabled:cursor-not-allowed disabled:opacity-40">
                  {busy ? <RefreshCcw size={16} className="animate-spin" aria-hidden="true" /> : <Check size={16} aria-hidden="true" />}
                  {busy ? s.generating : s.generate}
                </button>
              </div>
            </div>

            <section className="grid gap-4 border-b border-[#d8ddd7] pb-6 md:grid-cols-4">
              {[[s.tender, data.tender.tender_id], [s.entity, data.tender.procuring_entity], [s.bidder, data.tender.bidder], [s.deadline, data.tender.submission_deadline]].map(([label, value]) => (
                <div key={label}><p className="label">{label}</p><p className="mt-1 text-sm font-medium">{value || '—'}</p></div>
              ))}
            </section>

            {errorBox}
            {notice && <div role="status" className="mt-4 flex items-center gap-2 rounded-md border border-[#a9d3c3] bg-[#e6f3ed] p-3 text-sm text-[#28705e]"><Check size={16} aria-hidden="true" />{notice}</div>}

            <div className="mt-7 grid gap-7 xl:grid-cols-[minmax(0,1.55fr)_minmax(340px,.8fr)]">
              <section>
                <div className="mb-3 flex items-end justify-between">
                  <div>
                    <p className="label">{s.requirements}</p>
                    <h3 className="mt-1 text-lg font-semibold">{mandatoryDone} / {mandatoryTotal} {s.complete}</h3>
                  </div>
                  <span className={`text-xs font-semibold ${blockers ? 'text-[#af4b3d]' : 'text-[#2d7164]'}`}>{blockers ? `${blockers} ${s.blockers}` : s.ready}</span>
                </div>
                <div className="overflow-hidden rounded-md border border-[#d8ddd7] bg-white">
                  <div className="hidden grid-cols-[48px_minmax(180px,1fr)_110px_180px_150px] gap-3 border-b border-[#d8ddd7] bg-[#f8faf7] px-4 py-3 text-[10px] font-bold uppercase tracking-[.1em] text-[#718087] md:grid">
                    <span>{s.order}</span><span>{s.requirements}</span><span>{s.status}</span><span>{s.file}</span><span>{s.expiry}</span>
                  </div>
                  {rows.map(({ r, doc, st }, i) => {
                    const title = lang === 'bn' ? r.title_bn : r.title_en
                    const options = docs.filter(x => !x.error && (!x.match || x.match === r.id) && !hashUsedElsewhere(docs, x, r.id))
                    return (
                      <div key={r.id} className="grid gap-3 border-b border-[#e8ece8] px-4 py-4 last:border-0 md:grid-cols-[48px_minmax(180px,1fr)_110px_180px_150px] md:items-center">
                        <div className="text-sm font-semibold text-[#809096]">{String(i + 1).padStart(2, '0')}</div>
                        <div>
                          <p className="text-sm font-semibold">{title}</p>
                          <p className="mt-1 text-[11px] text-[#819097]">{r.id} · {r.mandatory ? s.required : s.optional} · {s.expiry}: {r.has_expiry ? s.yes : s.no}</p>
                        </div>
                        <div><span className={`status status-${st.tone}`}>{st.label}</span></div>
                        <div>
                          <select
                            aria-label={`${s.file}: ${title}`}
                            value={doc?.id || ''}
                            onChange={e => (e.target.value ? matchDoc(e.target.value, r.id) : doc && unmatch(doc.id))}
                            className="w-full rounded border border-[#ccd6d2] bg-white px-2 py-2 text-xs"
                          >
                            <option value="">{s.choose}</option>
                            {options.map(x => <option key={x.id} value={x.id}>{x.file.name}</option>)}
                          </select>
                        </div>
                        <div>
                          {doc && r.has_expiry ? (
                            <input type="date" aria-label={`${s.expiry}: ${title}`} value={doc.expiry || ''} onChange={e => setExpiry(r.id, e.target.value)} className="w-full rounded border border-[#ccd6d2] px-2 py-2 text-xs" />
                          ) : (
                            <span className="text-xs text-[#9aa5a8]">{r.has_expiry ? '—' : ''}</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>

              <aside>
                <div className="mb-3">
                  <p className="label">{s.documents}</p>
                  <h3 className="mt-1 text-lg font-semibold">{docs.length} PDF</h3>
                </div>
                <button
                  type="button"
                  onClick={() => pdfRef.current?.click()}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); addFiles(Array.from(e.dataTransfer.files)) }}
                  className="w-full cursor-pointer rounded-md border-2 border-dashed border-[#bdcbc6] bg-[#fbfcf9] p-5 text-center hover:border-[#2c7a78]"
                >
                  <Upload className="mx-auto mb-2 text-[#50717b]" size={22} aria-hidden="true" />
                  <span className="block text-sm font-semibold">{s.addPdf}</span>
                  <span className="mt-1 block text-xs text-[#7d8a8e]">{s.pdfHint}</span>
                </button>
                <input ref={pdfRef} hidden multiple type="file" accept="application/pdf,.pdf" onChange={e => { addFiles(Array.from(e.target.files || [])); e.target.value = '' }} />

                <div className="mt-3 space-y-2">
                  {docs.length === 0 ? (
                    <div className="rounded-md border border-[#d8ddd7] bg-white p-6 text-center">
                      <FileText className="mx-auto mb-2 text-[#9aa7a7]" size={22} aria-hidden="true" />
                      <p className="text-sm font-medium">{s.noDocs}</p>
                      <p className="mt-1 text-xs text-[#7d898d]">{s.noDocsHint}</p>
                    </div>
                  ) : docs.map(d => {
                    const matched = reqs.find(r => r.id === d.match)
                    const isDuplicate = d.hash !== '' && docs.filter(x => x.hash === d.hash).length > 1
                    return (
                      <div key={d.id} className={`rounded-md border bg-white p-3 ${d.error ? 'border-[#e3aaa1]' : 'border-[#d8ddd7]'}`}>
                        <div className="flex items-start gap-2">
                          <FileText size={17} className="mt-0.5 shrink-0 text-[#547a80]" aria-hidden="true" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{d.file.name}</p>
                            {d.error ? (
                              <p className="mt-1 text-xs text-[#a34a3d]">{d.error}</p>
                            ) : (
                              <p className="mt-1 text-[11px] text-[#7c898d]">
                                {d.pages} {s.pages} · {formatMB(d.file.size)} {s.size}
                                {isDuplicate && <span className="ml-1 font-semibold text-[#a56a24]">· {s.duplicate}</span>}
                              </p>
                            )}
                          </div>
                          <button type="button" aria-label={`${s.remove} ${d.file.name}`} onClick={() => removeDoc(d.id)} className="text-[#9aa5a8] hover:text-[#a34a3d]"><Trash2 size={15} aria-hidden="true" /></button>
                        </div>
                        {matched && <p className="mt-2 border-t border-[#eef1ee] pt-2 text-[11px] text-[#4f696d]">{s.file}: {lang === 'bn' ? matched.title_bn : matched.title_en}</p>}
                      </div>
                    )
                  })}
                </div>
              </aside>
            </div>
          </>
        )}
      </div>
    </main>
  )
}
