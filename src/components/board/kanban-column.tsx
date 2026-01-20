'use client'

import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { KanbanCard } from './kanban-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Plus, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BoardColumn, BoardCard } from '@/types/board'

interface KanbanColumnProps {
  column: BoardColumn
  cards: BoardCard[]
  onCardCreate: (columnId: string, title: string) => void
  onCardClick?: (card: BoardCard) => void
}

export function KanbanColumn({ column, cards, onCardCreate, onCardClick }: KanbanColumnProps) {
  const [isAddingCard, setIsAddingCard] = useState(false)
  const [newCardTitle, setNewCardTitle] = useState('')

  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  })

  const handleAddCard = () => {
    if (newCardTitle.trim()) {
      onCardCreate(column.id, newCardTitle.trim())
      setNewCardTitle('')
      setIsAddingCard(false)
    }
  }

  const isOverWipLimit = column.wip_limit !== null && cards.length >= column.wip_limit

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'w-80 flex-shrink-0 flex flex-col max-h-full',
        isOver && 'ring-2 ring-primary ring-offset-2 rounded-lg'
      )}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-muted/50 rounded-t-lg">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm">{column.name}</h3>
          <span
            className={cn(
              'text-xs px-2 py-0.5 rounded-full',
              isOverWipLimit
                ? 'bg-destructive/20 text-destructive'
                : 'bg-muted-foreground/20 text-muted-foreground'
            )}
          >
            {cards.length}
            {column.wip_limit !== null && `/${column.wip_limit}`}
          </span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <Pencil className="mr-2 h-4 w-4" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Cards Container */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-muted/30 min-h-[100px]">
        <SortableContext
          items={cards.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {cards.map((card) => (
            <KanbanCard key={card.id} card={card} onClick={onCardClick} />
          ))}
        </SortableContext>

        {/* Add Card Form */}
        {isAddingCard ? (
          <div className="space-y-2">
            <Input
              placeholder="Card title..."
              value={newCardTitle}
              onChange={(e) => setNewCardTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddCard()
                if (e.key === 'Escape') setIsAddingCard(false)
              }}
              autoFocus
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAddCard}>
                Add
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsAddingCard(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground"
            onClick={() => setIsAddingCard(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Card
          </Button>
        )}
      </div>
    </div>
  )
}
