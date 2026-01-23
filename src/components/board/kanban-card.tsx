'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Calendar, CheckSquare, Clock, AlertCircle, Cloud, Flame, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format, isPast, isToday, isTomorrow } from 'date-fns'
import type { BoardCard, CardPriority } from '@/types/board'

// BOLD priority color system with dramatic gradients and depth
const priorityConfig = {
  critical: {
    gradient: 'from-pink-500/30 via-rose-500/25 to-red-500/30',
    border: 'border-l-[6px] border-l-pink-500',
    glow: 'hover:shadow-[0_0_30px_rgba(236,72,153,0.4)]',
    icon: 'text-pink-600 dark:text-pink-400',
    bg: 'bg-gradient-to-br from-pink-100/80 via-rose-50 to-red-100/60 dark:from-pink-950/50 dark:via-rose-950/40 dark:to-red-950/50',
    badge: 'bg-gradient-to-r from-pink-600 to-rose-600 text-white font-black tracking-wider shadow-lg shadow-pink-500/50',
    accentRing: 'ring-2 ring-pink-500/40 ring-offset-2',
  },
  high: {
    gradient: 'from-orange-500/30 via-amber-500/25 to-yellow-500/30',
    border: 'border-l-[6px] border-l-orange-500',
    glow: 'hover:shadow-[0_0_30px_rgba(249,115,22,0.4)]',
    icon: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-gradient-to-br from-orange-100/80 via-amber-50 to-yellow-100/60 dark:from-orange-950/50 dark:via-amber-950/40 dark:to-yellow-950/50',
    badge: 'bg-gradient-to-r from-orange-600 to-amber-600 text-white font-black tracking-wider shadow-lg shadow-orange-500/50',
    accentRing: 'ring-2 ring-orange-500/40 ring-offset-2',
  },
  medium: {
    gradient: 'from-blue-500/30 via-cyan-500/25 to-sky-500/30',
    border: 'border-l-[6px] border-l-blue-500',
    glow: 'hover:shadow-[0_0_30px_rgba(59,130,246,0.4)]',
    icon: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-gradient-to-br from-blue-100/80 via-cyan-50 to-sky-100/60 dark:from-blue-950/50 dark:via-cyan-950/40 dark:to-sky-950/50',
    badge: 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-black tracking-wider shadow-lg shadow-blue-500/50',
    accentRing: 'ring-2 ring-blue-500/40 ring-offset-2',
  },
  low: {
    gradient: 'from-purple-500/30 via-violet-500/25 to-indigo-500/30',
    border: 'border-l-[6px] border-l-purple-500',
    glow: 'hover:shadow-[0_0_30px_rgba(168,85,247,0.4)]',
    icon: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-gradient-to-br from-purple-100/80 via-violet-50 to-indigo-100/60 dark:from-purple-950/50 dark:via-violet-950/40 dark:to-indigo-950/50',
    badge: 'bg-gradient-to-r from-purple-600 to-violet-600 text-white font-black tracking-wider shadow-lg shadow-purple-500/50',
    accentRing: 'ring-2 ring-purple-500/40 ring-offset-2',
  },
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
  const isDueTomorrow =
    card.due_date && !card.completed_at && isTomorrow(new Date(card.due_date))

  const priorityStyle = card.priority ? priorityConfig[card.priority] : null

  // Calculate progress percentage for subtasks
  const progress = card.subtask_count
    ? Math.round(((card.subtask_completed_count || 0) / card.subtask_count) * 100)
    : null

  // Handle click - only trigger if not dragging
  const handleClick = (e: React.MouseEvent) => {
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
        'group relative overflow-hidden transition-all duration-300',
        'cursor-grab active:cursor-grabbing',
        'hover:scale-[1.03] hover:shadow-2xl hover:-translate-y-1',
        (isDragging || isSortableDragging) && 'opacity-50 shadow-2xl scale-105 rotate-3',
        onClick && 'cursor-pointer',
        priorityStyle?.border || 'border-l-[6px] border-l-muted',
        priorityStyle?.glow,
        priorityStyle?.bg || 'bg-card',
        priorityStyle?.accentRing && 'hover:' + priorityStyle.accentRing,
        isOverdue && 'border-l-[6px] border-l-destructive ring-4 ring-destructive/30 animate-pulse'
      )}
    >
      {/* Dramatic priority gradient overlay */}
      {priorityStyle && (
        <div className={cn('absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-500 bg-gradient-to-br pointer-events-none', priorityStyle.gradient)} />
      )}

      <CardContent className="p-4 space-y-3 relative">
        {/* Priority badge & Labels Row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0 space-y-2">
            {/* Priority & Due Date Indicators */}
            <div className="flex items-center gap-2 flex-wrap">
              {card.priority && (
                <Badge
                  className={cn(
                    'text-[10px] uppercase px-2.5 py-1 border-0 shadow-lg',
                    'transition-all duration-200 hover:scale-105',
                    priorityStyle?.badge
                  )}
                >
                  {card.priority === 'critical' && <Flame className="h-3.5 w-3.5 mr-1 animate-pulse" />}
                  {card.priority === 'high' && <Zap className="h-3.5 w-3.5 mr-1" />}
                  {card.priority}
                </Badge>
              )}

              {isOverdue && (
                <Badge className="text-[10px] uppercase px-2.5 py-1 bg-gradient-to-r from-red-600 to-rose-600 text-white font-black tracking-wider shadow-lg shadow-red-500/50 animate-pulse border-0">
                  <AlertCircle className="h-3.5 w-3.5 mr-1" />
                  OVERDUE
                </Badge>
              )}

              {isDueToday && !isOverdue && (
                <Badge className="text-[10px] uppercase px-2.5 py-1 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-black tracking-wider shadow-lg shadow-orange-500/50 border-0">
                  <Clock className="h-3.5 w-3.5 mr-1" />
                  TODAY
                </Badge>
              )}

              {isDueTomorrow && (
                <Badge className="text-[10px] uppercase px-2.5 py-1 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-black tracking-wider shadow-lg shadow-blue-500/50 border-0">
                  TOMORROW
                </Badge>
              )}
            </div>

            {/* Labels - Enhanced with bolder styling */}
            {card.labels && card.labels.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {card.labels.slice(0, 3).map((label) => (
                  <Badge
                    key={label.id}
                    className="text-[10px] px-2.5 py-1 font-bold uppercase tracking-wide border-2 shadow-md transition-all hover:scale-105 hover:shadow-lg"
                    style={{
                      backgroundColor: `${label.color}25`,
                      borderColor: label.color,
                      color: label.color,
                    }}
                  >
                    {label.name}
                  </Badge>
                ))}
                {card.labels.length > 3 && (
                  <Badge className="text-[10px] px-2.5 py-1 font-bold bg-muted border-2 border-muted-foreground/30">
                    +{card.labels.length - 3}
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Google Tasks Sync Badge - Enhanced */}
          {card.google_task_id && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge className="px-2 py-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0 shadow-lg shadow-blue-500/30 hover:scale-110 transition-transform">
                    <Cloud className="h-4 w-4" />
                  </Badge>
                </TooltipTrigger>
                <TooltipContent className="font-semibold">Synced with Google Tasks</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {/* Title - Bold and prominent */}
        <h3 className="text-[15px] font-bold leading-tight line-clamp-3 tracking-tight group-hover:text-foreground transition-all duration-200 group-hover:scale-[1.01]">
          {card.title}
        </h3>

        {/* Progress Bar for Subtasks - Bolder styling */}
        {progress !== null && card.subtask_count! > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1.5 font-semibold">
                <CheckSquare className="h-4 w-4" />
                {card.subtask_completed_count}/{card.subtask_count} tasks
              </span>
              <span className={cn(
                "font-black text-sm",
                progress === 100 ? "text-green-600 dark:text-green-400" : "text-foreground"
              )}>
                {progress}%
              </span>
            </div>
            <div className="h-2 bg-muted/80 rounded-full overflow-hidden shadow-inner">
              <div
                className={cn(
                  "h-full transition-all duration-700 rounded-full shadow-lg",
                  progress === 100
                    ? "bg-gradient-to-r from-green-500 via-emerald-500 to-green-600 shadow-green-500/50"
                    : "bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-600 shadow-blue-500/50"
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Meta Info Footer */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-3 text-muted-foreground">
            {/* Due Date */}
            {card.due_date && !isDueToday && !isOverdue && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      <span className="font-medium">
                        {format(new Date(card.due_date), 'MMM d')}
                      </span>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    Due {format(new Date(card.due_date), 'MMMM d, yyyy')}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {/* Time Logged */}
            {card.time_logged_minutes > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="flex items-center gap-1 font-medium">
                      <Clock className="h-3.5 w-3.5" />
                      {Math.floor(card.time_logged_minutes / 60)}h
                      {card.time_logged_minutes % 60 > 0 && ` ${card.time_logged_minutes % 60}m`}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>Time logged</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {/* Time Estimate */}
            {card.time_estimate_minutes && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="flex items-center gap-1 text-muted-foreground/60">
                      est. {Math.floor(card.time_estimate_minutes / 60)}h
                      {card.time_estimate_minutes % 60 > 0 && `${card.time_estimate_minutes % 60}m`}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>Estimated time</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          {/* Assignees - Larger and more prominent */}
          {card.assignees && card.assignees.length > 0 && (
            <div className="flex -space-x-3">
              {card.assignees.slice(0, 3).map((assignee) => (
                <TooltipProvider key={assignee.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Avatar className="h-8 w-8 border-3 border-background ring-2 ring-offset-1 ring-primary/30 transition-all hover:scale-125 hover:z-10 hover:ring-primary/60 shadow-md">
                        <AvatarImage src={assignee.avatar_url || undefined} />
                        <AvatarFallback className="text-xs font-bold bg-gradient-to-br from-primary/20 to-primary/10">
                          {assignee.full_name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .slice(0, 2)
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </TooltipTrigger>
                    <TooltipContent className="font-semibold">{assignee.full_name}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
              {card.assignees.length > 3 && (
                <Avatar className="h-8 w-8 border-3 border-background bg-gradient-to-br from-muted to-muted/60 shadow-md">
                  <AvatarFallback className="text-xs font-bold">
                    +{card.assignees.length - 3}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          )}
        </div>
      </CardContent>

      {/* Enhanced shimmer effect on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 dark:via-white/10 to-transparent -skew-x-12 transform translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
      </div>
    </Card>
  )
}
