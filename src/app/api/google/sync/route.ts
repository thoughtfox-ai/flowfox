/**
 * API Route: POST /api/google/sync
 *
 * Triggers manual sync for all mapped boards
 */

import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { syncAllMappedBoards } from '@/lib/google/sync'

export async function POST() {
  try {
    const session = await auth()

    if (!session?.accessToken || !session?.user?.email) {
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

    // Trigger sync for all mapped boards
    const results = await syncAllMappedBoards(userData.id, session.accessToken)

    // Convert Map to object for JSON serialization
    const resultsObj: Record<string, any> = {}
    results.forEach((result, boardId) => {
      resultsObj[boardId] = result
    })

    return NextResponse.json({
      success: true,
      results: resultsObj,
    })
  } catch (error) {
    console.error('Sync failed:', error)
    return NextResponse.json(
      { error: 'Sync failed', details: String(error) },
      { status: 500 }
    )
  }
}
