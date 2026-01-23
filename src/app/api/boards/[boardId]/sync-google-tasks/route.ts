import { createAdminClient } from '@/lib/supabase/admin'
import { auth } from '@/auth'
import { NextResponse } from 'next/server'
import { syncBoardWithGoogleTasks } from '@/lib/google/sync'

type RouteParams = { params: Promise<{ boardId: string }> }

/**
 * POST /api/boards/[boardId]/sync-google-tasks
 *
 * Manually trigger a sync between the board and its mapped Google Task List
 */
export async function POST(
  request: Request,
  { params }: RouteParams
) {
  try {
    const session = await auth()

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    if (!session.accessToken) {
      return NextResponse.json(
        { error: 'Google OAuth token not found. Please reconnect your Google account.' },
        { status: 401 }
      )
    }

    const { boardId } = await params
    const supabase = createAdminClient()

    // Verify user has access to this board
    const { data: boardMember } = await supabase
      .from('flowfox_board_members')
      .select('role')
      .eq('board_id', boardId)
      .eq('user_id', session.user.email)
      .single()

    if (!boardMember) {
      return NextResponse.json(
        { error: 'Board not found or access denied' },
        { status: 404 }
      )
    }

    // Find the Google Task List mapping for this board
    const { data: mappingData, error: mappingError } = await supabase
      .from('google_task_list_mappings')
      .select('google_task_list_id, board_id, user_id, sync_enabled')
      .eq('board_id', boardId)
      .eq('user_id', session.user.email)
      .eq('sync_enabled', true)
      .single()

    if (mappingError || !mappingData) {
      return NextResponse.json(
        {
          error: 'No Google Tasks integration found for this board',
          hint: 'Please set up Google Tasks integration in board settings first'
        },
        { status: 404 }
      )
    }

    const mapping = mappingData as { google_task_list_id: string }

    // Perform the sync
    const result = await syncBoardWithGoogleTasks(
      boardId,
      mapping.google_task_list_id,
      session.accessToken
    )

    if (!result.success) {
      return NextResponse.json(
        {
          error: 'Sync failed',
          details: result.errors,
          result
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Sync completed successfully',
      result: {
        cardsCreated: result.cardsCreated,
        cardsUpdated: result.cardsUpdated,
        tasksCreated: result.tasksCreated,
        tasksUpdated: result.tasksUpdated,
        conflicts: result.conflicts,
      }
    })

  } catch (error) {
    console.error('Google Tasks sync error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
