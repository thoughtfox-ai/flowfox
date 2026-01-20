/**
 * API Routes: /api/google/mappings
 *
 * GET - Fetch all task list mappings for the current user
 * POST - Create a new board-to-tasklist mapping
 * DELETE - Remove a mapping
 */

import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'

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

    // Get user ID from email
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single()

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const { data: mappings, error } = await supabase
      .from('google_task_list_mappings')
      .select(`
        *,
        boards (
          id,
          name,
          description
        )
      `)
      .eq('user_id', userData.id)

    if (error) throw error

    return NextResponse.json({ mappings })
  } catch (error) {
    console.error('Failed to fetch mappings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch mappings' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const { boardId, googleTaskListId, googleTaskListTitle } = await request.json()

    if (!boardId || !googleTaskListId || !googleTaskListTitle) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Get user ID
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single()

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Create mapping
    const { data: mapping, error } = await supabase
      .from('google_task_list_mappings')
      .insert({
        user_id: userData.id,
        board_id: boardId,
        google_task_list_id: googleTaskListId,
        google_task_list_title: googleTaskListTitle,
        sync_enabled: true,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ mapping }, { status: 201 })
  } catch (error) {
    console.error('Failed to create mapping:', error)
    return NextResponse.json(
      { error: 'Failed to create mapping' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const { mappingId } = await request.json()

    if (!mappingId) {
      return NextResponse.json(
        { error: 'Missing mapping ID' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Get user ID
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single()

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Delete mapping
    const { error } = await supabase
      .from('google_task_list_mappings')
      .delete()
      .eq('id', mappingId)
      .eq('user_id', userData.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete mapping:', error)
    return NextResponse.json(
      { error: 'Failed to delete mapping' },
      { status: 500 }
    )
  }
}
