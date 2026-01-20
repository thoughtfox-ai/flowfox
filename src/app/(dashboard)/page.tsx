'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { NumberTicker } from '@/components/ui/number-ticker'
import { BlurFade } from '@/components/ui/blur-fade'
import Link from 'next/link'
import {
  Calendar,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
  AlertTriangle,
  Flag,
  LayoutGrid,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format, isToday, isPast, parseISO } from 'date-fns'
import type { MyDayCard, CardPriority } from '@/types/board'

interface MyDayData {
  cards: MyDayCard[]
  grouped: {
    overdue: MyDayCard[]
    dueToday: MyDayCard[]
    upcoming: MyDayCard[]
    completed: MyDayCard[]
  }
  stats: {
    total: number
    overdue: number
    dueToday: number
    completed: number
  }
}

const PRIORITY_COLORS: Record<CardPriority, string> = {
  low: 'bg-slate-500',
  medium: 'bg-blue-500',
  high: 'bg-orange-500',
  critical: 'bg-red-500',
}

function TaskCard({
  card,
  onComplete,
}: {
  card: MyDayCard
  onComplete: (cardId: string) => void
}) {
  const isOverdue = card.due_date && isPast(parseISO(card.due_date)) && !isToday(parseISO(card.due_date))
  const isDueToday = card.due_date && isToday(parseISO(card.due_date))

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors group">
      <Checkbox
        checked={!!card.completed_at}
        onCheckedChange={() => onComplete(card.id)}
        className="mt-0.5"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span
            className={cn(
              'font-medium truncate',
              card.completed_at && 'line-through text-muted-foreground'
            )}
          >
            {card.title}
          </span>
          {card.priority && (
            <div
              className={cn(
                'w-2 h-2 rounded-full flex-shrink-0',
                PRIORITY_COLORS[card.priority]
              )}
              title={card.priority}
            />
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link
            href={`/boards/${card.board_id}`}
            className="hover:text-[#FF6B35] transition-colors flex items-center gap-1"
          >
            <LayoutGrid className="h-3 w-3" />
            {card.board_name}
          </Link>
          <span className="text-muted-foreground/50">•</span>
          <span>{card.column_name}</span>
          {card.due_date && (
            <>
              <span className="text-muted-foreground/50">•</span>
              <span
                className={cn(
                  'flex items-center gap-1',
                  isOverdue && 'text-red-500 font-medium',
                  isDueToday && 'text-orange-500 font-medium'
                )}
              >
                <Calendar className="h-3 w-3" />
                {format(parseISO(card.due_date), 'MMM d')}
              </span>
            </>
          )}
        </div>
        {(card.subtask_count ?? 0) > 0 && (
          <div className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
            <CheckCircle2 className="h-3 w-3" />
            {card.subtask_completed_count ?? 0}/{card.subtask_count} subtasks
          </div>
        )}
      </div>
    </div>
  )
}

function TaskSection({
  title,
  icon,
  cards,
  variant,
  onComplete,
  defaultExpanded = true,
}: {
  title: string
  icon: React.ReactNode
  cards: MyDayCard[]
  variant: 'overdue' | 'today' | 'upcoming' | 'completed'
  onComplete: (cardId: string) => void
  defaultExpanded?: boolean
}) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  if (cards.length === 0) return null

  const variantStyles = {
    overdue: 'border-red-500/50 bg-red-500/5',
    today: 'border-[#FF6B35]/50 bg-[#FF6B35]/5',
    upcoming: 'border-blue-500/50 bg-blue-500/5',
    completed: 'border-green-500/50 bg-green-500/5',
  }

  return (
    <Card className={cn('border-l-4', variantStyles[variant])}>
      <CardHeader
        className="cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            {icon}
            {title}
            <Badge variant="secondary" className="ml-1">
              {cards.length}
            </Badge>
          </CardTitle>
          <Button variant="ghost" size="sm">
            {expanded ? 'Collapse' : 'Expand'}
          </Button>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="space-y-2 pt-0">
          {cards.map((card) => (
            <TaskCard key={card.id} card={card} onComplete={onComplete} />
          ))}
        </CardContent>
      )}
    </Card>
  )
}

