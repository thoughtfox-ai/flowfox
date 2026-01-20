'use client'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Settings, MoreHorizontal, Users, Archive, Trash2 } from 'lucide-react'
import Link from 'next/link'
import type { Board } from '@/types/board'

interface BoardHeaderProps {
  board: Board
}

export function BoardHeader({ board }: BoardHeaderProps) {
  return (
    <div className="border-b px-6 py-4 flex items-center justify-between bg-background">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{board.name}</h1>
        {board.description && (
          <p className="text-sm text-muted-foreground mt-1">
            {board.description}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/boards/${board.id}/settings`}>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Link>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <Users className="mr-2 h-4 w-4" />
              Manage Members
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Archive className="mr-2 h-4 w-4" />
              Archive Board
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Board
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
