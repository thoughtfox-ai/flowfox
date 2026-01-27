/**
 * API Routes: Board Member Management
 *
 * GET /api/boards/[boardId]/members - Get board members
 * POST /api/boards/[boardId]/members - Add a member
 * DELETE /api/boards/[boardId]/members - Remove a member
 * PATCH /api/boards/[boardId]/members - Update member role
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { auth } from '@/auth'
import { NextResponse } from 'next/server'

type RouteParams = { params: Promise<{ boardId: string }> }

// GET /api/boards/[boardId]/members - Get board members
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
    const { data: members, error } = await (supabase as any)
      .from('flowfox_board_members')
      .select(`
        user_id,
        role,
        created_at,
        user_profiles:user_id (
          id,
          email,
          full_name,
          avatar_url
        )
      `)
      .eq('board_id', boardId)

    if (error) {
      console.error('Error fetching board members:', error)
      throw error
    }

    // Transform to simpler format
    const formattedMembers = members?.map((m: {
      user_profiles: { id: string; email: string; full_name: string; avatar_url: string | null };
      role: string;
      created_at: string;
    }) => ({
      id: m.user_profiles.id,
      email: m.user_profiles.email,
      full_name: m.user_profiles.full_name,
      avatar_url: m.user_profiles.avatar_url,
      role: m.role,
      joined_at: m.created_at,
    })) || []

    return NextResponse.json({ members: formattedMembers })
  } catch (error) {
    console.error('Failed to fetch board members:', error)
    return NextResponse.json(
      { error: 'Failed to fetch board members' },
      { status: 500 }
    )
  }
}

// POST /api/boards/[boardId]/members - Add a member
export async function POST(request: Request, { params }: RouteParams) {
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
    const { user_id, role = 'contributor' } = body

    if (!user_id) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      )
    }

    // Validate role
    if (!['admin', 'contributor', 'viewer'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be admin, contributor, or viewer' },
        { status: 400 }
      )
    }

    // Add member to board
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('flowfox_board_members')
      .insert({
        board_id: boardId,
        user_id,
        role,
      })

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'User is already a member of this board' },
          { status: 409 }
        )
      }
      console.error('Error adding board member:', error)
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to add board member:', error)
    return NextResponse.json(
      { error: 'Failed to add board member' },
      { status: 500 }
    )
  }
}

// PATCH /api/boards/[boardId]/members - Update member role
export async function PATCH(request: Request, { params }: RouteParams) {
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
    const { user_id, role } = body

    if (!user_id || !role) {
      return NextResponse.json(
        { error: 'user_id and role are required' },
        { status: 400 }
      )
    }

    // Validate role
    if (!['admin', 'contributor', 'viewer'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be admin, contributor, or viewer' },
        { status: 400 }
      )
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('flowfox_board_members')
      .update({ role })
      .eq('board_id', boardId)
      .eq('user_id', user_id)

    if (error) {
      console.error('Error updating board member:', error)
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to update board member:', error)
    return NextResponse.json(
      { error: 'Failed to update board member' },
      { status: 500 }
    )
  }
}

// DELETE /api/boards/[boardId]/members - Remove a member
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
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')

    if (!userId) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      )
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('flowfox_board_members')
      .delete()
      .eq('board_id', boardId)
      .eq('user_id', userId)

    if (error) {
      console.error('Error removing board member:', error)
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to remove board member:', error)
    return NextResponse.json(
      { error: 'Failed to remove board member' },
      { status: 500 }
    )
  }
}
