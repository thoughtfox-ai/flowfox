'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { KanbanBoard } from '@/components/board/kanban-board'
import { BoardHeader } from '@/components/board/board-header'
import { CardDetailPanel } from '@/components/card/card-detail-panel'
import { Skeleton } from '@/components/ui/skeleton'
import type { Board, BoardColumn, BoardCard } from '@/types/board'

export default function BoardPage() {
  const params = useParams()
  const boardId = params.boardId as string

  const [board, setBoard] = useState<Board | null>(null)
  const [columns, setColumns] = useState<BoardColumn[]>([])
  const [cards, setCards] = useState<BoardCard[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Card detail panel state
  const [selectedCard, setSelectedCard] = useState<BoardCard | null>(null)
  const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(false)

  const fetchBoardData = useCallback(async () => {
    try {
      const response = await fetch(`/api/boards/${boardId}`)
      if (!response.ok) throw new Error('Failed to fetch board')

      const data = await response.json()

      setBoard(data.board as Board)
      setColumns(data.columns as BoardColumn[])
      setCards(data.cards as BoardCard[])
    } catch (err) {
      console.error('Failed to fetch board:', err)
      setError(err instanceof Error ? err.message : 'Failed to load board')
    } finally {
      setIsLoading(false)
    }
  }, [boardId])

  useEffect(() => {
    fetchBoardData()
  }, [fetchBoardData])

  const handleCardMove = async (
    cardId: string,
    sourceColumnId: string,
    targetColumnId: string,
    newPosition: number
  ) => {
    // Optimistic update
    setCards((prevCards) =>
      prevCards.map((card) =>
        card.id === cardId
          ? { ...card, column_id: targetColumnId, position: newPosition }
          : card
      )
    )

    try {
      const response = await fetch(`/api/boards/${boardId}/cards`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: cardId,
          column_id: targetColumnId,
          position: newPosition,
        }),
      })

      if (!response.ok) throw new Error('Failed to move card')
    } catch (err) {
      console.error('Failed to move card:', err)
      // Revert on error
      fetchBoardData()
    }
  }

  const handleCardCreate = async (columnId: string, title: string) => {
    const cardsInColumn = cards.filter((c) => c.column_id === columnId)
    const maxPosition = cardsInColumn.length > 0
      ? Math.max(...cardsInColumn.map((c) => c.position))
      : -1

    try {
      const response = await fetch(`/api/boards/${boardId}/cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          column_id: columnId,
          title,
          position: maxPosition + 1,
        }),
      })

      if (!response.ok) throw new Error('Failed to create card')

      const newCard = await response.json()
      setCards((prevCards) => [...prevCards, newCard as BoardCard])
    } catch (err) {
      console.error('Failed to create card:', err)
    }
  }

  const handleColumnCreate = async (name: string) => {
    const maxPosition = columns.length > 0
      ? Math.max(...columns.map((c) => c.position))
      : -1

    try {
      const response = await fetch(`/api/boards/${boardId}/columns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          position: maxPosition + 1,
        }),
      })

      if (!response.ok) throw new Error('Failed to create column')

      const newColumn = await response.json()
      setColumns((prevColumns) => [...prevColumns, newColumn as BoardColumn])
    } catch (err) {
      console.error('Failed to create column:', err)
    }
  }

  // Card detail panel handlers
  const handleCardClick = (card: BoardCard) => {
    setSelectedCard(card)
    setIsDetailPanelOpen(true)
  }

  const handleCloseDetailPanel = () => {
    setIsDetailPanelOpen(false)
    // Small delay to let the animation complete
    setTimeout(() => setSelectedCard(null), 300)
  }

  const handleCardUpdate = async (cardId: string, updates: Partial<BoardCard>) => {
    // Optimistic update
    setCards((prevCards) =>
      prevCards.map((card) =>
        card.id === cardId ? { ...card, ...updates } : card
      )
    )

    // Also update selectedCard if it's the one being edited
    if (selectedCard?.id === cardId) {
      setSelectedCard((prev) => prev ? { ...prev, ...updates } : null)
    }

    try {
      const response = await fetch(`/api/boards/${boardId}/cards/${cardId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      if (!response.ok) throw new Error('Failed to update card')

      // Get the updated card from response
      const updatedCard = await response.json()

      // Update with server response
      setCards((prevCards) =>
        prevCards.map((card) =>
          card.id === cardId ? { ...card, ...updatedCard } : card
        )
      )

      if (selectedCard?.id === cardId) {
        setSelectedCard((prev) => prev ? { ...prev, ...updatedCard } : null)
      }
    } catch (err) {
      console.error('Failed to update card:', err)
      // Revert on error
      fetchBoardData()
    }
  }

  const handleCardDelete = async (cardId: string) => {
    // Optimistic removal
    setCards((prevCards) => prevCards.filter((card) => card.id !== cardId))

    try {
      const response = await fetch(`/api/boards/${boardId}/cards/${cardId}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete card')
    } catch (err) {
      console.error('Failed to delete card:', err)
      // Revert on error
      fetchBoardData()
    }
  }

  const handleCardArchive = async (cardId: string) => {
    await handleCardUpdate(cardId, { is_archived: true })
    handleCloseDetailPanel()
  }

  if (isLoading) {
    return (
      <div className="h-full flex flex-col">
        <div className="border-b px-6 py-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96 mt-2" />
        </div>
        <div className="flex-1 p-6">
          <div className="flex gap-4 h-full">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="w-80 flex-shrink-0">
                <Skeleton className="h-10 w-full mb-4" />
                <div className="space-y-3">
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error || !board) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Failed to load board</h2>
          <p className="text-muted-foreground">{error || 'Board not found'}</p>
        </div>
      </div>
    )
  }

  // Filter out archived cards for display
  const visibleCards = cards.filter((card) => !card.is_archived)

  return (
    <div className="h-full flex flex-col">
      <BoardHeader board={board} />
      <KanbanBoard
        boardId={boardId}
        boardName={board.name}
        columns={columns}
        cards={visibleCards}
        onCardMove={handleCardMove}
        onCardCreate={handleCardCreate}
        onColumnCreate={handleColumnCreate}
        onCardClick={handleCardClick}
      />
      <CardDetailPanel
        card={selectedCard}
        isOpen={isDetailPanelOpen}
        onClose={handleCloseDetailPanel}
        onUpdate={handleCardUpdate}
        onDelete={handleCardDelete}
        onArchive={handleCardArchive}
      />
    </div>
  )
}
