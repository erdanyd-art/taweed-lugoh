import { useMemo, useState } from 'react'
import { MoreHorizontal, Plus, Search } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { classes, students as initialStudents } from '@/mock'
import type { Student } from '@/types'

export function Students() {
  const [students, setStudents] = useState<Student[]>(initialStudents)
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [classId, setClassId] = useState(classes[0]?.id ?? '')

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

  function handleAddStudent() {
    if (!name.trim() || !classId) return
    const newStudent: Student = {
      id: `std-${Date.now()}`,
      name: name.trim(),
      classId,
    }
    setStudents((prev) => [newStudent, ...prev])
    setName('')
    setClassId(classes[0]?.id ?? '')
    setOpen(false)
  }

  function handleDelete(id: string) {
    setStudents((prev) => prev.filter((student) => student.id !== id))
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
                  <Select value={classId} onValueChange={setClassId}>
                    <SelectTrigger id="student-class" className="w-full">
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((cls) => (
                        <SelectItem key={cls.id} value={cls.id}>
                          {cls.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddStudent}>Save Student</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="mb-4 max-w-sm">
        <div className="relative">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search students..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-9"
          />
        </div>
      </div>

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
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="h-24 text-center text-muted-foreground"
                >
                  No students found.
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
                          onClick={() => handleDelete(student.id)}
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
    </div>
  )
}
