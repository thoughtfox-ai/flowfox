'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import {
  Plus,
  ChevronRight,
  ChevronDown,
  Trash2,
  GripVertical,
  Loader2,
} from 'lucide-react'
import type { Subtask } from '@/types/board'

interface SubtaskListProps {
  boardId: string
  cardId: string
}

export function SubtaskList({ boardId, cardId }: SubtaskListProps) {
  const [subtasks, setSubtasks] = useState<Subtask[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAddingSubtask, setIsAddingSubtask] = useState(false)
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')
  const [expandedSubtasks, setExpandedSubtasks] = useState<Set<string>>(new Set())
  const [addingChildTo, setAddingChildTo] = useState<string | null>(null)
  const [newChildTitle, setNewChildTitle] = useState('')

  const fetchSubtasks = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/boards/${boardId}/cards/${cardId}/subtasks`
      )
      if (!response.ok) throw new Error('Failed to fetch subtasks')
      const data = await response.json()
      setSubtasks(data)
    } catch (error) {
      console.error('Failed to fetch subtasks:', error)
    } finally {
      setIsLoading(false)
    }
  }, [boardId, cardId])

  useEffect(() => {
    fetchSubtasks()
  }, [fetchSubtasks])

  const handleAddSubtask = async () => {
    if (!newSubtaskTitle.trim()) return

    try {
      const response = await fetch(
        `/api/boards/${boardId}/cards/${cardId}/subtasks`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: newSubtaskTitle.trim(),
            position: subtasks.length,
          }),
        }
      )

      if (!response.ok) throw new Error('Failed to create subtask')

      const newSubtask = await response.json()
      setSubtasks((prev) => [...prev, { ...newSubtask, children: [] }])
      setNewSubtaskTitle('')
      setIsAddingSubtask(false)
    } catch (error) {
      console.error('Failed to create subtask:', error)
    }
  }

  const handleAddChildSubtask = async (parentId: string) => {
    if (!newChildTitle.trim()) return

    const parent = subtasks.find((s) => s.id === parentId)
    const childCount = parent?.children?.length || 0

    try {
      const response = await fetch(
        `/api/boards/${boardId}/cards/${cardId}/subtasks`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: newChildTitle.trim(),
            parent_subtask_id: parentId,
            position: childCount,
          }),
        }
      )

      if (!response.ok) throw new Error('Failed to create subtask')

      const newSubtask = await response.json()
      setSubtasks((prev) =>
        prev.map((s) =>
          s.id === parentId
            ? { ...s, children: [...(s.children || []), newSubtask] }
            : s
        )
      )
      setNewChildTitle('')
      setAddingChildTo(null)
      // Expand parent to show new child
      setExpandedSubtasks((prev) => new Set(prev).add(parentId))
    } catch (error) {
      console.error('Failed to create subtask:', error)
    }
  }

  const handleToggleComplete = async (
    subtask: Subtask,
    parentId?: string
  ) => {
    const newIsCompleted = !subtask.is_completed

    // Optimistic update
    if (parentId) {
      setSubtasks((prev) =>
        prev.map((s) =>
          s.id === parentId
            ? {
                ...s,
                children: s.children?.map((c) =>
                  c.id === subtask.id
                    ? { ...c, is_completed: newIsCompleted }
                    : c
                ),
              }
            : s
        )
      )
    } else {
      setSubtasks((prev) =>
        prev.map((s) =>
          s.id === subtask.id ? { ...s, is_completed: newIsCompleted } : s
        )
      )
    }

    try {
      await fetch(`/api/boards/${boardId}/cards/${cardId}/subtasks`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: subtask.id,
          is_completed: newIsCompleted,
        }),
      })
    } catch (error) {
      console.error('Failed to update subtask:', error)
      fetchSubtasks() // Revert on error
    }
  }

  const handleDeleteSubtask = async (subtaskId: string, parentId?: string) => {
    // Optimistic update
    if (parentId) {
      setSubtasks((prev) =>
        prev.map((s) =>
          s.id === parentId
            ? { ...s, children: s.children?.filter((c) => c.id !== subtaskId) }
            : s
        )
      )
    } else {
      setSubtasks((prev) => prev.filter((s) => s.id !== subtaskId))
    }

    try {
      await fetch(
        `/api/boards/${boardId}/cards/${cardId}/subtasks?id=${subtaskId}`,
        { method: 'DELETE' }
      )
    } catch (error) {
      console.error('Failed to delete subtask:', error)
      fetchSubtasks() // Revert on error
    }
  }

  const toggleExpanded = (subtaskId: string) => {
    setExpandedSubtasks((prev) => {
      const next = new Set(prev)
      if (next.has(subtaskId)) {
        next.delete(subtaskId)
      } else {
        next.add(subtaskId)
      }
      return next
    })
  }

  const completedCount = subtasks.reduce((acc, s) => {
    const parentComplete = s.is_completed ? 1 : 0
    const childComplete =
      s.children?.filter((c) => c.is_completed).length || 0
    return acc + parentComplete + childComplete
  }, 0)

  const totalCount = subtasks.reduce(
    (acc, s) => acc + 1 + (s.children?.length || 0),
    0
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">
          Subtasks
          {totalCount > 0 && (
            <span className="ml-2 text-muted-foreground">
              ({completedCount}/{totalCount})
            </span>
          )}
        </span>
      </div>

      {/* Progress bar */}
      {totalCount > 0 && (
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-[#FF6B35] transition-all duration-300"
            style={{ width: `${(completedCount / totalCount) * 100}%` }}
          />
        </div>
      )}

      {/* Subtask list */}
      <div className="space-y-1">
        {subtasks.map((subtask) => (
          <div key={subtask.id}>
            {/* Parent subtask */}
            <div className="flex items-center gap-2 py-1.5 group">
              {/* Expand/collapse */}
              {subtask.children && subtask.children.length > 0 ? (
                <button
                  onClick={() => toggleExpanded(subtask.id)}
                  className="p-0.5 hover:bg-muted rounded"
                >
                  {expandedSubtasks.has(subtask.id) ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                </button>
              ) : (
                <div className="w-4" />
              )}

              <Checkbox
                checked={subtask.is_completed}
                onCheckedChange={() => handleToggleComplete(subtask)}
              />
              <span
                className={cn(
                  'flex-1 text-sm',
                  subtask.is_completed && 'line-through text-muted-foreground'
                )}
              >
                {subtask.title}
              </span>

              {/* Actions */}
              <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setAddingChildTo(subtask.id)}
                  title="Add sub-item"
                >
                  <Plus className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive hover:text-destructive"
                  onClick={() => handleDeleteSubtask(subtask.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Children subtasks */}
            {expandedSubtasks.has(subtask.id) && subtask.children && (
              <div className="ml-6 border-l pl-3 space-y-1">
                {subtask.children.map((child) => (
                  <div
                    key={child.id}
                    className="flex items-center gap-2 py-1 group"
                  >
                    <Checkbox
                      checked={child.is_completed}
                      onCheckedChange={() =>
                        handleToggleComplete(child, subtask.id)
                      }
                    />
                    <span
                      className={cn(
                        'flex-1 text-sm',
                        child.is_completed &&
                          'line-through text-muted-foreground'
                      )}
                    >
                      {child.title}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteSubtask(child.id, subtask.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}

                {/* Add child form */}
                {addingChildTo === subtask.id && (
                  <div className="flex items-center gap-2 py-1">
                    <Input
                      placeholder="Add sub-item..."
                      value={newChildTitle}
                      onChange={(e) => setNewChildTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter')
                          handleAddChildSubtask(subtask.id)
                        if (e.key === 'Escape') {
                          setAddingChildTo(null)
                          setNewChildTitle('')
                        }
                      }}
                      className="h-7 text-sm"
                      autoFocus
                    />
                    <Button
                      size="sm"
                      className="h-7"
                      onClick={() => handleAddChildSubtask(subtask.id)}
                    >
                      Add
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7"
                      onClick={() => {
                        setAddingChildTo(null)
                        setNewChildTitle('')
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add subtask form */}
      {isAddingSubtask ? (
        <div className="flex items-center gap-2">
          <Input
            placeholder="Add subtask..."
            value={newSubtaskTitle}
            onChange={(e) => setNewSubtaskTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddSubtask()
              if (e.key === 'Escape') {
                setIsAddingSubtask(false)
                setNewSubtaskTitle('')
              }
            }}
            className="h-8"
            autoFocus
          />
          <Button size="sm" onClick={handleAddSubtask}>
            Add
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setIsAddingSubtask(false)
              setNewSubtaskTitle('')
            }}
          >
            Cancel
          </Button>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground"
          onClick={() => setIsAddingSubtask(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add subtask
        </Button>
      )}
    </div>
  )
}
