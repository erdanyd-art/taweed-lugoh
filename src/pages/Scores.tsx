import { useMemo, useState } from 'react'
import { Check, Download } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { TableToolbar } from '@/components/shared/TableToolbar'
import { SearchBar } from '@/components/shared/SearchBar'
import { FilterSelect } from '@/components/shared/FilterSelect'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingState } from '@/components/shared/LoadingState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useStudents } from '@/hooks/useStudents'
import { useClasses } from '@/hooks/useClasses'
import { parseOptionalScore, validateScore } from '@/utils/validation'
import { exportScoreReport } from '@/utils/pdf'
import { cn } from '@/lib/utils'

interface ScoreDraft {
  preTest: string
  postTest: string
}

interface ScoreFieldErrors {
  preTest?: string
  postTest?: string
}

export function Scores() {
  const { students, isLoading: isStudentsLoading, saveScores } = useStudents()
  const { classes, isLoading: isClassesLoading } = useClasses()

  const [classId, setClassId] = useState('all')
  const [search, setSearch] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [justSaved, setJustSaved] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Unsaved edits, keyed by student id. A student only appears here once
  // either of their fields has been touched, seeded from their current
  // saved values so the other (untouched) field isn't lost when sent.
  const [drafts, setDrafts] = useState<Record<string, ScoreDraft>>({})
  const [errors, setErrors] = useState<Record<string, ScoreFieldErrors>>({})

  const loading = isStudentsLoading || isClassesLoading

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase()
    return students
      .filter((student) => classId === 'all' || student.classId === classId)
      .filter((student) => !query || student.name.toLowerCase().includes(query))
  }, [students, classId, search])

  const dirtyIds = Object.keys(drafts)
  const hasErrors = Object.values(errors).some(
    (fieldErrors) => fieldErrors.preTest || fieldErrors.postTest,
  )

  function classNameFor(id: string) {
    return classes.find((cls) => cls.id === id)?.name ?? '—'
  }

  function handleExportPdf() {
    exportScoreReport(
      rows.map((student) => ({
        studentName: student.name,
        className: classNameFor(student.classId),
        preTest: student.preTest,
        postTest: student.postTest,
      })),
    )
  }

  function updateDraftField(
    student: { id: string; preTest: number | null; postTest: number | null },
    field: keyof ScoreDraft,
    value: string,
  ) {
    setDrafts((prev) => {
      const current = prev[student.id] ?? {
        preTest: student.preTest?.toString() ?? '',
        postTest: student.postTest?.toString() ?? '',
      }
      return { ...prev, [student.id]: { ...current, [field]: value } }
    })
    setErrors((prev) => ({
      ...prev,
      [student.id]: { ...prev[student.id], [field]: validateScore(value) },
    }))
  }

  async function handleSaveAllScores() {
    if (dirtyIds.length === 0) return

    const nextErrors: typeof errors = {}
    let anyError = false
    dirtyIds.forEach((id) => {
      const draft = drafts[id]
      const fieldErrors: ScoreFieldErrors = {
        preTest: validateScore(draft.preTest),
        postTest: validateScore(draft.postTest),
      }
      if (fieldErrors.preTest || fieldErrors.postTest) anyError = true
      nextErrors[id] = fieldErrors
    })
    setErrors((prev) => ({ ...prev, ...nextErrors }))
    if (anyError) return

    setSubmitError(null)
    setIsSaving(true)
    try {
      await saveScores(
        dirtyIds.map((id) => ({
          studentId: id,
          preTest: parseOptionalScore(drafts[id].preTest),
          postTest: parseOptionalScore(drafts[id].postTest),
        })),
      )
      setDrafts({})
      setErrors({})
      setJustSaved(true)
      setTimeout(() => setJustSaved(false), 2000)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to save scores.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Scores"
        description="Pre-test and post-test results per student"
        action={
          <div className="flex items-center gap-3">
            {justSaved ? (
              <span className="flex items-center gap-1 text-sm text-success">
                <Check className="size-4" />
                Saved
              </span>
            ) : null}
            <Button variant="outline" onClick={handleExportPdf} disabled={rows.length === 0}>
              <Download className="size-4" />
              Export PDF
            </Button>
            <Button
              onClick={handleSaveAllScores}
              disabled={dirtyIds.length === 0 || isSaving || hasErrors}
            >
              {isSaving
                ? 'Saving...'
                : dirtyIds.length > 0
                  ? `Save All Scores (${dirtyIds.length})`
                  : 'Save All Scores'}
            </Button>
          </div>
        }
      />

      {submitError ? (
        <p className="mb-4 text-sm text-destructive">{submitError}</p>
      ) : null}

      <TableToolbar
        search={
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search students..."
          />
        }
        filters={
          <FilterSelect
            value={classId}
            onChange={setClassId}
            placeholder="Select class"
            options={[
              { value: 'all', label: 'All Classes' },
              ...classes.map((cls) => ({ value: cls.id, label: cls.name })),
            ]}
          />
        }
      />

      <div className="overflow-hidden rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead className="text-center">Pre Test</TableHead>
              <TableHead className="text-center">Post Test</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <LoadingState rows={5} columns={3} />
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3}>
                  <EmptyState
                    title="No students found"
                    description={
                      search
                        ? 'Try a different search term.'
                        : 'No students match the selected filters.'
                    }
                  />
                </TableCell>
              </TableRow>
            ) : (
              rows.map((student) => {
                const draft = drafts[student.id]
                const isDirty = draft !== undefined
                const preTestValue = draft ? draft.preTest : (student.preTest?.toString() ?? '')
                const postTestValue = draft ? draft.postTest : (student.postTest?.toString() ?? '')
                const fieldErrors = errors[student.id]

                return (
                  <TableRow
                    key={student.id}
                    className={cn(isDirty && 'bg-warning/10 hover:bg-warning/15')}
                  >
                    <TableCell className="font-medium text-foreground">
                      {student.name}
                    </TableCell>
                    <TableCell className="text-center">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        placeholder="—"
                        value={preTestValue}
                        onChange={(event) =>
                          updateDraftField(student, 'preTest', event.target.value)
                        }
                        aria-invalid={Boolean(fieldErrors?.preTest)}
                        aria-label={`${student.name} pre test score`}
                        className="mx-auto w-20 text-center"
                      />
                      {fieldErrors?.preTest ? (
                        <p className="mt-1 text-xs text-destructive">{fieldErrors.preTest}</p>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-center">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        placeholder="—"
                        value={postTestValue}
                        onChange={(event) =>
                          updateDraftField(student, 'postTest', event.target.value)
                        }
                        aria-invalid={Boolean(fieldErrors?.postTest)}
                        aria-label={`${student.name} post test score`}
                        className="mx-auto w-20 text-center"
                      />
                      {fieldErrors?.postTest ? (
                        <p className="mt-1 text-xs text-destructive">{fieldErrors.postTest}</p>
                      ) : null}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
