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

    if (!session?.accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const tasksClient = createGoogleTasksClient(session.accessToken)
    const taskLists = await tasksClient.getTaskLists()

    return NextResponse.json({ taskLists })
  } catch (error) {
    console.error('Failed to fetch task lists:', error)
    return NextResponse.json(
      { error: 'Failed to fetch Google Task Lists' },
      { status: 500 }
    )
  }
}
