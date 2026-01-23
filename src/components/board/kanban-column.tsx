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
        'w-80 flex-shrink-0 flex flex-col max-h-full rounded-xl overflow-hidden',
        'bg-gradient-to-b from-background to-muted/20',
        'border border-border/50 shadow-sm',
        'transition-all duration-300',
        isOver && 'ring-2 ring-[#FF6B35] ring-offset-2 shadow-xl scale-[1.02]',
        isOverWipLimit && 'ring-2 ring-destructive/40'
      )}
    >
      {/* Column Header */}
      <div className={cn(
        'relative px-4 py-3',
        'bg-gradient-to-r from-muted/80 via-muted/60 to-muted/80',
        'border-b border-border/50',
        'backdrop-blur-sm'
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="font-bold text-base tracking-tight">
              {column.name}
            </h3>
            <span
              className={cn(
                'text-xs font-semibold px-2.5 py-1 rounded-full',
                'transition-all duration-200',
                'border',
                isOverWipLimit
                  ? 'bg-destructive/20 text-destructive border-destructive/30 animate-pulse'
                  : 'bg-[#FF6B35]/10 text-[#FF6B35] border-[#FF6B35]/20'
              )}
            >
              {cards.length}
              {column.wip_limit !== null && (
                <>
                  <span className="mx-0.5 opacity-50">/</span>
                  {column.wip_limit}
                </>
              )}
            </span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-muted-foreground/10 transition-colors"
              >
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

        {/* WIP Limit Warning */}
        {isOverWipLimit && (
          <div className="mt-2 text-xs text-destructive font-medium flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
            WIP limit exceeded
          </div>
        )}
      </div>

      {/* Cards Container */}
      <div className={cn(
        'flex-1 overflow-y-auto p-3 space-y-3',
        'bg-gradient-to-b from-transparent via-muted/5 to-muted/10',
        'min-h-[200px]',
        // Scrollbar styling
        'scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent',
        'hover:scrollbar-thumb-muted-foreground/30'
      )}>
        <SortableContext
          items={cards.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {cards.map((card) => (
            <KanbanCard key={card.id} card={card} onClick={onCardClick} />
          ))}
        </SortableContext>

        {/* Empty State */}
        {!isAddingCard && cards.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-3">
              <Plus className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <p className="text-sm text-muted-foreground/60 font-medium">
              No cards yet
            </p>
            <p className="text-xs text-muted-foreground/40 mt-1">
              Add your first card below
            </p>
          </div>
        )}

        {/* Add Card Form */}
        {isAddingCard ? (
          <div className="space-y-2 p-3 rounded-lg bg-card border border-border/50 shadow-sm">
            <Input
              placeholder="Enter card title..."
              value={newCardTitle}
              onChange={(e) => setNewCardTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddCard()
                if (e.key === 'Escape') setIsAddingCard(false)
              }}
              className="border-[#FF6B35]/20 focus:border-[#FF6B35] focus:ring-[#FF6B35]/20"
              autoFocus
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleAddCard}
                className="bg-[#FF6B35] hover:bg-[#FF6B35]/90 text-white"
              >
                Add Card
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
            className={cn(
              'w-full justify-start text-muted-foreground',
              'hover:bg-[#FF6B35]/10 hover:text-[#FF6B35] hover:border-[#FF6B35]/20',
              'border border-dashed border-transparent',
              'transition-all duration-200',
              'group'
            )}
            onClick={() => setIsAddingCard(true)}
          >
            <Plus className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform" />
            Add Card
          </Button>
        )}
      </div>
    </div>
  )
}
