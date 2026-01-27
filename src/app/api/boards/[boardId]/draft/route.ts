/**
 * API Routes: Board Draft Management
 *
 * GET /api/boards/[boardId]/draft - Get current user's draft
 * PUT /api/boards/[boardId]/draft - Save/update draft
 * DELETE /api/boards/[boardId]/draft - Clear draft
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { auth } from '@/auth'
import { NextResponse } from 'next/server'

type RouteParams = { params: Promise<{ boardId: string }> }

// GET /api/boards/[boardId]/draft - Get current user's draft
export async function GET(request: Request, { params }: RouteParams) {
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: draft, error } = await (supabase as any)
      .from('flowfox_board_drafts')
      .select('draft_data, updated_at')
      .eq('board_id', boardId)
      .eq('user_id', session.user.email)
      .maybeSingle()

    if (error) {
      console.error('Error fetching draft:', error)
      throw error
    }

    return NextResponse.json({
      draft: draft?.draft_data || null,
      updated_at: draft?.updated_at || null,
    })
  } catch (error) {
    console.error('Failed to fetch draft:', error)
    return NextResponse.json(
      { error: 'Failed to fetch draft' },
      { status: 500 }
    )
  }
}

// PUT /api/boards/[boardId]/draft - Save/update draft
export async function PUT(request: Request, { params }: RouteParams) {
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
    const draftData = await request.json()

    // Upsert the draft
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('flowfox_board_drafts')
      .upsert(
        {
          board_id: boardId,
          user_id: session.user.email,
          draft_data: draftData,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'board_id,user_id',
        }
      )

    if (error) {
      console.error('Error saving draft:', error)
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to save draft:', error)
    return NextResponse.json(
      { error: 'Failed to save draft' },
      { status: 500 }
    )
  }
}

// DELETE /api/boards/[boardId]/draft - Clear draft
export async function DELETE(request: Request, { params }: RouteParams) {
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('flowfox_board_drafts')
      .delete()
      .eq('board_id', boardId)
      .eq('user_id', session.user.email)

    if (error) {
      console.error('Error deleting draft:', error)
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete draft:', error)
    return NextResponse.json(
      { error: 'Failed to delete draft' },
      { status: 500 }
    )
  }
}
