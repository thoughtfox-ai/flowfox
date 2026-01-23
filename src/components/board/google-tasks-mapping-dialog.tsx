'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Cloud, CheckCircle2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface GoogleTaskList {
  id: string
  title: string
}

interface GoogleTasksMappingDialogProps {
  boardId: string
  boardName: string
  isOpen: boolean
  onClose: () => void
  onMappingCreated: () => void
}

export function GoogleTasksMappingDialog({
  boardId,
  boardName,
  isOpen,
  onClose,
  onMappingCreated,
}: GoogleTasksMappingDialogProps) {
  const [taskLists, setTaskLists] = useState<GoogleTaskList[]>([])
  const [selectedTaskListId, setSelectedTaskListId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const { toast } = useToast()

  // Fetch task lists when dialog opens
  useEffect(() => {
    if (isOpen) {
      fetchTaskLists()
    }
  }, [isOpen])

  const fetchTaskLists = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/google/task-lists')

      if (!response.ok) {
        throw new Error('Failed to fetch Google Task Lists')
      }

      const data = await response.json()
      setTaskLists(data.taskLists || [])

      // Auto-select if only one task list
      if (data.taskLists?.length === 1) {
        setSelectedTaskListId(data.taskLists[0].id)
      }
    } catch (error) {
      console.error('Failed to fetch task lists:', error)
      toast({
        title: 'Error Loading Task Lists',
        description: 'Failed to fetch your Google Task Lists. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateMapping = async () => {
    if (!selectedTaskListId) {
      toast({
        title: 'Selection Required',
        description: 'Please select a Google Task List to sync with this board.',
        variant: 'destructive',
      })
      return
    }

    // Find the selected task list to get its title
    const selectedTaskList = taskLists.find(list => list.id === selectedTaskListId)
    if (!selectedTaskList) {
      toast({
        title: 'Error',
        description: 'Selected task list not found.',
        variant: 'destructive',
      })
      return
    }

    setIsCreating(true)
    try {
      const response = await fetch('/api/google/mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boardId: boardId,
          googleTaskListId: selectedTaskListId,
          googleTaskListTitle: selectedTaskList.title,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || 'Failed to create mapping')
      }

      toast({
        title: 'Connected Successfully!',
        description: `"${boardName}" is now connected to Google Tasks.`,
      })

      onMappingCreated()
      onClose()
    } catch (error) {
      console.error('Failed to create mapping:', error)
      toast({
        title: 'Connection Failed',
        description: error instanceof Error ? error.message : 'Failed to connect board to Google Tasks.',
        variant: 'destructive',
      })
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5 text-blue-500" />
            Connect to Google Tasks
          </DialogTitle>
          <DialogDescription>
            Select a Google Task List to sync with <span className="font-semibold">{boardName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Loading your task lists...</span>
            </div>
          ) : taskLists.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">
                No Google Task Lists found. Create one in Google Tasks first.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Task List</label>
              <Select value={selectedTaskListId} onValueChange={setSelectedTaskListId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a task list..." />
                </SelectTrigger>
                <SelectContent>
                  {taskLists.map((list) => (
                    <SelectItem key={list.id} value={list.id}>
                      {list.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-2">
                Cards from this board will sync with the selected Google Task List
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isCreating}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateMapping}
            disabled={isLoading || !selectedTaskListId || isCreating}
            className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Connect & Sync
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
