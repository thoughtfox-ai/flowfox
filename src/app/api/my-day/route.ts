import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

// Dev user ID - must match the one in /api/boards/route.ts
const DEV_USER_ID = 'db297104-c70f-4e4c-80ae-343849c9c02f'

// GET /api/my-day - Get all cards for the current user (dev mode: all accessible cards)
export async function GET() {
  try {
    const supabase = createAdminClient()

    // Get all non-archived cards with board and column info
    // In production, this would filter by user assignments
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: cards, error } = await (supabase as any)
      .from('cards')
      .select(`
        *,
        board:boards(id, name),
        column:columns(id, name, is_done_column),
        labels:card_labels(
          label:labels(id, name, color)
        ),
        assignees:card_assignments(
          user:users(id, email, full_name, avatar_url)
        ),
        subtasks(id, is_completed)
      `)
      .eq('is_archived', false)
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('priority', { ascending: false })
      .order('updated_at', { ascending: false })

    if (error) throw error

    // Transform and enrich the data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const enrichedCards = cards.map((card: any) => ({
      ...card,
      board_name: card.board?.name || 'Unknown Board',
      column_name: card.column?.name || 'Unknown Column',
      is_done_column: card.column?.is_done_column || false,
      labels: card.labels?.map((l: { label: unknown }) => l.label) || [],
      assignees: card.assignees?.map((a: { user: unknown }) => a.user) || [],
      subtask_count: card.subtasks?.length || 0,
      subtask_completed_count: card.subtasks?.filter((s: { is_completed: boolean }) => s.is_completed).length || 0,
      // Clean up nested data
      board: undefined,
      column: undefined,
      subtasks: undefined,
    }))

    // Sort: overdue first, then today, then by due date, then by priority
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const sortedCards = enrichedCards.sort((a: { due_date: string | null; priority: string | null; is_done_column: boolean }, b: { due_date: string | null; priority: string | null; is_done_column: boolean }) => {
      // Completed cards at the bottom
      if (a.is_done_column !== b.is_done_column) {
        return a.is_done_column ? 1 : -1
      }

      const aDate = a.due_date ? new Date(a.due_date) : null
      const bDate = b.due_date ? new Date(b.due_date) : null

      const aOverdue = aDate && aDate < today
      const bOverdue = bDate && bDate < today

      // Overdue first
      if (aOverdue !== bOverdue) return aOverdue ? -1 : 1

      // Then by due date (null dates last)
      if (aDate && bDate) {
        const dateCompare = aDate.getTime() - bDate.getTime()
        if (dateCompare !== 0) return dateCompare
      } else if (aDate) {
        return -1
      } else if (bDate) {
        return 1
      }

      // Then by priority
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
      const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 4
      const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 4
      return aPriority - bPriority
    })

    // Group cards for the response
    const overdue = sortedCards.filter((c: { due_date: string | null; is_done_column: boolean }) => {
      if (c.is_done_column) return false
      if (!c.due_date) return false
      return new Date(c.due_date) < today
    })

    const dueToday = sortedCards.filter((c: { due_date: string | null; is_done_column: boolean }) => {
      if (c.is_done_column) return false
      if (!c.due_date) return false
      const dueDate = new Date(c.due_date)
      return dueDate >= today && dueDate < tomorrow
    })

    const upcoming = sortedCards.filter((c: { due_date: string | null; is_done_column: boolean }) => {
      if (c.is_done_column) return false
      if (!c.due_date) return true // No due date = upcoming
      return new Date(c.due_date) >= tomorrow
    })

    const completed = sortedCards.filter((c: { is_done_column: boolean }) => c.is_done_column)

    return NextResponse.json({
      cards: sortedCards,
      grouped: {
        overdue,
        dueToday,
        upcoming,
        completed,
      },
      stats: {
        total: sortedCards.length,
        overdue: overdue.length,
        dueToday: dueToday.length,
        upcoming: upcoming.length,
        completed: completed.length,
      },
    })
  } catch (error) {
    console.error('Failed to fetch My Day cards:', error)
    return NextResponse.json(
      { error: 'Failed to fetch cards' },
      { status: 500 }
    )
  }
}
