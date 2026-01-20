import { NextRequest, NextResponse } from 'next/server'
import { getGeminiClient } from '@/lib/gemini/client'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description } = body

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Board name is required' },
        { status: 400 }
      )
    }

    // Check if Gemini API key is configured
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        {
          error: 'AI generation not configured. Please add GEMINI_API_KEY to environment variables.',
          requiresSetup: true
        },
        { status: 503 }
      )
    }

    const gemini = getGeminiClient()
    const generated = await gemini.generateBoard(name, description)

    return NextResponse.json(generated)
  } catch (error) {
    console.error('Board generation error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to generate board structure',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
