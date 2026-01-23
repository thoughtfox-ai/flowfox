'use client'

import { useState, useCallback } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable'
import { KanbanColumn } from './kanban-column'
import { KanbanCard } from './kanban-card'
import { GoogleTasksMappingDialog } from './google-tasks-mapping-dialog'
import { Button } from '@/components/ui/button'
import { Plus, Cloud, Loader2, CheckCircle2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import type { BoardColumn, BoardCard } from '@/types/board'

interface KanbanBoardProps {
  boardId: string
  boardName: string
  columns: BoardColumn[]
  cards: BoardCard[]
  onCardMove: (
    cardId: string,
    sourceColumnId: string,
    targetColumnId: string,
    newPosition: number
  ) => void
  onCardCreate: (columnId: string, title: string) => void
  onColumnCreate: (name: string) => void
  onCardClick?: (card: BoardCard) => void
}

export function KanbanBoard({
  boardId,
  boardName,
  columns,
  cards,
  onCardMove,
  onCardCreate,
  onColumnCreate,
  onCardClick,
}: KanbanBoardProps) {
  const [activeCard, setActiveCard] = useState<BoardCard | null>(null)
  const [isAddingColumn, setIsAddingColumn] = useState(false)
  const [newColumnName, setNewColumnName] = useState('')
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncSuccess, setSyncSuccess] = useState(false)
  const [isMappingDialogOpen, setIsMappingDialogOpen] = useState(false)
  const { toast } = useToast()

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event
      const card = cards.find((c) => c.id === active.id)
      if (card) {
        setActiveCard(card)
      }
    },
    [cards]
  )

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event
      if (!over) return

      const activeId = active.id as string
      const overId = over.id as string

      const activeCard = cards.find((c) => c.id === activeId)
      if (!activeCard) return

      // Check if over a column
      const overColumn = columns.find((c) => c.id === overId)
      if (overColumn && activeCard.column_id !== overColumn.id) {
        // Move to empty column or end of column
        const cardsInColumn = cards.filter((c) => c.column_id === overColumn.id)
        onCardMove(
          activeId,
          activeCard.column_id,
          overColumn.id,
          cardsInColumn.length
        )
        return
      }

      // Check if over another card
      const overCard = cards.find((c) => c.id === overId)
      if (overCard && activeCard.column_id !== overCard.column_id) {
        onCardMove(
          activeId,
          activeCard.column_id,
          overCard.column_id,
          overCard.position
        )
      }
    },
    [cards, columns, onCardMove]
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      setActiveCard(null)

      if (!over) return

      const activeId = active.id as string
      const overId = over.id as string

      if (activeId === overId) return

      const activeCard = cards.find((c) => c.id === activeId)
      const overCard = cards.find((c) => c.id === overId)

      if (!activeCard) return

      if (overCard && activeCard.column_id === overCard.column_id) {
        // Reorder within same column
        onCardMove(
          activeId,
          activeCard.column_id,
          activeCard.column_id,
          overCard.position
        )
      }
    },
    [cards, onCardMove]
  )

  const handleAddColumn = () => {
    if (newColumnName.trim()) {
      onColumnCreate(newColumnName.trim())
      setNewColumnName('')
      setIsAddingColumn(false)
    }
  }

  const handleGoogleTasksSync = async () => {
    setIsSyncing(true)
    setSyncSuccess(false)

    try {
      const response = await fetch(`/api/boards/${boardId}/sync-google-tasks`, {
        method: 'POST',
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))

        // Show user-friendly error message based on status
        if (response.status === 404 && errorData.error?.includes('No Google Tasks integration')) {
          // Open mapping dialog instead of just showing error
          setIsMappingDialogOpen(true)
        } else if (response.status === 401) {
          toast({
            title: 'Authentication Required',
            description: errorData.error || 'Please reconnect your Google account in Settings.',
            variant: 'destructive',
          })
        } else {
          toast({
            title: 'Sync Failed',
            description: errorData.error || 'An error occurred while syncing with Google Tasks.',
            variant: 'destructive',
          })
        }

        console.error('Sync failed with status:', response.status, errorData)
        return
      }

      const result = await response.json()
      console.log('Sync successful:', result)

      setSyncSuccess(true)

      // Show success toast with details
      toast({
        title: 'Sync Successful!',
        description: `Created ${result.result.cardsCreated || 0} cards, updated ${result.result.cardsUpdated || 0} cards`,
      })

      setTimeout(() => {
        setSyncSuccess(false)
        window.location.reload()
      }, 2000)
    } catch (error) {
      console.error('Google Tasks sync failed:', error)
      toast({
        title: 'Sync Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsSyncing(false)
    }
  }

  const handleMappingCreated = () => {
    // Automatically retry sync after mapping is created
    handleGoogleTasksSync()
  }

  const getColumnCards = useCallback(
    (columnId: string) =>
      cards
        .filter((card) => card.column_id === columnId)
        .sort((a, b) => a.position - b.position),
    [cards]
  )

  return (
    <div className="flex-1 overflow-x-auto p-6 relative">
      {/* Floating Google Tasks Sync Button */}
      <div className="fixed bottom-8 right-8 z-50">
        <Button
          onClick={handleGoogleTasksSync}
          disabled={isSyncing}
          className={cn(
            "group relative h-14 px-6 rounded-full shadow-2xl transition-all duration-300",
            "font-bold text-base tracking-wide",
            syncSuccess
              ? "bg-gradient-to-r from-green-600 via-emerald-600 to-green-600 text-white shadow-green-500/50 hover:shadow-green-500/70"
              : "bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-600 text-white shadow-blue-500/50 hover:shadow-blue-500/70",
            "hover:scale-110 hover:-translate-y-1",
            "ring-4 ring-white/20 dark:ring-black/20"
          )}
        >
          {isSyncing ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Syncing...
            </>
          ) : syncSuccess ? (
            <>
              <CheckCircle2 className="mr-2 h-5 w-5" />
              Synced!
            </>
          ) : (
            <>
              <Cloud className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
              Sync Google Tasks
            </>
          )}
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 h-full">
          <SortableContext
            items={columns.map((c) => c.id)}
            strategy={horizontalListSortingStrategy}
          >
            {columns.map((column) => (
              <KanbanColumn
                key={column.id}
                column={column}
                cards={getColumnCards(column.id)}
                onCardCreate={onCardCreate}
                onCardClick={onCardClick}
              />
            ))}
          </SortableContext>

          {/* Add Column */}
          <div className="w-80 flex-shrink-0">
            {isAddingColumn ? (
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <Input
                  placeholder="Column name..."
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddColumn()
                    if (e.key === 'Escape') setIsAddingColumn(false)
                  }}
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAddColumn}>
                    Add Column
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsAddingColumn(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="ghost"
                className="w-full justify-start text-muted-foreground"
                onClick={() => setIsAddingColumn(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Column
              </Button>
            )}
          </div>
        </div>

        <DragOverlay>
          {activeCard && <KanbanCard card={activeCard} isDragging />}
        </DragOverlay>
      </DndContext>

      {/* Google Tasks Mapping Dialog */}
      <GoogleTasksMappingDialog
        boardId={boardId}
        boardName={boardName}
        isOpen={isMappingDialogOpen}
        onClose={() => setIsMappingDialogOpen(false)}
        onMappingCreated={handleMappingCreated}
      />
    </div>
  )
}
