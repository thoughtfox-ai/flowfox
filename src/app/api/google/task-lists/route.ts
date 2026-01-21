/**
 * API Route: GET /api/google/task-lists
 *
 * Fetches all Google Task Lists for the authenticated user
 */

import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { createGoogleTasksClient } from '@/lib/google/tasks-client'

export async function GET() {
  try {
    const session = await auth()

    console.log('Session data:', {
      hasSession: !!session,
      hasAccessToken: !!session?.accessToken,
      userId: session?.user?.id,
      expiresAt: session?.expiresAt,
      tokenExpired: session?.expiresAt ? Date.now() / 1000 > session.expiresAt : null,
    })

    if (!session?.accessToken) {
      console.error('No access token in session - user needs to re-authenticate')
      return NextResponse.json(
        { error: 'Not authenticated', details: 'No access token in session' },
        { status: 401 }
      )
    }

    console.log('Creating Google Tasks client...')
    const tasksClient = createGoogleTasksClient(session.accessToken)

    console.log('Fetching task lists from Google API...')
    const taskLists = await tasksClient.getTaskLists()

    console.log(`Successfully fetched ${taskLists.length} task lists`)
    return NextResponse.json({ taskLists })
  } catch (error) {
    console.error('Failed to fetch task lists:', error)

    // Log more details about the error
    if (error instanceof Error) {
      console.error('Error name:', error.name)
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }

    return NextResponse.json(
      {
        error: 'Failed to fetch Google Task Lists',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
