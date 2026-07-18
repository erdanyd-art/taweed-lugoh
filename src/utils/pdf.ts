import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const BRAND_COLOR: [number, number, number] = [21, 128, 61]

interface PdfReportOptions {
  title: string
  columns: string[]
  rows: (string | number)[][]
  filename: string
}

/** Generic table-report generator — the shared base for every PDF export in the app. */
function generatePdfReport({ title, columns, rows, filename }: PdfReportOptions): void {
  const doc = new jsPDF()
  const generatedAt = new Date().toLocaleString('id-ID', {
    dateStyle: 'long',
    timeStyle: 'short',
  })

  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0)
  doc.text(title, 14, 18)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(110)
  doc.text(`Generated: ${generatedAt}`, 14, 25)

  autoTable(doc, {
    head: [columns],
    body: rows,
    startY: 30,
    theme: 'striped',
    headStyles: { fillColor: BRAND_COLOR, textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 3 },
    margin: { left: 14, right: 14 },
  })

  doc.save(filename)
}

function timestampedFilename(prefix: string): string {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
  return `${prefix}-${stamp}.pdf`
}

export interface AttendanceReportRow {
  studentName: string
  className: string
  meeting: string
  status: string
}

export function exportAttendanceReport(rows: AttendanceReportRow[]): void {
  generatePdfReport({
    title: 'Taweed Lughoh Attendance Report',
    columns: ['Student Name', 'Class', 'Meeting', 'Attendance Status'],
    rows: rows.map((row) => [row.studentName, row.className, row.meeting, row.status]),
    filename: timestampedFilename('attendance-report'),
  })
}

export interface ScoreReportRow {
  studentName: string
  className: string
  preTest: number | null
  postTest: number | null
}

function formatScore(value: number | null): string {
  return value === null ? '—' : String(value)
}

function formatImprovement(preTest: number | null, postTest: number | null): string {
  if (preTest === null || postTest === null) return '—'
  const improvement = postTest - preTest
  return improvement >= 0 ? `+${improvement}` : String(improvement)
}

export function exportScoreReport(rows: ScoreReportRow[]): void {
  generatePdfReport({
    title: 'Taweed Lughoh Score Report',
    columns: ['Student Name', 'Class', 'Pre Test', 'Post Test', 'Improvement'],
    rows: rows.map((row) => [
      row.studentName,
      row.className,
      formatScore(row.preTest),
      formatScore(row.postTest),
      formatImprovement(row.preTest, row.postTest),
    ]),
    filename: timestampedFilename('score-report'),
  })
}
