import { PDFDocument, PDFFont, PDFPage, StandardFonts, degrees, rgb } from 'pdf-lib'

/**
 * Builds the final tender package.
 *
 * Page 1 is an English cover page (tender details + list of included documents).
 * Source documents follow in the order given. Every page, cover included, gets the
 * footer "<tender_id> | Page X of Y". Source pages keep their original size; their
 * content is embedded as vector data and scaled down slightly so a clean footer band
 * at the bottom never covers any of it.
 */

export type PackageTender = { tender_id: string; title: string; procuring_entity: string; bidder: string; submission_deadline: string }
export type PackageItem = { title: string; bytes: ArrayBuffer | Uint8Array }

const A4_W = 595.28
const A4_H = 841.89
const M = 48 // page margin on generated pages
const FOOTER_H = 38 // band reserved at the bottom of every page
const ROW_H = 21

const INK = rgb(0.09, 0.14, 0.2)
const PRIMARY = rgb(0.09, 0.235, 0.294)
const ACCENT = rgb(0.17, 0.478, 0.47)
const MUTED = rgb(0.38, 0.44, 0.48)
const RULE = rgb(0.82, 0.85, 0.83)
const ZEBRA = rgb(0.962, 0.969, 0.957)
const HEAD_FILL = rgb(0.9, 0.93, 0.92)

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/** "2026-10-20" -> "20 October 2026". Date-only, no timezone maths. */
export function formatLongDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) return iso
  const month = MONTHS[Number(m[2]) - 1]
  return month ? `${Number(m[3])} ${month} ${m[1]}` : iso
}

export function localIsoDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export function packageFilename(tenderId: string): string {
  return `${tenderId.replace(/[^\w.-]+/g, '_')}_Package.pdf`
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
  for (const word of pdfSafe(text).split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word
    if (font.widthOfTextAtSize(next, size) <= maxW) line = next
    else { if (line) lines.push(line); line = word }
  }
  if (line) lines.push(line)
  if (!lines.length) lines.push('-')
  const kept = lines.slice(0, maxLines)
  if (lines.length > maxLines) kept[maxLines - 1] = fitText(kept[maxLines - 1] + ' ...', font, size, maxW)
  return kept.map(l => fitText(l, font, size, maxW))
}

