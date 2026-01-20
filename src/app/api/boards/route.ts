import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

// DEV MODE: Using admin client to bypass RLS
// TODO: Re-enable proper auth when Google OAuth is configured

// GET /api/boards - List all boards
export async function GET() {
  try {
    const supabase = createAdminClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: boards, error } = await (supabase as any)
      .from('boards')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(boards)
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
    .from('users')
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
    const { error: userError } = await (supabase as any).from('users').insert({
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
    const supabase = createAdminClient()
    const body = await request.json()

    // Ensure dev user exists for foreign key constraints
    await ensureDevUser(supabase)

    const { name, description } = body

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')

    // Get or create default workspace
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: workspaces, error: wsError } = await (supabase as any)
      .from('workspaces')
      .select('id')
      .limit(1)

    if (wsError) throw wsError

    let workspaceId: string

    if (workspaces && workspaces.length > 0) {
      workspaceId = workspaces[0].id
    } else {
      // Create default workspace
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: newWorkspace, error: createWsError } = await (supabase as any)
        .from('workspaces')
        .insert({
          name: 'ThoughtFox',
          slug: 'thoughtfox',
          google_domain: 'thoughtfox.io',
          created_by: DEV_USER_ID,
        })
        .select('id')
        .single()

      if (createWsError) throw createWsError
      workspaceId = newWorkspace.id

      // Add dev user as workspace owner
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('workspace_members').insert({
        workspace_id: workspaceId,
        user_id: DEV_USER_ID,
        role: 'owner',
      })
    }

    // Create the board
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: board, error: boardError } = await (supabase as any)
      .from('boards')
      .insert({
        workspace_id: workspaceId,
        name,
        description: description || null,
        slug,
        created_by: DEV_USER_ID,
      })
      .select('id')
      .single()

    if (boardError) throw boardError

    // Add dev user as board admin
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('board_members').insert({
      board_id: board.id,
      user_id: DEV_USER_ID,
      role: 'admin',
    })

    // Create default columns
    const defaultColumns = [
      { name: 'Backlog', position: 0 },
      { name: 'To Do', position: 1 },
      { name: 'In Progress', position: 2, wip_limit: 5 },
      { name: 'Review', position: 3, wip_limit: 3 },
      { name: 'Done', position: 4, is_done_column: true },
    ]

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('columns').insert(
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
