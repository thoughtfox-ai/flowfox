'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Calendar, CheckSquare, Clock, AlertCircle, Cloud } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format, isPast, isToday } from 'date-fns'
import type { BoardCard, CardPriority, PRIORITY_COLORS } from '@/types/board'

const priorityColors: Record<CardPriority, string> = {
  low: 'bg-slate-500',
  medium: 'bg-blue-500',
  high: 'bg-orange-500',
  critical: 'bg-red-500',
}

interface KanbanCardProps {
  card: BoardCard
  isDragging?: boolean
  onClick?: (card: BoardCard) => void
}

export function KanbanCard({ card, isDragging = false, onClick }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: card.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const isOverdue =
    card.due_date && !card.completed_at && isPast(new Date(card.due_date))
  const isDueToday =
    card.due_date && !card.completed_at && isToday(new Date(card.due_date))

  // Handle click - only trigger if not dragging
  const handleClick = (e: React.MouseEvent) => {
    // Don't open detail panel if we just finished dragging
    if (isSortableDragging || isDragging) return
    onClick?.(card)
  }

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={handleClick}
      className={cn(
        'cursor-grab active:cursor-grabbing transition-shadow hover:shadow-md',
        (isDragging || isSortableDragging) && 'opacity-50 shadow-lg rotate-2',
        isOverdue && 'border-destructive',
        onClick && 'cursor-pointer'
      )}
    >
      <CardContent className="p-3 space-y-2">
        {/* Priority Indicator & Labels */}
        <div className="flex items-start gap-2">
          {card.priority && (
            <div
              className={cn(
                'w-1 h-full min-h-4 rounded-full flex-shrink-0',
                priorityColors[card.priority]
              )}
            />
          )}
          <div className="flex-1 min-w-0">
            {/* Labels */}
            {card.labels && card.labels.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {card.labels.slice(0, 3).map((label) => (
                  <Badge
                    key={label.id}
                    variant="outline"
                    className="text-xs px-1.5 py-0"
                    style={{
                      backgroundColor: `${label.color}20`,
                      borderColor: label.color,
                      color: label.color,
                    }}
                  >
                    {label.name}
                  </Badge>
                ))}
                {card.labels.length > 3 && (
                  <Badge variant="outline" className="text-xs px-1.5 py-0">
                    +{card.labels.length - 3}
                  </Badge>
                )}
              </div>
            )}

            {/* Title */}
            <p className="text-sm font-medium leading-tight">{card.title}</p>
          </div>
        </div>

        {/* Meta Info */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            {/* Due Date */}
            {card.due_date && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      className={cn(
                        'flex items-center gap-1',
                        isOverdue && 'text-destructive',
                        isDueToday && 'text-orange-500'
                      )}
                    >
                      {isOverdue ? (
                        <AlertCircle className="h-3 w-3" />
                      ) : (
                        <Calendar className="h-3 w-3" />
                      )}
                      {format(new Date(card.due_date), 'MMM d')}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    {isOverdue
                      ? 'Overdue'
                      : isDueToday
                        ? 'Due today'
                        : `Due ${format(new Date(card.due_date), 'MMMM d, yyyy')}`}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {/* Subtasks */}
            {card.subtask_count !== undefined && card.subtask_count > 0 && (
              <span className="flex items-center gap-1">
                <CheckSquare className="h-3 w-3" />
                {card.subtask_completed_count}/{card.subtask_count}
              </span>
            )}

            {/* Time Logged */}
            {card.time_logged_minutes > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {Math.floor(card.time_logged_minutes / 60)}h{' '}
                {card.time_logged_minutes % 60}m
              </span>
            )}

            {/* Google Tasks Sync Indicator */}
            {card.google_task_id && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="flex items-center gap-1 text-blue-500">
                      <Cloud className="h-3 w-3" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>Synced with Google Tasks</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          {/* Assignees */}
          {card.assignees && card.assignees.length > 0 && (
            <div className="flex -space-x-1">
              {card.assignees.slice(0, 3).map((assignee) => (
                <TooltipProvider key={assignee.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Avatar className="h-5 w-5 border-2 border-background">
                        <AvatarImage src={assignee.avatar_url || undefined} />
                        <AvatarFallback className="text-[10px]">
                          {assignee.full_name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                    </TooltipTrigger>
                    <TooltipContent>{assignee.full_name}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
              {card.assignees.length > 3 && (
                <Avatar className="h-5 w-5 border-2 border-background">
                  <AvatarFallback className="text-[10px]">
                    +{card.assignees.length - 3}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