export async function buildPackage(tender: PackageTender, items: PackageItem[], now: Date = new Date()): Promise<{ bytes: Uint8Array; pageCount: number }> {
  const out = await PDFDocument.create()
  const font = await out.embedFont(StandardFonts.Helvetica)
  const bold = await out.embedFont(StandardFonts.HelveticaBold)

  // Load every source first so a bad file fails before anything is drawn.
  const sources: PDFDocument[] = []
  for (const item of items) sources.push(await PDFDocument.load(item.bytes))

  /* ---------- cover layout (computed first so page ranges are known) ---------- */

  const labelX = M
  const valueX = M + 132
  const valueW = A4_W - M - valueX
  const meta: { label: string; lines: string[] }[] = [
    { label: 'TENDER ID', lines: wrapText(tender.tender_id, bold, 11, valueW, 1) },
    { label: 'TENDER TITLE', lines: wrapText(tender.title, font, 11, valueW, 3) },
    { label: 'PROCURING ENTITY', lines: wrapText(tender.procuring_entity || '-', font, 11, valueW, 2) },
    { label: 'BIDDER', lines: wrapText(tender.bidder || '-', font, 11, valueW, 2) },
    { label: 'SUBMISSION DEADLINE', lines: [formatLongDate(tender.submission_deadline)] },
    { label: 'PACKAGE CREATED', lines: [formatLongDate(localIsoDate(now))] },
  ]
  const metaRowH = (n: number) => 14 + 14 * n
  const bandH = 98
  const metaTop = A4_H - bandH - 40
  let y = metaTop - 22 // below section heading
  for (const m of meta) y -= metaRowH(m.lines.length)
  const listTop1 = y - 30
  const listBottom = FOOTER_H + 24
  const cap1 = Math.max(1, Math.floor((listTop1 - 24 - ROW_H - listBottom) / ROW_H))
  const listTopN = A4_H - M - 8
  const capN = Math.max(1, Math.floor((listTopN - 24 - ROW_H - listBottom) / ROW_H))
  const coverCount = 1 + Math.max(0, Math.ceil((items.length - cap1) / capN))

  const ranges: string[] = []
  let cursor = coverCount + 1
  items.forEach((_, i) => {
    const n = sources[i].getPageCount()
    ranges.push(n === 1 ? `${cursor}` : `${cursor}-${cursor + n - 1}`)
    cursor += n
  })

  /* ---------- page 1: cover ---------- */

  let cover = out.addPage([A4_W, A4_H])
  cover.drawRectangle({ x: 0, y: A4_H - bandH, width: A4_W, height: bandH, color: PRIMARY })
  cover.drawRectangle({ x: 0, y: A4_H - bandH - 4, width: A4_W, height: 4, color: ACCENT })
  cover.drawText('TENDER SUBMISSION PACKAGE', { x: M, y: A4_H - 56, size: 23, font: bold, color: rgb(1, 1, 1) })
  cover.drawText(fitText(`${tender.tender_id}  |  ${tender.bidder || ''}`, font, 10.5, A4_W - 2 * M), { x: M, y: A4_H - 78, size: 10.5, font, color: rgb(0.78, 0.88, 0.9) })

  cover.drawText('TENDER DETAILS', { x: M, y: metaTop, size: 9, font: bold, color: ACCENT })
  cover.drawLine({ start: { x: M, y: metaTop - 8 }, end: { x: A4_W - M, y: metaTop - 8 }, thickness: 1, color: PRIMARY })
  y = metaTop - 22
  for (const m of meta) {
    const h = metaRowH(m.lines.length)
    cover.drawText(m.label, { x: labelX, y: y - 12, size: 7.5, font: bold, color: MUTED })
    m.lines.forEach((line, i) => cover.drawText(line, { x: valueX, y: y - 13 - i * 14, size: 11, font: m.label === 'TENDER ID' ? bold : font, color: INK }))
    y -= h
    cover.drawLine({ start: { x: M, y: y + 3 }, end: { x: A4_W - M, y: y + 3 }, thickness: 0.5, color: RULE })
  }

  const colNo = M + 10
  const colDoc = M + 46
  const colPages = A4_W - M - 120 // right edge of "Pages" column
  const colRange = A4_W - M - 10 // right edge of "Package pages" column

  const drawListHeader = (page: PDFPage, top: number, title: string) => {
    page.drawText(title, { x: M, y: top, size: 9, font: bold, color: ACCENT })
    const hy = top - 12 - ROW_H
    page.drawRectangle({ x: M, y: hy, width: A4_W - 2 * M, height: ROW_H, color: HEAD_FILL })
    page.drawText('No.', { x: colNo, y: hy + 7, size: 8.5, font: bold, color: PRIMARY })
    page.drawText('Document', { x: colDoc, y: hy + 7, size: 8.5, font: bold, color: PRIMARY })
    const pw = bold.widthOfTextAtSize('Pages', 8.5)
    page.drawText('Pages', { x: colPages - pw, y: hy + 7, size: 8.5, font: bold, color: PRIMARY })
    const rw = bold.widthOfTextAtSize('Package pages', 8.5)
    page.drawText('Package pages', { x: colRange - rw, y: hy + 7, size: 8.5, font: bold, color: PRIMARY })
    return hy
  }

  y = drawListHeader(cover, listTop1, 'INCLUDED DOCUMENTS (IN SUBMISSION ORDER)')
  let rowsOnPage = 0
  let capacity = cap1
  items.forEach((item, i) => {
    if (rowsOnPage === capacity) {
      cover = out.addPage([A4_W, A4_H])
      y = drawListHeader(cover, listTopN, 'INCLUDED DOCUMENTS (CONTINUED)')
      rowsOnPage = 0
      capacity = capN
    }
    y -= ROW_H
    if (rowsOnPage % 2 === 1) cover.drawRectangle({ x: M, y, width: A4_W - 2 * M, height: ROW_H, color: ZEBRA })
    cover.drawText(String(i + 1).padStart(2, '0'), { x: colNo, y: y + 7, size: 10, font, color: MUTED })
    cover.drawText(fitText(item.title, font, 10.5, colPages - 60 - colDoc), { x: colDoc, y: y + 7, size: 10.5, font, color: INK })
    const pages = String(sources[i].getPageCount())
    cover.drawText(pages, { x: colPages - font.widthOfTextAtSize(pages, 10.5), y: y + 7, size: 10.5, font, color: INK })
    cover.drawText(ranges[i], { x: colRange - font.widthOfTextAtSize(ranges[i], 10.5), y: y + 7, size: 10.5, font, color: INK })
    rowsOnPage++
  })
  cover.drawLine({ start: { x: M, y }, end: { x: A4_W - M, y }, thickness: 0.5, color: RULE })
  if (!items.length) cover.drawText('No documents were included.', { x: colDoc, y: y - 16, size: 10, font, color: MUTED })

  /* ---------- source documents ---------- */

  for (const src of sources) {
    const pages = src.getPages()
    const embedded = await out.embedPages(
      pages,
      pages.map(p => {
        const b = p.getCropBox()
        return { left: b.x, bottom: b.y, right: b.x + b.width, top: b.y + b.height }
      }),
    )
    pages.forEach((p, i) => {
      const box = p.getCropBox()
      const cw = box.width
      const ch = box.height
      const rot = (((p.getRotation().angle % 360) + 360) % 360) as 0 | 90 | 180 | 270
      const sideways = rot === 90 || rot === 270
      const dw = sideways ? ch : cw // displayed size = size of the new page
      const dh = sideways ? cw : ch
      const k = (dh - FOOTER_H) / dh // shrink so the footer band stays free
      const contentW = k * dw
      const offx = (dw - contentW) / 2
      let x = offx
      let yy = FOOTER_H
      let angle = 0
      if (rot === 90) { angle = -90; yy = FOOTER_H + k * cw }
      else if (rot === 180) { angle = 180; x = offx + k * cw; yy = FOOTER_H + k * ch }
      else if (rot === 270) { angle = 90; x = offx + k * ch }
      const page = out.addPage([dw, dh])
      page.drawPage(embedded[i], { x, y: yy, xScale: k, yScale: k, rotate: degrees(angle) })
    })
  }

  /* ---------- footer on every page (total known now) ---------- */

  const all = out.getPages()
  const total = all.length
  all.forEach((page, i) => {
    const { width } = page.getSize()
    const label = `${pdfSafe(tender.tender_id)} | Page ${i + 1} of ${total}`
    const size = 9.5
    const tw = bold.widthOfTextAtSize(label, size)
    const mx = Math.min(M, width * 0.08)
    page.drawRectangle({ x: 0, y: 0, width, height: FOOTER_H - 4, color: rgb(1, 1, 1) })
    page.drawLine({ start: { x: mx, y: FOOTER_H - 6 }, end: { x: width - mx, y: FOOTER_H - 6 }, thickness: 0.6, color: RULE })
    page.drawText(label, { x: (width - tw) / 2, y: 13, size, font: bold, color: INK })
  })

  out.setTitle(`${tender.tender_id} Submission Package`)
  out.setSubject(pdfSafe(tender.title))
  out.setCreator('Tender Package Builder')
  out.setProducer('Tender Package Builder')
  out.setCreationDate(now)

  return { bytes: await out.save(), pageCount: total }
}
