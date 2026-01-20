import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

// Dev user ID - must match the one in /api/boards/route.ts
const DEV_USER_ID = 'db297104-c70f-4e4c-80ae-343849c9c02f'

type RouteParams = { params: Promise<{ boardId: string; cardId: string }> }

// GET /api/boards/[boardId]/cards/[cardId]/subtasks - Get all subtasks for a card
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { cardId } = await params
    const supabase = createAdminClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: subtasks, error } = await (supabase as any)
      .from('subtasks')
      .select(`
        *,
        assignee:users(id, email, full_name, avatar_url)
      `)
      .eq('card_id', cardId)
      .order('position', { ascending: true })

    if (error) throw error

    // Build nested structure (2 levels max)
    const topLevel = subtasks.filter((s: { parent_subtask_id: string | null }) => !s.parent_subtask_id)
    const nested = topLevel.map((parent: { id: string }) => ({
      ...parent,
      children: subtasks.filter((s: { parent_subtask_id: string | null }) => s.parent_subtask_id === parent.id),
    }))

    return NextResponse.json(nested)
  } catch (error) {
    console.error('Failed to fetch subtasks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch subtasks' },
      { status: 500 }
    )
  }
}

// POST /api/boards/[boardId]/cards/[cardId]/subtasks - Create a subtask
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { cardId } = await params
    const supabase = createAdminClient()
    const body = await request.json()

    const { title, parent_subtask_id, position } = body

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: subtask, error } = await (supabase as any)
      .from('subtasks')
      .insert({
        card_id: cardId,
        parent_subtask_id: parent_subtask_id || null,
        title,
        position: position ?? 0,
        is_completed: false,
      })
      .select(`
        *,
        assignee:users(id, email, full_name, avatar_url)
      `)
      .single()

    if (error) throw error

    return NextResponse.json(subtask)
  } catch (error) {
    console.error('Failed to create subtask:', error)
    return NextResponse.json(
      { error: 'Failed to create subtask' },
      { status: 500 }
    )
  }
}

// PATCH /api/boards/[boardId]/cards/[cardId]/subtasks - Update a subtask
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { cardId } = await params
    const supabase = createAdminClient()
    const body = await request.json()

    const { id, ...updates } = body

    // If completing, add completed_at timestamp
    if (updates.is_completed === true) {
      updates.completed_at = new Date().toISOString()
    } else if (updates.is_completed === false) {
      updates.completed_at = null
    }

    updates.updated_at = new Date().toISOString()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: subtask, error } = await (supabase as any)
      .from('subtasks')
      .update(updates)
      .eq('id', id)
      .eq('card_id', cardId)
      .select(`
        *,
        assignee:users(id, email, full_name, avatar_url)
      `)
      .single()

    if (error) throw error

    return NextResponse.json(subtask)
  } catch (error) {
    console.error('Failed to update subtask:', error)
    return NextResponse.json(
      { error: 'Failed to update subtask' },
      { status: 500 }
    )
  }
}

// DELETE /api/boards/[boardId]/cards/[cardId]/subtasks - Delete a subtask
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { cardId } = await params
    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    const subtaskId = searchParams.get('id')

    if (!subtaskId) {
      return NextResponse.json(
        { error: 'Subtask ID required' },
        { status: 400 }
      )
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('subtasks')
      .delete()
      .eq('id', subtaskId)
      .eq('card_id', cardId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete subtask:', error)
    return NextResponse.json(
      { error: 'Failed to delete subtask' },
      { status: 500 }
    )
  }
}
