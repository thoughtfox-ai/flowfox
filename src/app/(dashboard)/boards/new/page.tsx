'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Loader2, Sparkles, Wand2, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import type { GeneratedBoard } from '@/lib/gemini/client'

export default function NewBoardPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [useAI, setUseAI] = useState(false)
  const [generated, setGenerated] = useState<GeneratedBoard | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
  })

  const handleGenerate = async () => {
    if (!formData.name) {
      setError('Please enter a board name first')
      return
    }

    setIsGenerating(true)
    setError(null)

    try {
      const response = await fetch('/api/boards/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        if (data.requiresSetup) {
          throw new Error('AI generation requires GEMINI_API_KEY environment variable')
        }
        throw new Error(data.error || 'Failed to generate board structure')
      }

      const generated = await response.json()
      setGenerated(generated)
    } catch (err) {
      console.error('Failed to generate board:', err)
      setError(err instanceof Error ? err.message : 'Failed to generate board structure')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setIsLoading(true)
    setError(null)

    try {
      // Create the board first
      const boardResponse = await fetch('/api/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!boardResponse.ok) {
        const data = await boardResponse.json()
        throw new Error(data.error || 'Failed to create board')
      }

      const { id: boardId } = await boardResponse.json()

      // If we have AI-generated structure, create columns and cards
      if (useAI && generated) {
        // Create columns
        const columnMap = new Map<string, string>() // name -> id
        for (const col of generated.columns) {
          const colResponse = await fetch(`/api/boards/${boardId}/columns`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: col.name,
              position: col.position,
            }),
          })

          if (colResponse.ok) {
            const { id: colId } = await colResponse.json()
            columnMap.set(col.name, colId)
          }
        }

        // Create cards
        for (const card of generated.cards) {
          const columnId = columnMap.get(card.column)
          if (!columnId) continue

          await fetch(`/api/boards/${boardId}/cards`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: card.title,
              description: card.description,
              column_id: columnId,
              priority: card.priority,
              position: 0,
            }),
          })
        }
      }

      router.push(`/boards/${boardId}`)
    } catch (err) {
      console.error('Failed to create board:', err)
      setError(err instanceof Error ? err.message : 'Failed to create board')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/boards">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Board</h1>
          <p className="text-muted-foreground">
            Set up a new project board
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Board Details</CardTitle>
          <CardDescription>
            Give your board a name and optional description
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Board Name</Label>
              <Input
                id="name"
                placeholder="e.g., Website Redesign"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="What is this board for? Be specific for better AI suggestions."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Checkbox
                id="use-ai"
                checked={useAI}
                onCheckedChange={(checked) => setUseAI(checked as boolean)}
              />
              <Label htmlFor="use-ai" className="flex items-center gap-2 font-normal cursor-pointer">
                <Sparkles className="h-4 w-4 text-[#FF6B35]" />
                Use AI to generate columns and starter tasks
                <Badge variant="secondary" className="ml-1">Beta</Badge>
              </Label>
            </div>

            {useAI && (
              <div className="space-y-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGenerate}
                  disabled={!formData.name || isGenerating}
                  className="w-full"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : generated ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Regenerate Structure
                    </>
                  ) : (
                    <>
                      <Wand2 className="mr-2 h-4 w-4" />
                      Generate with AI
                    </>
                  )}
                </Button>

                {generated && (
                  <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm">AI-Generated Structure</h4>
                      <Badge variant="outline">{generated.columns.length} columns, {generated.cards.length} tasks</Badge>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground font-medium">Columns:</p>
                      <div className="flex flex-wrap gap-2">
                        {generated.columns.map((col, idx) => (
                          <Badge key={idx} variant="secondary">
                            {col.name}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground font-medium">Sample Tasks:</p>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto">
                        {generated.cards.slice(0, 6).map((card, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-xs bg-background rounded px-2 py-1.5">
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
                              {card.column}
                            </Badge>
                            <span className="flex-1">{card.title}</span>
                            {card.priority && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
                                {card.priority}
                              </Badge>
                            )}
                          </div>
                        ))}
                        {generated.cards.length > 6 && (
                          <p className="text-xs text-muted-foreground text-center py-1">
                            +{generated.cards.length - 6} more tasks
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <div className="flex gap-2 pt-4">
              <Button
                type="submit"
                disabled={isLoading || !formData.name || (useAI && !generated)}
                className="bg-[#FF6B35] hover:bg-[#FF6B35]/90"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {useAI && generated ? 'Create Board with AI Structure' : 'Create Board'}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/boards">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
