import { createAdminClient } from '@/lib/supabase/admin'
import { auth } from '@/auth'
import { NextResponse } from 'next/server'

// GET /api/my-day - Get all cards for the current user
export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const supabase = createAdminClient()

    // Get all non-archived cards with board and column info
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: cards, error } = await (supabase as any)
      .from('flowfox_cards')
      .select(`
        *,
        board:flowfox_boards(id, name),
        column:flowfox_columns(id, name, is_done_column),
        labels:flowfox_card_labels(
          label:flowfox_labels(id, name, color)
        ),
        assignees:flowfox_card_assignments(
          user:user_profiles(id, email, full_name, avatar_url)
        ),
        flowfox_subtasks(id, is_completed)
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
      subtask_count: card.flowfox_subtasks?.length || 0,
      subtask_completed_count: card.flowfox_subtasks?.filter((s: { is_completed: boolean }) => s.is_completed).length || 0,
      // Clean up nested data
      board: undefined,
      column: undefined,
      flowfox_subtasks: undefined,
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
