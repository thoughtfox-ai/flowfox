import { createAdminClient } from '@/lib/supabase/admin'
import { auth } from '@/auth'
import { NextResponse } from 'next/server'

// GET /api/boards - List all boards accessible to the user
export async function GET(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'personal', 'organization', or null for all
    const archived = searchParams.get('archived') === 'true' // Filter for archived boards

    console.log('Fetching boards for user:', session.user.email)

    // Query boards where user is a member (using admin client, can't use RLS-based views)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
      .from('flowfox_boards')
      .select(`
        id,
        workspace_id,
        name,
        description,
        slug,
        is_archived,
        is_personal,
        created_by,
        created_at,
        updated_at,
        flowfox_board_members!inner(user_id)
      `)
      .eq('flowfox_board_members.user_id', session.user.email)
      .eq('is_archived', archived)
      .order('created_at', { ascending: false })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let { data: boards, error } = await query

    console.log('Boards via membership join:', { count: boards?.length || 0, error: error?.message })

    // Fallback: if join doesn't work, query by created_by
    if (error || !boards || boards.length === 0) {
      console.log('Falling back to created_by query')

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (supabase as any)
        .from('flowfox_boards')
        .select(`
          id,
          workspace_id,
          name,
          description,
          slug,
          is_archived,
          is_personal,
          created_by,
          created_at,
          updated_at
        `)
        .eq('created_by', session.user.email)
        .eq('is_archived', archived)
        .order('created_at', { ascending: false })

      boards = result.data
      error = result.error
      console.log('Boards via created_by:', { count: boards?.length || 0 })
    }

    // Clean up and add metadata
    if (boards) {
      // Remove the nested board_members object from join if it exists
      boards = boards.map((board: { id: string; name: string; description: string | null; slug: string; is_personal?: boolean; board_members?: unknown }) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { board_members, ...boardData } = board
        return {
          ...boardData,
          // Use actual is_personal value from DB, default to false if column doesn't exist yet
          is_personal: boardData.is_personal ?? false,
          card_count: 0,
          my_assigned_count: 0,
        }
      })
    }

    if (error) {
      console.error('Error fetching boards:', error)
      throw error
    }

    return NextResponse.json({ boards: boards || [] })
  } catch (error) {
    console.error('Failed to fetch boards:', error)
    return NextResponse.json(
      { error: 'Failed to fetch boards' },
      { status: 500 }
    )
  }
}

// Dev user ID - must be a valid UUID
const DEV_USER_ID = 'db297104-c70f-4e4c-80ae-343849c9c02f'

// Ensure dev user exists in auth.users and public.users tables
async function ensureDevUser(supabase: ReturnType<typeof createAdminClient>) {
  // Check if user exists in public.users
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existingUser } = await (supabase as any)
    .from('user_profiles')
    .select('id')
    .eq('id', DEV_USER_ID)
    .single()

  if (!existingUser) {
    // First, create user in auth.users using admin API
    const { error: authError } = await supabase.auth.admin.createUser({
      email: 'dev@thoughtfox.io',
      email_confirm: true,
      user_metadata: { full_name: 'Dev User' },
      id: DEV_USER_ID,
    })

    // Ignore "user already exists" error
    if (authError && !authError.message.includes('already')) {
      console.error('Failed to create auth user:', authError)
    }

    // Then create in public.users table
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: userError } = await (supabase as any).from('user_profiles').insert({
      id: DEV_USER_ID,
      email: 'dev@thoughtfox.io',
      full_name: 'Dev User',
    })

    // Ignore duplicate key error
    if (userError && !userError.message.includes('duplicate')) {
      console.error('Failed to create public user:', userError)
    }
  }
}

// POST /api/boards - Create a new board
export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const supabase = createAdminClient()
    const body = await request.json()
    const { name, description, is_personal = false } = body

    const userId = session.user.email

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')

    let workspaceId: string

    if (is_personal) {
      // Get or create personal workspace using helper function
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: personalWorkspaceId, error: pwError } = await (supabase as any)
        .rpc('get_or_create_personal_workspace', { p_user_id: userId })

      if (pwError) {
        console.error('Error getting personal workspace:', pwError)
        throw pwError
      }

      workspaceId = personalWorkspaceId
    } else {
      // Get ThoughtFox organizational workspace
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: workspaces, error: wsError } = await (supabase as any)
        .from('flowfox_workspaces')
        .select('id')
        .eq('type', 'organization')
        .eq('slug', 'thoughtfox')
        .single()

      if (wsError) {
        // Create ThoughtFox workspace if it doesn't exist
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: newWorkspace, error: createWsError } = await (supabase as any)
          .from('flowfox_workspaces')
          .insert({
            name: 'ThoughtFox',
            slug: 'thoughtfox',
            type: 'organization',
            google_domain: 'thoughtfox.io',
            created_by: userId,
          })
          .select('id')
          .single()

        if (createWsError) throw createWsError
        workspaceId = newWorkspace.id

        // Add user as workspace owner
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).from('flowfox_workspace_members').insert({
          workspace_id: workspaceId,
          user_id: userId,
          role: 'owner',
        })
      } else {
        workspaceId = workspaces.id
      }
    }

    // Create the board
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: board, error: boardError } = await (supabase as any)
      .from('flowfox_boards')
      .insert({
        workspace_id: workspaceId,
        name,
        description: description || null,
        slug,
        is_personal,
        created_by: userId,
      })
      .select('id')
      .single()

    if (boardError) {
      console.error('Error creating board:', boardError)
      throw boardError
    }

    // Add user as board admin
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('flowfox_board_members').insert({
      board_id: board.id,
      user_id: userId,
      role: 'admin',
    })

    // For team boards, automatically add all workspace members with appropriate roles
    if (!is_personal) {
      // Fetch all workspace members (excluding the creator who was already added)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: workspaceMembers } = await (supabase as any)
        .from('flowfox_workspace_members')
        .select('user_id, role')
        .eq('workspace_id', workspaceId)
        .neq('user_id', userId)

      if (workspaceMembers && workspaceMembers.length > 0) {
        // Map workspace roles to board roles:
        // - owner/admin -> admin rights
        // - member -> contributor rights (can be overwritten to viewer)
        const boardMembers = workspaceMembers.map((wm: { user_id: string; role: string }) => ({
          board_id: board.id,
          user_id: wm.user_id,
          role: wm.role === 'owner' || wm.role === 'admin' ? 'admin' : 'contributor',
        }))

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).from('flowfox_board_members').insert(boardMembers)
      }
    }

    // Create default columns
    const defaultColumns = [
      { name: 'Backlog', position: 0 },
      { name: 'To Do', position: 1 },
      { name: 'In Progress', position: 2, wip_limit: 5 },
      { name: 'Review', position: 3, wip_limit: 3 },
      { name: 'Done', position: 4, is_done_column: true },
    ]

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('flowfox_columns').insert(
      defaultColumns.map((col) => ({
        board_id: board.id,
        ...col,
      }))
    )

    return NextResponse.json({ id: board.id })
  } catch (error) {
    console.error('Failed to create board:', error)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const errorDetails = error instanceof Error ? error.message : JSON.stringify(error)
    return NextResponse.json(
      { error: 'Failed to create board', details: errorDetails },
      { status: 500 }
    )
  }
}
