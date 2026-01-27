import { createAdminClient } from '@/lib/supabase/admin'
import { auth } from '@/auth'
import { NextResponse } from 'next/server'

// GET /api/boards/[boardId] - Get board with columns and cards
export async function GET(
  request: Request,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const { boardId } = await params
    const supabase = createAdminClient()

    // Fetch board
    const { data: board, error: boardError } = await (supabase as any)
      .from('flowfox_boards')
      .select('*')
      .eq('id', boardId)
      .single()

    if (boardError) throw boardError

    // Fetch columns
    const { data: columns, error: columnsError } = await (supabase as any)
      .from('flowfox_columns')
      .select('*')
      .eq('board_id', boardId)
      .order('position', { ascending: true })

    if (columnsError) throw columnsError

    // Fetch cards
    const { data: cards, error: cardsError } = await (supabase as any)
      .from('flowfox_cards')
      .select('*')
      .eq('board_id', boardId)
      .eq('is_archived', false)
      .order('position', { ascending: true })

    if (cardsError) throw cardsError

    // Fetch related data for cards
    const cardIds = (cards as any[])?.map((c: any) => c.id) || []

    let cardLabelsMap: Record<string, { id: string; name: string; color: string }[]> = {}
    let cardAssigneesMap: Record<string, { id: string; email: string; full_name: string; avatar_url: string | null }[]> = {}
    let subtasksMap: Record<string, { total: number; completed: number }> = {}

    if (cardIds.length > 0) {
      // Fetch card labels
      const { data: cardLabels } = await (supabase as any)
        .from('flowfox_card_labels')
        .select('card_id, labels(id, name, color)')
        .in('card_id', cardIds)

      if (cardLabels) {
        for (const cl of cardLabels as any[]) {
          if (!cardLabelsMap[cl.card_id]) cardLabelsMap[cl.card_id] = []
          if (cl.labels) {
            cardLabelsMap[cl.card_id].push(cl.labels)
          }
        }
      }

      // Fetch card assignees
      const { data: cardAssignees } = await (supabase as any)
        .from('flowfox_card_assignments')
        .select('card_id, users(id, email, full_name, avatar_url)')
        .in('card_id', cardIds)

      if (cardAssignees) {
        for (const ca of cardAssignees as any[]) {
          if (!cardAssigneesMap[ca.card_id]) cardAssigneesMap[ca.card_id] = []
          if (ca.users) {
            cardAssigneesMap[ca.card_id].push(ca.users)
          }
        }
      }

      // Fetch subtasks
      const { data: subtasks } = await (supabase as any)
        .from('flowfox_subtasks')
        .select('card_id, is_completed')
        .in('card_id', cardIds)

      if (subtasks) {
        for (const st of subtasks as any[]) {
          if (!subtasksMap[st.card_id]) subtasksMap[st.card_id] = { total: 0, completed: 0 }
          subtasksMap[st.card_id].total++
          if (st.is_completed) subtasksMap[st.card_id].completed++
        }
      }
    }

    // Transform cards with related data
    const transformedCards = (cards as any[])?.map((card: any) => ({
      ...card,
      labels: cardLabelsMap[card.id] || [],
      assignees: cardAssigneesMap[card.id] || [],
      subtask_count: subtasksMap[card.id]?.total || 0,
      subtask_completed_count: subtasksMap[card.id]?.completed || 0,
    }))

    return NextResponse.json({
      board,
      columns,
      cards: transformedCards,
    })
  } catch (error) {
    console.error('Failed to fetch board:', error)
    return NextResponse.json(
      { error: 'Failed to fetch board' },
      { status: 500 }
    )
  }
}

// PATCH /api/boards/[boardId] - Update board (name, description, archive status)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const { boardId } = await params
    const supabase = createAdminClient()
    const body = await request.json()
    const { name, description, is_archived } = body

    // Build update object with only provided fields
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }
    if (name !== undefined) updates.name = name
    if (description !== undefined) updates.description = description
    if (is_archived !== undefined) updates.is_archived = is_archived

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: board, error } = await (supabase as any)
      .from('flowfox_boards')
      .update(updates)
      .eq('id', boardId)
      .select()
      .single()

    if (error) {
      console.error('Error updating board:', error)
      throw error
    }

    return NextResponse.json({ board })
  } catch (error) {
    console.error('Failed to update board:', error)
    return NextResponse.json(
      { error: 'Failed to update board' },
      { status: 500 }
    )
  }
}

// DELETE /api/boards/[boardId] - Permanently delete board
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const { boardId } = await params
    const supabase = createAdminClient()

    // Delete the board (cascades to cards, columns, etc.)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('flowfox_boards')
      .delete()
      .eq('id', boardId)

    if (error) {
      console.error('Error deleting board:', error)
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete board:', error)
    return NextResponse.json(
      { error: 'Failed to delete board' },
      { status: 500 }
    )
  }
}
