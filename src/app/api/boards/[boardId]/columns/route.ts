import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

// POST /api/boards/[boardId]/columns - Create a new column
export async function POST(
  request: Request,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const { boardId } = await params
    const supabase = createAdminClient()
    const body = await request.json()

    const { name, position } = body

    const { data: column, error } = await (supabase as any)
      .from('columns')
      .insert({
        board_id: boardId,
        name,
        position,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(column)
  } catch (error) {
    console.error('Failed to create column:', error)
    return NextResponse.json(
      { error: 'Failed to create column' },
      { status: 500 }
    )
  }
}
