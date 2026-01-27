/**
 * API Route: GET /api/users/search
 *
 * Searches users by email or name for autocomplete functionality
 */

import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    const workspaceId = searchParams.get('workspace_id')
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50)

    // Build base query for user profiles
    let usersQuery = supabase
      .from('user_profiles')
      .select('id, full_name, email, avatar_url')

    // If query is provided and at least 2 characters, filter by email or name
    if (query.length >= 2) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      usersQuery = (usersQuery as any).or(`email.ilike.%${query}%,full_name.ilike.%${query}%`)
    }

    // If workspace_id is provided, filter to only workspace members
    if (workspaceId) {
      const { data: memberIds } = await supabase
        .from('flowfox_workspace_members')
        .select('user_id')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .eq('workspace_id', workspaceId) as any

      if (memberIds && memberIds.length > 0) {
        const userIds = memberIds.map((m: { user_id: string }) => m.user_id)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        usersQuery = (usersQuery as any).in('id', userIds)
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: users, error } = await (usersQuery as any)
      .order('full_name', { ascending: true })
      .limit(limit)

    if (error) {
      console.error('Error searching users:', error)
      throw error
    }

    return NextResponse.json({ users: users || [] })
  } catch (error) {
    console.error('Failed to search users:', error)
    return NextResponse.json(
      {
        error: 'Failed to search users',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
