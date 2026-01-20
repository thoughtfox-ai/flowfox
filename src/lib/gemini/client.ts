import { GoogleGenerativeAI } from '@google/generative-ai'

export interface GeneratedColumn {
  name: string
  position: number
  color?: string
}

export interface GeneratedCard {
  title: string
  description?: string
  column: string
  priority?: 'low' | 'medium' | 'high' | 'critical'
}

export interface GeneratedBoard {
  columns: GeneratedColumn[]
  cards: GeneratedCard[]
}

const SYSTEM_PROMPT = `You are an AI assistant that helps create project management boards.

When given a board name and description, generate a logical set of columns and starter tasks.

Guidelines:
- Create 3-6 columns representing workflow stages
- Suggest 4-8 realistic starter tasks distributed across columns
- Tasks should be actionable and specific to the project type
- Use common project management patterns (e.g., To Do, In Progress, Done for basic workflows)
- Adapt column names to the project domain (e.g., Backlog, Design, Development, Testing, Deploy for software)
- Assign appropriate priorities (low, medium, high, critical)

Return ONLY a valid JSON object with this exact structure:
{
  "columns": [
    {"name": "Column Name", "position": 0}
  ],
  "cards": [
    {"title": "Task title", "description": "Optional details", "column": "Column Name", "priority": "medium"}
  ]
}

Do not include any markdown code blocks, explanations, or additional text. Return only the raw JSON object.`

export class GeminiClient {
  private genAI: GoogleGenerativeAI
  private model: any

  constructor(apiKey?: string) {
    const key = apiKey || process.env.GEMINI_API_KEY
    if (!key) {
      throw new Error('Gemini API key not configured. Set GEMINI_API_KEY environment variable.')
    }
    this.genAI = new GoogleGenerativeAI(key)
    this.model = this.genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        maxOutputTokens: 8192,
      }
    })
  }

  async generateBoard(name: string, description?: string): Promise<GeneratedBoard> {
    const prompt = `Board Name: ${name}
${description ? `Description: ${description}` : ''}

Generate a board structure with columns and starter tasks for this project.`

    try {
      const result = await this.model.generateContent([
        { text: SYSTEM_PROMPT },
        { text: prompt }
      ])

      const response = await result.response
      const text = response.text()

      // Try to extract JSON from the response
      let jsonText = text.trim()

      // Remove markdown code blocks if present
      const codeBlockMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
      if (codeBlockMatch) {
        jsonText = codeBlockMatch[1]
      }

      const generated = JSON.parse(jsonText) as GeneratedBoard

      // Validate the structure
      if (!generated.columns || !Array.isArray(generated.columns)) {
        throw new Error('Invalid response: missing columns array')
      }
      if (!generated.cards || !Array.isArray(generated.cards)) {
        throw new Error('Invalid response: missing cards array')
      }

      // Ensure positions are set
      generated.columns.forEach((col, idx) => {
        if (typeof col.position !== 'number') {
          col.position = idx
        }
      })

      return generated
    } catch (error) {
      console.error('Failed to generate board:', error)
      throw new Error(`AI board generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}

// Singleton instance for server-side use
let geminiClient: GeminiClient | null = null

export function getGeminiClient(): GeminiClient {
  if (!geminiClient) {
    geminiClient = new GeminiClient()
  }
  return geminiClient
}
