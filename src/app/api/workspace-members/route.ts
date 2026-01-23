/**
 * API Route: GET /api/workspace-members
 *
 * Fetches workspace members for user assignment purposes
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
    const workspaceId = searchParams.get('workspace_id')
    const boardId = searchParams.get('board_id')

    let query = supabase
      .from('flowfox_workspace_members')
      .select(`
        user_id,
        role,
        user_profiles:user_id (
          id,
          full_name,
          email,
          avatar_url
        )
      `)

    if (workspaceId) {
      // Get members of specific workspace
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      query = (query as any).eq('workspace_id', workspaceId)
    } else if (boardId) {
      // Get members via board's workspace
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      query = (query as any).eq('workspace_id', supabase
        .from('flowfox_boards')
        .select('workspace_id')
        .eq('id', boardId)
        .single()
      )
    } else {
      // Get members of all workspaces user belongs to
      const { data: userWorkspaces } = await supabase
        .from('flowfox_workspace_members')
        .select('workspace_id')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .eq('user_id', session.user.email) as any

      if (userWorkspaces && userWorkspaces.length > 0) {
        const workspaceIds = userWorkspaces.map((w: { workspace_id: string }) => w.workspace_id)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        query = (query as any).in('workspace_id', workspaceIds)
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: members, error } = await (query as any)

    if (error) {
      console.error('Error fetching workspace members:', error)
      throw error
    }

    // Transform data to simpler format
    const formattedMembers = members?.map((m: { user_profiles: { id: string; full_name: string; email: string; avatar_url: string | null }; role: string }) => ({
      id: m.user_profiles.id,
      full_name: m.user_profiles.full_name,
      email: m.user_profiles.email,
      avatar_url: m.user_profiles.avatar_url,
      role: m.role,
    })) || []

    return NextResponse.json({ members: formattedMembers })
  } catch (error) {
    console.error('Failed to fetch workspace members:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch workspace members',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