export default function MyDayPage() {
  const [data, setData] = useState<MyDayData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    try {
      const res = await fetch('/api/my-day')
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } catch (error) {
      console.error('Failed to fetch My Day data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleComplete = async (cardId: string) => {
    if (!data) return

    const card = data.cards.find((c) => c.id === cardId)
    if (!card) return

    // Find the board ID for this card
    const isCompleting = !card.completed_at

    // Optimistic update
    setData((prev) => {
      if (!prev) return prev
      const updated = prev.cards.map((c) =>
        c.id === cardId
          ? { ...c, completed_at: isCompleting ? new Date().toISOString() : null }
          : c
      )
      return {
        ...prev,
        cards: updated,
        grouped: {
          ...prev.grouped,
          // Recalculate groups
        },
        stats: {
          ...prev.stats,
          completed: isCompleting
            ? prev.stats.completed + 1
            : prev.stats.completed - 1,
        },
      }
    })

    try {
      await fetch(`/api/boards/${card.board_id}/cards/${cardId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_archived: isCompleting,
        }),
      })
      // Refetch to get accurate data
      fetchData()
    } catch (error) {
      console.error('Failed to update card:', error)
      // Revert on error
      fetchData()
    }
  }

  const hasNoTasks =
    data &&
    data.grouped.overdue.length === 0 &&
    data.grouped.dueToday.length === 0 &&
    data.grouped.upcoming.length === 0 &&
    data.grouped.completed.length === 0

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      <BlurFade delay={0.1}>
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-[#FF6B35] to-[#FF8F5E] bg-clip-text text-transparent">
            My Day
          </h1>
          <p className="text-muted-foreground">
            Your tasks and priorities across all boards
          </p>
        </div>
      </BlurFade>

      <div className="grid gap-4 md:grid-cols-3">
        <BlurFade delay={0.2}>
          <Card className="border-l-4 border-l-red-500 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? (
                  <Skeleton className="h-8 w-8" />
                ) : (
                  <NumberTicker value={data?.stats.overdue || 0} className="text-red-500" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">tasks past due</p>
            </CardContent>
          </Card>
        </BlurFade>
        <BlurFade delay={0.3}>
          <Card className="border-l-4 border-l-[#FF6B35] hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Due Today</CardTitle>
              <Calendar className="h-4 w-4 text-[#FF6B35]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? (
                  <Skeleton className="h-8 w-8" />
                ) : (
                  <NumberTicker value={data?.stats.dueToday || 0} className="text-[#FF6B35]" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">tasks due today</p>
            </CardContent>
          </Card>
        </BlurFade>
        <BlurFade delay={0.4}>
          <Card className="border-l-4 border-l-[#48BB78] hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-[#48BB78]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? (
                  <Skeleton className="h-8 w-8" />
                ) : (
                  <NumberTicker value={data?.stats.completed || 0} className="text-[#48BB78]" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">tasks completed</p>
            </CardContent>
          </Card>
        </BlurFade>
      </div>

      {loading ? (
        <BlurFade delay={0.5}>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
                  <Skeleton className="h-4 w-4 rounded" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </BlurFade>
      ) : hasNoTasks ? (
        <BlurFade delay={0.5}>
          <Card>
            <CardHeader>
              <CardTitle>Today&apos;s Tasks</CardTitle>
              <CardDescription>
                Tasks due today and flagged priorities from all boards
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-[#FF6B35]/10 p-4 mb-4">
                  <Sparkles className="h-8 w-8 text-[#FF6B35]" />
                </div>
                <h3 className="font-semibold mb-1">All caught up!</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  You don&apos;t have any tasks. Create a board to get started.
                </p>
                <Button asChild className="bg-[#FF6B35] hover:bg-[#E85D04]">
                  <Link href="/boards">
                    Go to Boards
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </BlurFade>
      ) : (
        <div className="space-y-4">
          <BlurFade delay={0.5}>
            <TaskSection
              title="Overdue"
              icon={<AlertTriangle className="h-4 w-4 text-red-500" />}
              cards={data?.grouped.overdue || []}
              variant="overdue"
              onComplete={handleComplete}
            />
          </BlurFade>
          <BlurFade delay={0.6}>
            <TaskSection
              title="Due Today"
              icon={<Calendar className="h-4 w-4 text-[#FF6B35]" />}
              cards={data?.grouped.dueToday || []}
              variant="today"
              onComplete={handleComplete}
            />
          </BlurFade>
          <BlurFade delay={0.7}>
            <TaskSection
              title="Upcoming"
              icon={<Clock className="h-4 w-4 text-blue-500" />}
              cards={data?.grouped.upcoming || []}
              variant="upcoming"
              onComplete={handleComplete}
            />
          </BlurFade>
          <BlurFade delay={0.8}>
            <TaskSection
              title="Completed"
              icon={<CheckCircle2 className="h-4 w-4 text-green-500" />}
              cards={data?.grouped.completed || []}
              variant="completed"
              onComplete={handleComplete}
              defaultExpanded={false}
            />
          </BlurFade>
        </div>
      )}
    </div>
  )
}
