'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { BlurFade } from '@/components/ui/blur-fade'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Archive, Kanban, RotateCcw, Trash2, Calendar, User } from 'lucide-react'
import { toast } from 'sonner'

interface ArchivedBoard {
  id: string
  name: string
  description: string | null
  is_personal: boolean
  created_at: string
  updated_at: string
}

interface ArchivedCard {
  id: string
  title: string
  description: string | null
  column_id: string
  column_name: string
  board_id: string
  created_at: string
  updated_at: string
  assignees: Array<{
    id: string
    email: string
    full_name: string
    avatar_url: string | null
  }>
}

export default function ArchivePage() {
  const [archivedBoards, setArchivedBoards] = useState<ArchivedBoard[]>([])
  const [archivedCards, setArchivedCards] = useState<ArchivedCard[]>([])
  const [allBoards, setAllBoards] = useState<{ id: string; name: string }[]>([])
  const [selectedBoardId, setSelectedBoardId] = useState<string>('')
  const [isLoadingBoards, setIsLoadingBoards] = useState(true)
  const [isLoadingCards, setIsLoadingCards] = useState(false)

  // Fetch archived boards
  useEffect(() => {
    async function fetchArchivedBoards() {
      try {
        const response = await fetch('/api/boards?archived=true')
        if (!response.ok) throw new Error('Failed to fetch archived boards')
        const { boards } = await response.json()
        setArchivedBoards(boards || [])
      } catch (error) {
        console.error('Failed to fetch archived boards:', error)
        toast.error('Failed to load archived boards')
      } finally {
        setIsLoadingBoards(false)
      }
    }

    fetchArchivedBoards()
  }, [])

  // Fetch all active boards for card filtering
  useEffect(() => {
    async function fetchAllBoards() {
      try {
        const response = await fetch('/api/boards')
        if (!response.ok) throw new Error('Failed to fetch boards')
        const { boards } = await response.json()
        setAllBoards(boards || [])
      } catch (error) {
        console.error('Failed to fetch boards:', error)
      }
    }

    fetchAllBoards()
  }, [])

  // Fetch archived cards when board is selected
  useEffect(() => {
    if (!selectedBoardId) {
      setArchivedCards([])
      return
    }

    async function fetchArchivedCards() {
      setIsLoadingCards(true)
      try {
        const response = await fetch(
          `/api/boards/${selectedBoardId}/cards?archived=true`
        )
        if (!response.ok) throw new Error('Failed to fetch archived cards')
        const { cards } = await response.json()
        setArchivedCards(cards || [])
      } catch (error) {
        console.error('Failed to fetch archived cards:', error)
        toast.error('Failed to load archived cards')
      } finally {
        setIsLoadingCards(false)
      }
    }

    fetchArchivedCards()
  }, [selectedBoardId])

  const handleRestoreBoard = async (boardId: string) => {
    try {
      const response = await fetch(`/api/boards/${boardId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_archived: false }),
      })

      if (!response.ok) throw new Error('Failed to restore board')

      setArchivedBoards((prev) => prev.filter((b) => b.id !== boardId))
      toast.success('Board restored successfully')
    } catch (error) {
      console.error('Failed to restore board:', error)
      toast.error('Failed to restore board')
    }
  }

  const handleDeleteBoard = async (boardId: string) => {
    try {
      const response = await fetch(`/api/boards/${boardId}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete board')

      setArchivedBoards((prev) => prev.filter((b) => b.id !== boardId))
      toast.success('Board permanently deleted')
    } catch (error) {
      console.error('Failed to delete board:', error)
      toast.error('Failed to delete board')
    }
  }

  const handleRestoreCard = async (cardId: string) => {
    if (!selectedBoardId) return

    try {
      const response = await fetch(
        `/api/boards/${selectedBoardId}/cards/${cardId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_archived: false }),
        }
      )

      if (!response.ok) throw new Error('Failed to restore card')

      setArchivedCards((prev) => prev.filter((c) => c.id !== cardId))
      toast.success('Card restored successfully')
    } catch (error) {
      console.error('Failed to restore card:', error)
      toast.error('Failed to restore card')
    }
  }

  const handleDeleteCard = async (cardId: string) => {
    if (!selectedBoardId) return

    try {
      const response = await fetch(
        `/api/boards/${selectedBoardId}/cards/${cardId}`,
        {
          method: 'DELETE',
        }
      )

      if (!response.ok) throw new Error('Failed to delete card')

      setArchivedCards((prev) => prev.filter((c) => c.id !== cardId))
      toast.success('Card permanently deleted')
    } catch (error) {
      console.error('Failed to delete card:', error)
      toast.error('Failed to delete card')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="container py-8 px-6 lg:px-8 space-y-8">
      <BlurFade delay={0.1}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
            <Archive className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Archive</h1>
            <p className="text-muted-foreground mt-1">
              View and restore archived boards and cards
            </p>
          </div>
        </div>
      </BlurFade>

      <BlurFade delay={0.2}>
        <Tabs defaultValue="boards" className="space-y-6">
          <TabsList>
            <TabsTrigger value="boards" className="gap-2">
              <Kanban className="h-4 w-4" />
              Archived Boards
              {archivedBoards.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {archivedBoards.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="cards" className="gap-2">
              <Archive className="h-4 w-4" />
              Archived Cards
            </TabsTrigger>
          </TabsList>

          <TabsContent value="boards" className="space-y-4">
            {isLoadingBoards ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-4 rounded-lg border"
                  >
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-10 w-10 rounded-lg" />
                      <div className="space-y-2">
                        <Skeleton className="h-5 w-40" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Skeleton className="h-9 w-24" />
                      <Skeleton className="h-9 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            ) : archivedBoards.length === 0 ? (
              <div className="text-center py-12 rounded-lg border bg-muted/30">
                <Archive className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No archived boards</h3>
                <p className="text-muted-foreground">
                  Boards you archive will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {archivedBoards.map((board) => (
                  <div
                    key={board.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                        <Kanban className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{board.name}</h3>
                          <Badge variant="outline" className="text-xs">
                            {board.is_personal ? 'Personal' : 'Team'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          Archived on {formatDate(board.updated_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRestoreBoard(board.id)}
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Restore
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Permanently delete board?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. All cards, columns,
                              and data associated with &quot;{board.name}&quot; will be
                              permanently deleted.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteBoard(board.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete permanently
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="cards" className="space-y-4">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium">Select board:</label>
              <Select value={selectedBoardId} onValueChange={setSelectedBoardId}>
                <SelectTrigger className="w-[280px]">
                  <SelectValue placeholder="Choose a board to view archived cards" />
                </SelectTrigger>
                <SelectContent>
                  {allBoards.map((board) => (
                    <SelectItem key={board.id} value={board.id}>
                      {board.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!selectedBoardId ? (
              <div className="text-center py-12 rounded-lg border bg-muted/30">
                <Archive className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Select a board</h3>
                <p className="text-muted-foreground">
                  Choose a board from the dropdown to view its archived cards
                </p>
              </div>
            ) : isLoadingCards ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-4 rounded-lg border"
                  >
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-60" />
                      <Skeleton className="h-4 w-40" />
                    </div>
                    <div className="flex gap-2">
                      <Skeleton className="h-9 w-24" />
                      <Skeleton className="h-9 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            ) : archivedCards.length === 0 ? (
              <div className="text-center py-12 rounded-lg border bg-muted/30">
                <Archive className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No archived cards</h3>
                <p className="text-muted-foreground">
                  This board has no archived cards
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {archivedCards.map((card) => (
                  <div
                    key={card.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{card.title}</h3>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Badge variant="outline" className="text-xs">
                            {card.column_name}
                          </Badge>
                        </span>
                        {card.assignees.length > 0 && (
                          <span className="flex items-center gap-1">
                            <User className="h-3.5 w-3.5" />
                            {card.assignees
                              .map((a) => a.full_name || a.email)
                              .join(', ')}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatDate(card.updated_at)}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRestoreCard(card.id)}
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Restore
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Permanently delete card?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. The card &quot;
                              {card.title}&quot; will be permanently deleted.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteCard(card.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete permanently
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </BlurFade>
    </div>
  )
}
