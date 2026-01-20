import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

type RouteParams = { params: Promise<{ boardId: string; cardId: string }> }

// GET /api/boards/[boardId]/cards/[cardId] - Get a single card
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { boardId, cardId } = await params
    const supabase = createAdminClient()

    const { data: card, error } = await (supabase as any)
      .from('cards')
      .select(`
        *,
        labels:card_labels(
          label:labels(id, name, color)
        ),
        assignees:card_assignments(
          user:users(id, email, full_name, avatar_url)
        )
      `)
      .eq('id', cardId)
      .eq('board_id', boardId)
      .single()

    if (error) throw error

    // Transform nested data
    const transformedCard = {
      ...(card as any),
      labels: (card as any).labels?.map((l: { label: unknown }) => l.label) || [],
      assignees: (card as any).assignees?.map((a: { user: unknown }) => a.user) || [],
    }

    return NextResponse.json(transformedCard)
  } catch (error) {
    console.error('Failed to fetch card:', error)
    return NextResponse.json(
      { error: 'Failed to fetch card' },
      { status: 500 }
    )
  }
}

// PATCH /api/boards/[boardId]/cards/[cardId] - Update a card
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { boardId, cardId } = await params
    const supabase = createAdminClient()
    const body = await request.json()

    // Only allow specific fields to be updated
    const allowedFields = [
      'title',
      'description',
      'priority',
      'due_date',
      'time_estimate_minutes',
      'is_archived',
      'column_id',
      'position',
    ]

    const updates: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field]
      }
    }

    // Add updated_at timestamp
    updates.updated_at = new Date().toISOString()

    // If archiving, set completed_at
    if (updates.is_archived === true) {
      updates.completed_at = new Date().toISOString()
    }

    const { data: card, error } = await (supabase as any)
      .from('cards')
      .update(updates)
      .eq('id', cardId)
      .eq('board_id', boardId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(card)
  } catch (error) {
    console.error('Failed to update card:', error)
    return NextResponse.json(
      { error: 'Failed to update card' },
      { status: 500 }
    )
  }
}

// DELETE /api/boards/[boardId]/cards/[cardId] - Delete a card
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { boardId, cardId } = await params
    const supabase = createAdminClient()

    const { error } = await (supabase as any)
      .from('cards')
      .delete()
      .eq('id', cardId)
      .eq('board_id', boardId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete card:', error)
    return NextResponse.json(
      { error: 'Failed to delete card' },
      { status: 500 }
    )
  }
}
