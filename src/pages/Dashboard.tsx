import { Users, LayoutGrid, CalendarDays, CheckCircle2 } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { DashboardCard } from '@/components/shared/DashboardCard'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useStudents } from '@/hooks/useStudents'
import { useClasses } from '@/hooks/useClasses'
import { useMeetings } from '@/hooks/useMeetings'
import { useAttendance } from '@/hooks/useAttendance'

export function Dashboard() {
  const { students, isLoading: isStudentsLoading } = useStudents()
  const { classes, isLoading: isClassesLoading } = useClasses()
  const { meetings, isLoading: isMeetingsLoading } = useMeetings()
  const { records, isLoading: isAttendanceLoading } = useAttendance()

  const loading =
    isStudentsLoading || isClassesLoading || isMeetingsLoading || isAttendanceLoading

  const latestMeeting = meetings[meetings.length - 1]
  const latestAttendance = latestMeeting
    ? records.filter((record) => record.meetingId === latestMeeting.id)
    : []
  const presentToday = latestAttendance.filter(
    (record) => record.status === 'Present',
  ).length

  const recentRecords = latestAttendance.slice(0, 6)

  function studentName(studentId: string) {
    return students.find((student) => student.id === studentId)?.name ?? '—'
  }

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overview of Taweed Lughoh program activity"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="gap-0 py-0">
              <CardContent className="space-y-3 p-5">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-7 w-16" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <DashboardCard
              label="Total Students"
              value={students.length}
              icon={Users}
            />
            <DashboardCard
              label="Total Classes"
              value={classes.length}
              icon={LayoutGrid}
            />
            <DashboardCard
              label="Total Meetings"
              value={meetings.length}
              icon={CalendarDays}
            />
            <DashboardCard
              label="Today's Attendance"
              value={`${presentToday}/${students.length}`}
              hint={latestMeeting?.label}
              icon={CheckCircle2}
            />
          </>
        )}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <h3 className="text-sm font-semibold text-foreground">
            Latest Attendance{latestMeeting ? ` — ${latestMeeting.label}` : ''}
          </h3>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex items-center justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            ))
          ) : recentRecords.length === 0 ? (
            <EmptyState
              title="No attendance recorded yet"
              description="Attendance will appear here once a meeting is marked."
            />
          ) : (
            recentRecords.map((record) => (
              <div
                key={record.id}
                className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0"
              >
                <span className="text-sm text-foreground">
                  {studentName(record.studentId)}
                </span>
                <StatusBadge status={record.status} />
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
