'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  UserAutocomplete,
  type UserProfile,
} from '@/components/ui/user-autocomplete'
import type { Board, BoardMember } from '@/types/board'
import { Users, Crown, Edit, Eye, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface BoardSharingDialogProps {
  board: Board
  isOpen: boolean
  onClose: () => void
}

const ROLE_ICONS: Record<string, React.ReactNode> = {
  admin: <Crown className="h-3.5 w-3.5 text-yellow-500" />,
  contributor: <Edit className="h-3.5 w-3.5 text-blue-500" />,
  viewer: <Eye className="h-3.5 w-3.5 text-gray-500" />,
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  contributor: 'Contributor',
  viewer: 'Viewer',
}

const ROLE_DESCRIPTIONS: Record<string, string> = {
  admin: 'Can manage board settings and members',
  contributor: 'Can create and edit cards',
  viewer: 'Can only view the board',
}

export function BoardSharingDialog({
  board,
  isOpen,
  onClose,
}: BoardSharingDialogProps) {
  const [members, setMembers] = useState<BoardMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchValue, setSearchValue] = useState('')
  const [isAddingMember, setIsAddingMember] = useState(false)
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null)

  // Fetch board members when dialog opens
  useEffect(() => {
    if (!isOpen) return

    async function fetchMembers() {
      setIsLoading(true)
      try {
        const response = await fetch(`/api/boards/${board.id}/members`)
        if (!response.ok) throw new Error('Failed to fetch members')
        const { members: membersData } = await response.json()
        setMembers(membersData || [])
      } catch (error) {
        console.error('Failed to fetch members:', error)
        toast.error('Failed to load board members')
      } finally {
        setIsLoading(false)
      }
    }

    fetchMembers()
  }, [isOpen, board.id])

  const handleAddMember = async (user: UserProfile) => {
    setIsAddingMember(true)
    setSearchValue('')

    try {
      const response = await fetch(`/api/boards/${board.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          role: 'contributor',
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        if (response.status === 409) {
          toast.error('User is already a member')
          return
        }
        throw new Error(error.error || 'Failed to add member')
      }

      // Add to local state
      setMembers((prev) => [
        ...prev,
        {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          avatar_url: user.avatar_url,
          role: 'contributor',
        },
      ])

      toast.success(`${user.full_name || user.email} added to board`)
    } catch (error) {
      console.error('Failed to add member:', error)
      toast.error('Failed to add member')
    } finally {
      setIsAddingMember(false)
    }
  }

  const handleUpdateRole = async (userId: string, newRole: string) => {
    setUpdatingMemberId(userId)

    try {
      const response = await fetch(`/api/boards/${board.id}/members`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          role: newRole,
        }),
      })

      if (!response.ok) throw new Error('Failed to update role')

      // Update local state
      setMembers((prev) =>
        prev.map((m) =>
          m.id === userId ? { ...m, role: newRole as BoardMember['role'] } : m
        )
      )

      toast.success('Role updated')
    } catch (error) {
      console.error('Failed to update role:', error)
      toast.error('Failed to update role')
    } finally {
      setUpdatingMemberId(null)
    }
  }

  const handleRemoveMember = async (userId: string) => {
    const member = members.find((m) => m.id === userId)
    if (!member) return

    try {
      const response = await fetch(
        `/api/boards/${board.id}/members?user_id=${userId}`,
        {
          method: 'DELETE',
        }
      )

      if (!response.ok) throw new Error('Failed to remove member')

      // Update local state
      setMembers((prev) => prev.filter((m) => m.id !== userId))
      toast.success(`${member.full_name || member.email} removed from board`)
    } catch (error) {
      console.error('Failed to remove member:', error)
      toast.error('Failed to remove member')
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Share Board
          </DialogTitle>
          <DialogDescription>
            Add team members and manage their access to &quot;{board.name}&quot;
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Add member input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Add people</label>
            <div className="relative">
              <UserAutocomplete
                value={searchValue}
                onChange={setSearchValue}
                onSelect={handleAddMember}
                workspaceId={board.workspace_id}
                placeholder="Search by name or email..."
                disabled={isAddingMember}
                excludeUserIds={members.map((m) => m.id)}
              />
              {isAddingMember && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
          </div>

          {/* Members list */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Members ({members.length})
            </label>

            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-40" />
                      </div>
                    </div>
                    <Skeleton className="h-9 w-28" />
                  </div>
                ))}
              </div>
            ) : members.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No members yet. Add someone above to share this board.
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={member.avatar_url || undefined} />
                        <AvatarFallback>
                          {getInitials(member.full_name || member.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {member.full_name || member.email.split('@')[0]}
                          </span>
                          {member.id === board.created_by && (
                            <Badge variant="secondary" className="text-xs">
                              Owner
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {member.email}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {member.id === board.created_by ? (
                        <Badge variant="outline" className="gap-1">
                          {ROLE_ICONS.admin}
                          Admin
                        </Badge>
                      ) : (
                        <>
                          <Select
                            value={member.role}
                            onValueChange={(value) =>
                              handleUpdateRole(member.id, value)
                            }
                            disabled={updatingMemberId === member.id}
                          >
                            <SelectTrigger className="w-[130px]">
                              {updatingMemberId === member.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <SelectValue />
                              )}
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(ROLE_LABELS).map(([value, label]) => (
                                <SelectItem key={value} value={value}>
                                  <div className="flex items-center gap-2">
                                    {ROLE_ICONS[value]}
                                    <span>{label}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => handleRemoveMember(member.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Role descriptions */}
          <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
            {Object.entries(ROLE_DESCRIPTIONS).map(([role, description]) => (
              <div key={role} className="flex items-center gap-2">
                {ROLE_ICONS[role]}
                <span className="font-medium">{ROLE_LABELS[role]}:</span>
                <span>{description}</span>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
