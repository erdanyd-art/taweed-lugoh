import { useMemo, useState } from 'react'
import { Pencil } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { classes, students, scoreRecords } from '@/mock'

export function Scores() {
  const [classId, setClassId] = useState<string>('all')

  const rows = useMemo(() => {
    return students
      .filter((student) => classId === 'all' || student.classId === classId)
      .map((student) => {
        const score = scoreRecords.find(
          (record) => record.studentId === student.id,
        )
        return { student, score }
      })
  }, [classId])

  return (
    <div>
      <PageHeader
        title="Scores"
        description="Pre-test and post-test results per student"
      />

      <div className="mb-4">
        <Select value={classId} onValueChange={setClassId}>
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue placeholder="Select class" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
            {classes.map((cls) => (
              <SelectItem key={cls.id} value={cls.id}>
                {cls.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="h-24 text-center text-muted-foreground"
                >
                  No students found.
                </TableCell>
              </TableRow>
            ) : (
              rows.map(({ student, score }) => (
                <TableRow key={student.id}>
                  <TableCell className="font-medium text-foreground">
                    {student.name}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{score?.preTest ?? '—'}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className="bg-primary/10 text-primary">
                      {score?.postTest ?? '—'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon">
                      <Pencil className="size-4" />
                    </Button>
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
