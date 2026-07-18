import { useEffect, useMemo, useState } from 'react'
import { MoreHorizontal, Plus } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { TableToolbar } from '@/components/shared/TableToolbar'
import { SearchBar } from '@/components/shared/SearchBar'
import { FilterSelect } from '@/components/shared/FilterSelect'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingState } from '@/components/shared/LoadingState'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useStudents } from '@/hooks/useStudents'
import { useClasses } from '@/hooks/useClasses'
import { useAuth } from '@/context/AuthContext'
import { parseOptionalScore, validateScore } from '@/utils/validation'
import type { ClassItem, Student } from '@/types'
import { cn } from '@/lib/utils'

interface StudentFormValues {
  name: string
  classId: string
  preTest: number | null
  postTest: number | null
}

type FormState = { mode: 'add' } | { mode: 'edit'; student: Student }

interface StudentFormDialogProps {
  formState: FormState | null
  classes: ClassItem[]
  isSaving: boolean
  error: string | null
  onOpenChange: (open: boolean) => void
  onSubmit: (values: StudentFormValues) => void
}

function StudentFormDialog({
  formState,
  classes,
  isSaving,
  error,
  onOpenChange,
  onSubmit,
}: StudentFormDialogProps) {
  const [name, setName] = useState('')
  const [classId, setClassId] = useState('')
  const [preTest, setPreTest] = useState('')
  const [postTest, setPostTest] = useState('')
  const [errors, setErrors] = useState<{
    name?: string
    classId?: string
    preTest?: string
    postTest?: string
  }>({})

  useEffect(() => {
    if (!formState) return
    if (formState.mode === 'edit') {
      setName(formState.student.name)
      setClassId(formState.student.classId)
      setPreTest(formState.student.preTest?.toString() ?? '')
      setPostTest(formState.student.postTest?.toString() ?? '')
    } else {
      setName('')
      setClassId('')
      setPreTest('')
      setPostTest('')
    }
    setErrors({})
  }, [formState])

  function handleSubmit() {
    const nextErrors: typeof errors = {}
    if (!name.trim()) nextErrors.name = 'Name is required'
    if (!classId) nextErrors.classId = 'Class is required'
    const preTestError = validateScore(preTest)
    if (preTestError) nextErrors.preTest = preTestError
    const postTestError = validateScore(postTest)
    if (postTestError) nextErrors.postTest = postTestError

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    onSubmit({
      name: name.trim(),
      classId,
      preTest: parseOptionalScore(preTest),
      postTest: parseOptionalScore(postTest),
    })
  }

  const isEdit = formState?.mode === 'edit'

  return (
    <Dialog open={formState !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Student' : 'Add Student'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="student-name">Name</Label>
            <Input
              id="student-name"
              placeholder="Full name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              aria-invalid={Boolean(errors.name)}
            />
            {errors.name ? (
              <p className="text-xs text-destructive">{errors.name}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="student-class">Class</Label>
            <FilterSelect
              value={classId}
              onChange={setClassId}
              options={classes.map((cls) => ({ value: cls.id, label: cls.name }))}
              placeholder="Select class"
              className={cn('w-full', errors.classId && 'border-destructive')}
            />
            {errors.classId ? (
              <p className="text-xs text-destructive">{errors.classId}</p>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="student-pre-test">Pre Test Score</Label>
              <Input
                id="student-pre-test"
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
              <Label htmlFor="student-post-test">Post Test Score</Label>
              <Input
                id="student-post-test"
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
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? 'Saving...' : isEdit ? 'Save Changes' : 'Save Student'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function Students() {
  const { students, isLoading, addStudent, updateStudent, deleteStudent } =
    useStudents()
  const { classes, isLoading: isClassesLoading } = useClasses()
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  const [search, setSearch] = useState('')
  const [formState, setFormState] = useState<FormState | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const loading = isLoading || isClassesLoading

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return students
    return students.filter((student) =>
      student.name.toLowerCase().includes(query),
    )
  }, [students, search])

  function className(id: string) {
    return classes.find((cls) => cls.id === id)?.name ?? '—'
  }

  function openForm(state: FormState) {
    setFormError(null)
    setFormState(state)
  }

  async function handleSubmitForm(values: StudentFormValues) {
    setFormError(null)
    setIsSaving(true)
    try {
      if (formState?.mode === 'edit') {
        await updateStudent(formState.student.id, values)
      } else {
        await addStudent(values)
      }
      setFormState(null)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save student.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleConfirmDelete() {
    if (!deleteId) return
    setIsDeleting(true)
    try {
      await deleteStudent(deleteId)
      setDeleteId(null)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to delete student.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Students"
        description="Manage registered students for Taweed Lughoh"
        action={
          isAdmin ? (
            <Button onClick={() => openForm({ mode: 'add' })}>
              <Plus className="size-4" />
              Add Student
            </Button>
          ) : undefined
        }
      />

      <TableToolbar
        search={
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search students..."
          />
        }
      />

      <div className="overflow-hidden rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Class</TableHead>
              <TableHead className="w-20 text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <LoadingState rows={5} columns={3} />
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3}>
                  <EmptyState
                    title="No students found"
                    description={
                      search
                        ? 'Try a different search term.'
                        : 'Add your first student to get started.'
                    }
                  />
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((student) => (
                <TableRow key={student.id}>
                  <TableCell className="font-medium text-foreground">
                    {student.name}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{className(student.classId)}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {isAdmin ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => openForm({ mode: 'edit', student })}
                          >
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setDeleteId(student.id)}
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <StudentFormDialog
        formState={formState}
        classes={classes}
        isSaving={isSaving}
        error={formError}
        onOpenChange={(next) => !next && setFormState(null)}
        onSubmit={handleSubmitForm}
      />

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(next) => !next && setDeleteId(null)}
        title="Delete student"
        description="This will remove the student from the roster. This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}
