import { useMemo } from 'react'
import {
  Users,
  LayoutGrid,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  ClipboardCheck,
  TrendingUp,
  TrendingDown,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { DashboardCard } from '@/components/shared/DashboardCard'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { AverageScoreBarChart } from '@/components/charts/AverageScoreBarChart'
import { AttendanceDistributionPieChart } from '@/components/charts/AttendanceDistributionPieChart'
import { useStudents } from '@/hooks/useStudents'
import { useClasses } from '@/hooks/useClasses'
import { useMeetings } from '@/hooks/useMeetings'
import { useAttendance } from '@/hooks/useAttendance'
import {
  ATTENDANCE_STATUS_OPTIONS,
  ATTENDANCE_STATUS_CHART_COLORS,
} from '@/constants/attendance-status'

function average(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

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

  const scoreStats = useMemo(() => {
    const avgPreTest = average(
      students.flatMap((student) => (student.preTest !== null ? [student.preTest] : [])),
    )
    const avgPostTest = average(
      students.flatMap((student) => (student.postTest !== null ? [student.postTest] : [])),
    )
    return { avgPreTest, avgPostTest, improvement: avgPostTest - avgPreTest }
  }, [students])

  const scoreByClass = useMemo(() => {
    return classes.map((cls) => {
      const classStudents = students.filter((student) => student.classId === cls.id)
      const preTestValues = classStudents.flatMap((student) =>
        student.preTest !== null ? [student.preTest] : [],
      )
      const postTestValues = classStudents.flatMap((student) =>
        student.postTest !== null ? [student.postTest] : [],
      )
      return {
        class: cls.name,
        preTest: Math.round(average(preTestValues) * 10) / 10,
        postTest: Math.round(average(postTestValues) * 10) / 10,
      }
    })
  }, [students, classes])

  const attendanceDistribution = useMemo(() => {
    return ATTENDANCE_STATUS_OPTIONS.map((status) => ({
      name: status,
      value: records.filter((record) => record.status === status).length,
      color: ATTENDANCE_STATUS_CHART_COLORS[status],
    }))
  }, [records])

  const hasAttendanceData = attendanceDistribution.some((slice) => slice.value > 0)

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

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, index) => (
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
              label="Average Pre Test"
              value={scoreStats.avgPreTest.toFixed(1)}
              icon={ClipboardList}
            />
            <DashboardCard
              label="Average Post Test"
              value={scoreStats.avgPostTest.toFixed(1)}
              icon={ClipboardCheck}
            />
            <DashboardCard
              label="Improvement"
              value={`${scoreStats.improvement >= 0 ? '+' : ''}${scoreStats.improvement.toFixed(1)}`}
              hint="Post Test vs Pre Test"
              icon={scoreStats.improvement >= 0 ? TrendingUp : TrendingDown}
            />
          </>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-foreground">
              Average Score by Class
            </h3>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-70 w-full" />
            ) : (
              <AverageScoreBarChart data={scoreByClass} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-foreground">
              Attendance Distribution
            </h3>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-70 w-full" />
            ) : hasAttendanceData ? (
              <AttendanceDistributionPieChart data={attendanceDistribution} />
            ) : (
              <EmptyState
                title="No attendance recorded yet"
                description="The chart will populate once attendance is marked."
              />
            )}
          </CardContent>
        </Card>
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
