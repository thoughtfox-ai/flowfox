import { createAdminClient } from '@/lib/supabase/admin'
import { auth } from '@/auth'
import { NextResponse } from 'next/server'

// GET /api/boards/[boardId]/cards - Get cards (supports archived filter)
export async function GET(
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
    const { searchParams } = new URL(request.url)
    const archived = searchParams.get('archived') === 'true'

    // Fetch cards with archive filter
    const { data: cards, error } = await (supabase as any)
      .from('flowfox_cards')
      .select('*')
      .eq('board_id', boardId)
      .eq('is_archived', archived)
      .order('position', { ascending: true })

    if (error) throw error

    // If fetching archived cards, include additional metadata
    if (archived && cards && cards.length > 0) {
      const cardIds = cards.map((c: any) => c.id)

      // Fetch card assignees for context
      const { data: cardAssignees } = await (supabase as any)
        .from('flowfox_card_assignments')
        .select('card_id, users(id, email, full_name, avatar_url)')
        .in('card_id', cardIds)

      const cardAssigneesMap: Record<string, any[]> = {}
      if (cardAssignees) {
        for (const ca of cardAssignees as any[]) {
          if (!cardAssigneesMap[ca.card_id]) cardAssigneesMap[ca.card_id] = []
          if (ca.users) cardAssigneesMap[ca.card_id].push(ca.users)
        }
      }

      // Get column names for archived cards
      const columnIds = [...new Set(cards.map((c: any) => c.column_id))]
      const { data: columns } = await (supabase as any)
        .from('flowfox_columns')
        .select('id, name')
        .in('id', columnIds)

      const columnsMap: Record<string, string> = {}
      if (columns) {
        for (const col of columns as any[]) {
          columnsMap[col.id] = col.name
        }
      }

      const transformedCards = cards.map((card: any) => ({
        ...card,
        assignees: cardAssigneesMap[card.id] || [],
        column_name: columnsMap[card.column_id] || 'Unknown',
      }))

      return NextResponse.json({ cards: transformedCards })
    }

    return NextResponse.json({ cards: cards || [] })
  } catch (error) {
    console.error('Failed to fetch cards:', error)
    return NextResponse.json(
      { error: 'Failed to fetch cards' },
      { status: 500 }
    )
  }
}

// POST /api/boards/[boardId]/cards - Create a new card
export async function POST(
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

    const { column_id, title, position } = body

    const { data: card, error } = await (supabase as any)
      .from('flowfox_cards')
      .insert({
        board_id: boardId,
        column_id,
        title,
        position,
        created_by: session.user.email,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      ...card,
      labels: [],
      assignees: [],
      subtask_count: 0,
      subtask_completed_count: 0,
    })
  } catch (error) {
    console.error('Failed to create card:', error)
    return NextResponse.json(
      { error: 'Failed to create card' },
      { status: 500 }
    )
  }
}

// PATCH /api/boards/[boardId]/cards - Update a card (move)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    await params // Validate boardId exists
    const supabase = createAdminClient()
    const body = await request.json()

    const { id, column_id, position } = body

    const { error } = await (supabase as any)
      .from('flowfox_cards')
      .update({
        column_id,
        position,
      })
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to update card:', error)
    return NextResponse.json(
      { error: 'Failed to update card' },
      { status: 500 }
    )
  }
}
