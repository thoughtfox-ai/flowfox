'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { MoreHorizontal, Users, Archive, Trash2, Settings } from 'lucide-react'
import { BoardSettingsDialog } from './board-settings-dialog'
import { BoardSharingDialog } from './board-sharing-dialog'
import type { Board } from '@/types/board'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface BoardHeaderProps {
  board: Board
  onBoardUpdate?: (updates: Partial<Board>) => void
}

export function BoardHeader({ board, onBoardUpdate }: BoardHeaderProps) {
  const router = useRouter()
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isSharingOpen, setIsSharingOpen] = useState(false)
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  const handleArchiveBoard = async () => {
    try {
      const response = await fetch(`/api/boards/${board.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_archived: true }),
      })

      if (!response.ok) throw new Error('Failed to archive board')

      toast.success('Board archived')
      router.push('/boards')
    } catch (error) {
      console.error('Failed to archive board:', error)
      toast.error('Failed to archive board')
    }
  }

  const handleDeleteBoard = async () => {
    try {
      const response = await fetch(`/api/boards/${board.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete board')

      toast.success('Board deleted')
      router.push('/boards')
    } catch (error) {
      console.error('Failed to delete board:', error)
      toast.error('Failed to delete board')
    }
  }

  const handleBoardSave = (updates: Partial<Board>) => {
    onBoardUpdate?.(updates)
  }

  return (
    <>
      <div className="border-b px-6 py-4 flex items-center justify-between bg-gradient-to-r from-background to-muted/30">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
            {board.name}
          </h1>
          {board.description && (
            <p className="text-sm text-muted-foreground mt-1">
              {board.description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsSharingOpen(true)}
          >
            <Users className="h-4 w-4 mr-2" />
            Share
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsSettingsOpen(true)}>
                <Settings className="mr-2 h-4 w-4" />
                Board Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsSharingOpen(true)}>
                <Users className="mr-2 h-4 w-4" />
                Manage Members
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setIsArchiveDialogOpen(true)}>
                <Archive className="mr-2 h-4 w-4" />
                Archive Board
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => setIsDeleteDialogOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Board
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Settings Dialog */}
      <BoardSettingsDialog
        board={board}
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={handleBoardSave}
      />

      {/* Sharing Dialog */}
      <BoardSharingDialog
        board={board}
        isOpen={isSharingOpen}
        onClose={() => setIsSharingOpen(false)}
      />

      {/* Archive Confirmation Dialog */}
      <AlertDialog open={isArchiveDialogOpen} onOpenChange={setIsArchiveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this board?</AlertDialogTitle>
            <AlertDialogDescription>
              This will move &quot;{board.name}&quot; to the archive. You can restore
              it later from the Archive section.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchiveBoard}>
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this board?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. All cards, columns, and data
              associated with &quot;{board.name}&quot; will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBoard}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
