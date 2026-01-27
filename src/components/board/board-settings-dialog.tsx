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
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useAutoSave } from '@/hooks/use-auto-save'
import type { Board } from '@/types/board'
import { Loader2, Save, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'

interface BoardSettingsDialogProps {
  board: Board
  isOpen: boolean
  onClose: () => void
  onSave: (updatedBoard: Partial<Board>) => void
}

interface BoardFormData {
  name: string
  description: string
}

export function BoardSettingsDialog({
  board,
  isOpen,
  onClose,
  onSave,
}: BoardSettingsDialogProps) {
  const [formData, setFormData] = useState<BoardFormData>({
    name: board.name,
    description: board.description || '',
  })

  const originalData: BoardFormData = {
    name: board.name,
    description: board.description || '',
  }

  const {
    isSaving: isAutoSaving,
    lastSaved,
    hasDraft,
    hasChanges,
    clearDraft,
    discardDraft,
  } = useAutoSave(board.id, formData, originalData, {
    debounceMs: 1500,
    enabled: isOpen,
  })

  const [isSavingChanges, setIsSavingChanges] = useState(false)

  // Reset form when dialog opens with new board data
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: board.name,
        description: board.description || '',
      })
    }
  }, [isOpen, board])

  const handleSave = async () => {
    if (!hasChanges) return

    setIsSavingChanges(true)

    try {
      const response = await fetch(`/api/boards/${board.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
        }),
      })

      if (!response.ok) throw new Error('Failed to save changes')

      // Clear the draft after successful save
      await clearDraft()

      // Notify parent of the update
      onSave({
        name: formData.name.trim(),
        description: formData.description.trim() || null,
      })

      toast.success('Board settings saved')
      onClose()
    } catch (error) {
      console.error('Failed to save board settings:', error)
      toast.error('Failed to save changes')
    } finally {
      setIsSavingChanges(false)
    }
  }

  const handleClose = () => {
    if (hasChanges && hasDraft) {
      // Draft is already saved, just close
      toast.info('Your changes have been saved as a draft')
    }
    onClose()
  }

  const handleDiscard = async () => {
    await discardDraft()
    setFormData({
      name: board.name,
      description: board.description || '',
    })
    toast.info('Draft discarded')
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Board Settings</DialogTitle>
          <DialogDescription>
            Edit board details. Changes are automatically saved as drafts.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Board Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="Enter board name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="Enter board description (optional)"
              rows={3}
            />
          </div>

          {/* Auto-save status indicator */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              {isAutoSaving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Saving draft...</span>
                </>
              ) : lastSaved ? (
                <>
                  <Clock className="h-3.5 w-3.5" />
                  <span>
                    Draft saved {formatDistanceToNow(lastSaved, { addSuffix: true })}
                  </span>
                </>
              ) : hasChanges ? (
                <>
                  <Clock className="h-3.5 w-3.5" />
                  <span>Unsaved changes</span>
                </>
              ) : null}
            </div>

            {hasDraft && hasChanges && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDiscard}
                className="text-muted-foreground hover:text-foreground"
              >
                Discard draft
              </Button>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || isSavingChanges || !formData.name.trim()}
          >
            {isSavingChanges ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
