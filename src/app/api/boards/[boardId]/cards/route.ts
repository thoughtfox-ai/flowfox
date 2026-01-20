import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

// Dev user ID - must match the one in /api/boards/route.ts
const DEV_USER_ID = 'db297104-c70f-4e4c-80ae-343849c9c02f'

// POST /api/boards/[boardId]/cards - Create a new card
export async function POST(
  request: Request,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const { boardId } = await params
    const supabase = createAdminClient()
    const body = await request.json()

    const { column_id, title, position } = body

    const { data: card, error } = await (supabase as any)
      .from('cards')
      .insert({
        board_id: boardId,
        column_id,
        title,
        position,
        created_by: DEV_USER_ID,
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
      .from('cards')
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
