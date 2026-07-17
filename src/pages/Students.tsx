import { useMemo, useState } from 'react'
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
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useStudents } from '@/hooks/useStudents'
import { useClasses } from '@/hooks/useClasses'

export function Students() {
  const { students, isLoading, addStudent, deleteStudent } = useStudents()
  const { classes, isLoading: isClassesLoading } = useClasses()

  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [classId, setClassId] = useState('')
  const [isSaving, setIsSaving] = useState(false)

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

  async function handleAddStudent() {
    const selectedClassId = classId || classes[0]?.id
    if (!name.trim() || !selectedClassId) return
    setIsSaving(true)
    await addStudent({ name: name.trim(), classId: selectedClassId })
    setIsSaving(false)
    setName('')
    setClassId('')
    setOpen(false)
  }

  async function handleConfirmDelete() {
    if (!deleteId) return
    setIsDeleting(true)
    await deleteStudent(deleteId)
    setIsDeleting(false)
    setDeleteId(null)
  }

  return (
    <div>
      <PageHeader
        title="Students"
        description="Manage registered students for Taweed Lughoh"
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="size-4" />
                Add Student
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Student</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="student-name">Name</Label>
                  <Input
                    id="student-name"
                    placeholder="Full name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="student-class">Class</Label>
                  <FilterSelect
                    value={classId || classes[0]?.id || ''}
                    onChange={setClassId}
                    options={classes.map((cls) => ({
                      value: cls.id,
                      label: cls.name,
                    }))}
                    placeholder="Select class"
                    className="w-full"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddStudent} disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Student'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Edit</DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => setDeleteId(student.id)}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

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
