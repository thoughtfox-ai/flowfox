'use client'

import { useState, useEffect } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import {
  Calendar as CalendarIcon,
  Clock,
  Flag,
  Loader2,
  Trash2,
  Archive,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { SubtaskList } from './subtask-list'
import type { BoardCard, CardPriority } from '@/types/board'

const PRIORITY_OPTIONS: { value: CardPriority; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: 'bg-slate-500' },
  { value: 'medium', label: 'Medium', color: 'bg-blue-500' },
  { value: 'high', label: 'High', color: 'bg-orange-500' },
  { value: 'critical', label: 'Critical', color: 'bg-red-500' },
]

interface CardDetailPanelProps {
  card: BoardCard | null
  isOpen: boolean
  onClose: () => void
  onUpdate: (cardId: string, updates: Partial<BoardCard>) => Promise<void>
  onDelete?: (cardId: string) => Promise<void>
  onArchive?: (cardId: string) => Promise<void>
}

export function CardDetailPanel({
  card,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
  onArchive,
}: CardDetailPanelProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<CardPriority | null>(null)
  const [dueDate, setDueDate] = useState<Date | undefined>()
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  // Reset form when card changes
  useEffect(() => {
    if (card) {
      setTitle(card.title)
      setDescription(card.description || '')
      setPriority(card.priority)
      setDueDate(card.due_date ? new Date(card.due_date) : undefined)
      setHasChanges(false)
    }
  }, [card])

  // Track changes
  useEffect(() => {
    if (!card) return
    const changed =
      title !== card.title ||
      description !== (card.description || '') ||
      priority !== card.priority ||
      (dueDate?.toISOString().split('T')[0] || null) !==
        (card.due_date?.split('T')[0] || null)
    setHasChanges(changed)
  }, [card, title, description, priority, dueDate])

  const handleSave = async () => {
    if (!card || !hasChanges) return

    setIsSaving(true)
    try {
      await onUpdate(card.id, {
        title,
        description: description || null,
        priority,
        due_date: dueDate ? dueDate.toISOString() : null,
      })
      setHasChanges(false)
    } catch (error) {
      console.error('Failed to save card:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!card || !onDelete) return
    if (!confirm('Are you sure you want to delete this card?')) return

    try {
      await onDelete(card.id)
      onClose()
    } catch (error) {
      console.error('Failed to delete card:', error)
    }
  }

  const handleArchive = async () => {
    if (!card || !onArchive) return

    try {
      await onArchive(card.id)
      onClose()
    } catch (error) {
      console.error('Failed to archive card:', error)
    }
  }

  const clearDueDate = () => {
    setDueDate(undefined)
  }

  if (!card) return null

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl overflow-y-auto flex flex-col"
      >
        <SheetHeader className="px-6 pt-6 pb-4">
          <SheetTitle className="sr-only">Edit Card</SheetTitle>
          <SheetDescription className="sr-only">
            Edit card details including title, description, priority, and due date.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="card-title">Title</Label>
            <Input
              id="card-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Card title..."
              className="text-lg font-medium"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="card-description">Description</Label>
            <Textarea
              id="card-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a more detailed description..."
              rows={4}
            />
          </div>

          <Separator />

          {/* Priority */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Flag className="h-4 w-4" />
              Priority
            </Label>
            <Select
              value={priority || 'none'}
              onValueChange={(value) =>
                setPriority(value === 'none' ? null : (value as CardPriority))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Set priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No priority</SelectItem>
                {PRIORITY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <div className="flex items-center gap-2">
                      <div className={cn('w-2 h-2 rounded-full', opt.color)} />
                      {opt.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              Due Date
            </Label>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'flex-1 justify-start text-left font-normal',
                      !dueDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {dueDate && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={clearDueDate}
                  className="flex-shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Subtasks */}
          <Separator />
          <SubtaskList boardId={card.board_id} cardId={card.id} />

          {/* Labels - placeholder for future */}
          {card.labels && card.labels.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label>Labels</Label>
                <div className="flex flex-wrap gap-1">
                  {card.labels.map((label) => (
                    <Badge
                      key={label.id}
                      variant="outline"
                      style={{
                        backgroundColor: `${label.color}20`,
                        borderColor: label.color,
                        color: label.color,
                      }}
                    >
                      {label.name}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Time Tracking Info */}
          {(card.time_estimate_minutes || card.time_logged_minutes > 0) && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Time Tracking
                </Label>
                <div className="text-sm text-muted-foreground space-y-1">
                  {card.time_estimate_minutes && (
                    <p>
                      Estimate:{' '}
                      {Math.floor(card.time_estimate_minutes / 60)}h{' '}
                      {card.time_estimate_minutes % 60}m
                    </p>
                  )}
                  {card.time_logged_minutes > 0 && (
                    <p>
                      Logged:{' '}
                      {Math.floor(card.time_logged_minutes / 60)}h{' '}
                      {card.time_logged_minutes % 60}m
                    </p>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Metadata */}
          <Separator />
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Created: {format(new Date(card.created_at), 'PPP p')}</p>
            {card.updated_at !== card.created_at && (
              <p>Updated: {format(new Date(card.updated_at), 'PPP p')}</p>
            )}
            {card.completed_at && (
              <p>Completed: {format(new Date(card.completed_at), 'PPP p')}</p>
            )}
          </div>
        </div>

        {/* Actions - Fixed at bottom */}
        <SheetFooter className="px-6 py-4 border-t bg-background">
          <div className="flex flex-col gap-3 w-full">
            <Button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className="w-full bg-[#FF6B35] hover:bg-[#FF6B35]/90"
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {hasChanges ? 'Save Changes' : 'No Changes'}
            </Button>

            <div className="flex gap-3">
              {onArchive && (
                <Button
                  variant="outline"
                  onClick={handleArchive}
                  className="flex-1"
                >
                  <Archive className="mr-2 h-4 w-4" />
                  Archive
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="outline"
                  onClick={handleDelete}
                  className="flex-1 text-destructive hover:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              )}
            </div>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
