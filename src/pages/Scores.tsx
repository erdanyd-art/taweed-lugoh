import { useEffect, useMemo, useState } from 'react'
import { Pencil } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { TableToolbar } from '@/components/shared/TableToolbar'
import { SearchBar } from '@/components/shared/SearchBar'
import { FilterSelect } from '@/components/shared/FilterSelect'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingState } from '@/components/shared/LoadingState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useStudents } from '@/hooks/useStudents'
import { useClasses } from '@/hooks/useClasses'
import { parseOptionalScore, validateScore } from '@/utils/validation'

export function Scores() {
  const { students, isLoading: isStudentsLoading, saveScore } = useStudents()
  const { classes, isLoading: isClassesLoading } = useClasses()

  const [classId, setClassId] = useState('all')
  const [search, setSearch] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const [editingStudentId, setEditingStudentId] = useState<string | null>(null)
  const [preTest, setPreTest] = useState('')
  const [postTest, setPostTest] = useState('')
  const [errors, setErrors] = useState<{ preTest?: string; postTest?: string }>({})
  const [submitError, setSubmitError] = useState<string | null>(null)

  const loading = isStudentsLoading || isClassesLoading

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase()
    return students
      .filter((student) => classId === 'all' || student.classId === classId)
      .filter((student) => !query || student.name.toLowerCase().includes(query))
  }, [students, classId, search])

  const editingStudent = students.find(
    (student) => student.id === editingStudentId,
  )

  useEffect(() => {
    if (!editingStudent) return
    setPreTest(editingStudent.preTest?.toString() ?? '')
    setPostTest(editingStudent.postTest?.toString() ?? '')
    setErrors({})
  }, [editingStudent])

  function openEdit(studentId: string) {
    setSubmitError(null)
    setEditingStudentId(studentId)
  }

  async function handleSaveScore() {
    if (!editingStudent) return

    const nextErrors: typeof errors = {}
    const preTestError = validateScore(preTest)
    if (preTestError) nextErrors.preTest = preTestError
    const postTestError = validateScore(postTest)
    if (postTestError) nextErrors.postTest = postTestError

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSubmitError(null)
    setIsSaving(true)
    try {
      await saveScore(editingStudent.id, {
        preTest: parseOptionalScore(preTest),
        postTest: parseOptionalScore(postTest),
      })
      setEditingStudentId(null)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to save score.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Scores"
        description="Pre-test and post-test results per student"
      />

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
              <TableHead className="w-20 text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <LoadingState rows={5} columns={4} />
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4}>
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
              rows.map((student) => (
                <TableRow key={student.id}>
                  <TableCell className="font-medium text-foreground">
                    {student.name}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{student.preTest ?? '—'}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className="bg-primary/10 text-primary">
                      {student.postTest ?? '—'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(student.id)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={editingStudentId !== null}
        onOpenChange={(next) => !next && setEditingStudentId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Score</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              {editingStudent?.name}
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="score-pre-test">Pre Test</Label>
                <Input
                  id="score-pre-test"
                  type="number"
                  min={0}
                  max={100}
                  placeholder="Optional"
                  value={preTest}
                  onChange={(event) => setPreTest(event.target.value)}
                  aria-invalid={Boolean(errors.preTest)}
                />
                {errors.preTest ? (
                  <p className="text-xs text-destructive">{errors.preTest}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="score-post-test">Post Test</Label>
                <Input
                  id="score-post-test"
                  type="number"
                  min={0}
                  max={100}
                  placeholder="Optional"
                  value={postTest}
                  onChange={(event) => setPostTest(event.target.value)}
                  aria-invalid={Boolean(errors.postTest)}
                />
                {errors.postTest ? (
                  <p className="text-xs text-destructive">{errors.postTest}</p>
                ) : null}
              </div>
            </div>
            {submitError ? (
              <p className="text-sm text-destructive">{submitError}</p>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingStudentId(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveScore} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Score'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
