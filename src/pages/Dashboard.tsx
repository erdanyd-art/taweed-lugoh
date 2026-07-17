import { Users, LayoutGrid, CalendarDays, CheckCircle2 } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatCard } from '@/components/shared/StatCard'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { students, classes, meetings, attendanceRecords } from '@/mock'

export function Dashboard() {
  const latestMeeting = meetings[meetings.length - 1]
  const latestAttendance = attendanceRecords.filter(
    (record) => record.meetingId === latestMeeting.id,
  )
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
        <StatCard label="Total Students" value={students.length} icon={Users} />
        <StatCard label="Total Classes" value={classes.length} icon={LayoutGrid} />
        <StatCard
          label="Total Meetings"
          value={meetings.length}
          icon={CalendarDays}
        />
        <StatCard
          label="Today's Attendance"
          value={`${presentToday}/${students.length}`}
          hint={latestMeeting.label}
          icon={CheckCircle2}
        />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <h3 className="text-sm font-semibold text-foreground">
            Latest Attendance — {latestMeeting.label}
          </h3>
        </CardHeader>
        <CardContent className="space-y-3">
          {recentRecords.map((record) => (
            <div
              key={record.id}
              className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0"
            >
              <span className="text-sm text-foreground">
                {studentName(record.studentId)}
              </span>
              <StatusBadge status={record.status} />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
