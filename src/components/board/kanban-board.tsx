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
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { Input } from '@/components/ui/input'
import type { BoardColumn, BoardCard } from '@/types/board'

interface KanbanBoardProps {
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

  const getColumnCards = useCallback(
    (columnId: string) =>
      cards
        .filter((card) => card.column_id === columnId)
        .sort((a, b) => a.position - b.position),
    [cards]
  )

  return (
    <div className="flex-1 overflow-x-auto p-6">
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
    </div>
  )
}
