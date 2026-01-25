/**
 * API Route: Card Assignments
 *
 * POST /api/boards/[boardId]/cards/[cardId]/assignments - Add assignee
 * DELETE /api/boards/[boardId]/cards/[cardId]/assignments - Remove assignee
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

type RouteParams = { params: Promise<{ boardId: string; cardId: string }> }

// POST - Add an assignee to a card
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { boardId, cardId } = await params
    const supabase = createAdminClient()
    const body = await request.json()
    const { user_id } = body

    if (!user_id) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      )
    }

    // Verify card belongs to board
    const { data: card, error: cardError } = await (supabase as any)
      .from('flowfox_cards')
      .select('id')
      .eq('id', cardId)
      .eq('board_id', boardId)
      .single()

    if (cardError || !card) {
      return NextResponse.json(
        { error: 'Card not found' },
        { status: 404 }
      )
    }

    // Add assignment (upsert to handle duplicates gracefully)
    const { data: assignment, error } = await (supabase as any)
      .from('flowfox_card_assignments')
      .upsert(
        { card_id: cardId, user_id },
        { onConflict: 'card_id,user_id' }
      )
      .select(`
        user:user_profiles(id, email, full_name, avatar_url)
      `)
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      assignee: assignment.user,
    })
  } catch (error) {
    console.error('Failed to add assignee:', error)
    return NextResponse.json(
      { error: 'Failed to add assignee' },
      { status: 500 }
    )
  }
}

// DELETE - Remove an assignee from a card
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { boardId, cardId } = await params
    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')

    if (!userId) {
      return NextResponse.json(
        { error: 'user_id query parameter is required' },
        { status: 400 }
      )
    }

    // Verify card belongs to board
    const { data: card, error: cardError } = await (supabase as any)
      .from('flowfox_cards')
      .select('id')
      .eq('id', cardId)
      .eq('board_id', boardId)
      .single()

    if (cardError || !card) {
      return NextResponse.json(
        { error: 'Card not found' },
        { status: 404 }
      )
    }

    // Remove assignment
    const { error } = await (supabase as any)
      .from('flowfox_card_assignments')
      .delete()
      .eq('card_id', cardId)
      .eq('user_id', userId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to remove assignee:', error)
    return NextResponse.json(
      { error: 'Failed to remove assignee' },
      { status: 500 }
    )
  }
}
