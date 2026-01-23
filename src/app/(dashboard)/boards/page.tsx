'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { BlurFade } from '@/components/ui/blur-fade'
import { ShimmerButton } from '@/components/ui/shimmer-button'
import { BorderBeam } from '@/components/ui/border-beam'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Plus, Kanban, Sparkles, LayoutGrid, Clock, ArrowRight, User, Users } from 'lucide-react'

interface Board {
  id: string
  name: string
  description: string | null
  slug: string
  card_count: number
  is_personal: boolean
}

export default function BoardsPage() {
  const [boards, setBoards] = useState<Board[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchBoards() {
      try {
        const response = await fetch('/api/boards')
        if (!response.ok) throw new Error('Failed to fetch boards')

        const { boards: boardsData } = await response.json()

        // Transform to include card_count (from user_boards view)
        const boardsWithCount = (boardsData || []).map((board: Board) => ({
          id: board.id,
          name: board.name,
          description: board.description,
          slug: board.slug,
          card_count: board.card_count || 0,
          is_personal: board.is_personal || false,
        }))

        setBoards(boardsWithCount)
      } catch (error) {
        console.error('Failed to fetch boards:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchBoards()
  }, [])

  if (isLoading) {
    return (
      <div className="container py-8 px-6 lg:px-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Boards</h1>
            <p className="text-muted-foreground mt-1">
              Manage your project boards and track progress
            </p>
          </div>
          <Button disabled className="bg-gradient-to-r from-[#FF6B35] to-[#FF8F5E] text-white">
            <Plus className="mr-2 h-4 w-4" />
            New Board
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="overflow-hidden rounded-xl border bg-card shadow-sm">
              <div className="h-1.5 bg-muted animate-pulse" />
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <Skeleton className="h-12 w-12 rounded-xl flex-shrink-0" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-2/3" />
                    <Skeleton className="h-4 w-1/3" />
                  </div>
                </div>
                <Skeleton className="h-4 w-full mt-4 ml-16" />
                <div className="flex items-center gap-4 mt-5 pt-4 border-t">
                  <Skeleton className="h-4 w-28" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="container py-8 px-6 lg:px-8 space-y-8">
      <BlurFade delay={0.1}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              Boards
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage your project boards and track progress
            </p>
          </div>
          <Link href="/boards/new">
            <ShimmerButton
              shimmerColor="#ffffff"
              background="linear-gradient(135deg, #FF6B35 0%, #FF8F5E 100%)"
              className="text-white font-medium shadow-lg shadow-[#FF6B35]/25 hover:shadow-xl hover:shadow-[#FF6B35]/30 transition-shadow"
            >
              <Plus className="mr-2 h-4 w-4" />
              New Board
            </ShimmerButton>
          </Link>
        </div>
      </BlurFade>

      {boards.length === 0 ? (
        <BlurFade delay={0.2}>
          <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-background to-muted/30 shadow-sm">
            <div className="absolute inset-0 bg-grid-pattern opacity-5" />
            <div className="relative flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="relative mb-6">
                <div className="absolute inset-0 animate-pulse rounded-full bg-[#FF6B35]/20 blur-xl" />
                <div className="relative rounded-2xl bg-gradient-to-br from-[#FF6B35] to-[#FF8F5E] p-5 shadow-lg shadow-[#FF6B35]/20">
                  <Sparkles className="h-10 w-10 text-white" />
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-2">No boards yet</h3>
              <p className="text-muted-foreground mb-6 max-w-sm">
                Create your first board to start organizing tasks and tracking progress with your team
              </p>
              <Link href="/boards/new">
                <ShimmerButton
                  shimmerColor="#ffffff"
                  background="linear-gradient(135deg, #FF6B35 0%, #FF8F5E 100%)"
                  className="text-white font-medium px-6 py-2.5"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Board
                </ShimmerButton>
              </Link>
            </div>
          </div>
        </BlurFade>
      ) : (
        <div className="space-y-8">
          {/* Personal Boards Section */}
          {boards.some(b => b.is_personal) && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-xl font-semibold">My Personal Boards</h2>
                <Badge variant="outline">{boards.filter(b => b.is_personal).length}</Badge>
              </div>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {boards.filter(b => b.is_personal).map((board, index) => (
                  <BlurFade key={board.id} delay={0.2 + index * 0.1}>
                    <Link href={`/boards/${board.id}`} className="block group">
                      <div className="relative overflow-hidden rounded-xl border bg-card shadow-sm transition-all duration-300 hover:shadow-lg hover:shadow-[#FF6B35]/10 hover:-translate-y-1">
                        {/* Top accent bar */}
                        <div className="h-1.5 bg-gradient-to-r from-[#FF6B35] to-[#FF8F5E]" />

                        {/* Card content */}
                        <div className="p-6">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-4">
                              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#FF6B35]/10 group-hover:bg-[#FF6B35]/20 transition-colors flex-shrink-0">
                                <Kanban className="h-6 w-6 text-[#FF6B35]" />
                              </div>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <h3 className="font-semibold text-lg leading-tight group-hover:text-[#FF6B35] transition-colors">
                                    {board.name}
                                  </h3>
                                  <Badge variant="outline" className="text-xs">Private</Badge>
                                </div>
                                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                                  <LayoutGrid className="h-3.5 w-3.5" />
                                  {board.card_count} {board.card_count === 1 ? 'card' : 'cards'}
                                </p>
                              </div>
                            </div>
                            <ArrowRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all mt-1" />
                          </div>

                          {board.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mt-4 pl-16">
                              {board.description}
                            </p>
                          )}

                          {/* Bottom metadata */}
                          <div className="flex items-center gap-4 mt-5 pt-4 border-t text-xs text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5" />
                              Updated recently
                            </span>
                          </div>
                        </div>

                        {/* Hover border effect */}
                        <BorderBeam
                          size={200}
                          duration={8}
                          colorFrom="#FF6B35"
                          colorTo="#FF8F5E"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        />
                      </div>
                    </Link>
                  </BlurFade>
                ))}
              </div>
            </div>
          )}

          {/* Team Boards Section */}
          {boards.some(b => !b.is_personal) && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-xl font-semibold">Team Boards</h2>
                <Badge variant="outline">{boards.filter(b => !b.is_personal).length}</Badge>
              </div>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {boards.filter(b => !b.is_personal).map((board, index) => (
                  <BlurFade key={board.id} delay={0.2 + index * 0.1}>
                    <Link href={`/boards/${board.id}`} className="block group">
                      <div className="relative overflow-hidden rounded-xl border bg-card shadow-sm transition-all duration-300 hover:shadow-lg hover:shadow-[#FF6B35]/10 hover:-translate-y-1">
                        {/* Top accent bar */}
                        <div className="h-1.5 bg-gradient-to-r from-[#FF6B35] to-[#FF8F5E]" />

                        {/* Card content */}
                        <div className="p-6">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-4">
                              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#FF6B35]/10 group-hover:bg-[#FF6B35]/20 transition-colors flex-shrink-0">
                                <Kanban className="h-6 w-6 text-[#FF6B35]" />
                              </div>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <h3 className="font-semibold text-lg leading-tight group-hover:text-[#FF6B35] transition-colors">
                                    {board.name}
                                  </h3>
                                  <Badge variant="secondary" className="text-xs">Shared</Badge>
                                </div>
                                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                                  <LayoutGrid className="h-3.5 w-3.5" />
                                  {board.card_count} {board.card_count === 1 ? 'card' : 'cards'}
                                </p>
                              </div>
                            </div>
                            <ArrowRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all mt-1" />
                          </div>

                          {board.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mt-4 pl-16">
                              {board.description}
                            </p>
                          )}

                          {/* Bottom metadata */}
                          <div className="flex items-center gap-4 mt-5 pt-4 border-t text-xs text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5" />
                              Updated recently
                            </span>
                          </div>
                        </div>

                        {/* Hover border effect */}
                        <BorderBeam
                          size={200}
                          duration={8}
                          colorFrom="#FF6B35"
                          colorTo="#FF8F5E"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        />
                      </div>
                    </Link>
                  </BlurFade>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
