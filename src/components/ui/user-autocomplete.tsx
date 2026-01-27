'use client'

import { useState, useEffect, useRef } from 'react'
import { useDebounce } from '@/hooks/use-debounce'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { Loader2, X, Check } from 'lucide-react'

export interface UserProfile {
  id: string
  email: string
  full_name: string
  avatar_url: string | null
}

interface UserAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onSelect: (user: UserProfile) => void
  workspaceId?: string
  placeholder?: string
  disabled?: boolean
  className?: string
  excludeUserIds?: string[]
}

export function UserAutocomplete({
  value,
  onChange,
  onSelect,
  workspaceId,
  placeholder = 'Search users by name or email...',
  disabled = false,
  className,
  excludeUserIds = [],
}: UserAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<UserProfile[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const debouncedValue = useDebounce(value, 300)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Fetch suggestions when debounced value changes
  useEffect(() => {
    if (debouncedValue.length < 2) {
      setSuggestions([])
      return
    }

    setIsLoading(true)
    const params = new URLSearchParams({ q: debouncedValue })
    if (workspaceId) {
      params.append('workspace_id', workspaceId)
    }

    fetch(`/api/users/search?${params}`)
      .then((res) => res.json())
      .then((data) => {
        const filteredUsers = (data.users || []).filter(
          (user: UserProfile) => !excludeUserIds.includes(user.id)
        )
        setSuggestions(filteredUsers)
        setHighlightedIndex(0)
      })
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [debouncedValue, workspaceId, excludeUserIds])

  const handleSelect = (user: UserProfile) => {
    onSelect(user)
    onChange('')
    setSuggestions([])
    setIsOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        )
        break
      case 'Enter':
        e.preventDefault()
        if (suggestions[highlightedIndex]) {
          handleSelect(suggestions[highlightedIndex])
        }
        break
      case 'Escape':
        setIsOpen(false)
        break
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
    <div className={cn('relative', className)}>
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => {
            // Delay closing to allow click on suggestion
            setTimeout(() => setIsOpen(false), 200)
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="pr-8"
        />
        {isLoading && (
          <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
        {!isLoading && value && (
          <button
            type="button"
            onClick={() => {
              onChange('')
              setSuggestions([])
              inputRef.current?.focus()
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {isOpen && suggestions.length > 0 && (
        <div
          ref={listRef}
          className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg"
        >
          <div className="max-h-60 overflow-auto py-1">
            {suggestions.map((user, index) => (
              <button
                key={user.id}
                type="button"
                className={cn(
                  'flex w-full items-center gap-3 px-3 py-2 text-left text-sm',
                  'hover:bg-accent',
                  highlightedIndex === index && 'bg-accent'
                )}
                onClick={() => handleSelect(user)}
                onMouseEnter={() => setHighlightedIndex(index)}
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">
                    {getInitials(user.full_name || user.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 overflow-hidden">
                  <p className="font-medium truncate">
                    {user.full_name || user.email.split('@')[0]}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user.email}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {isOpen && value.length >= 2 && !isLoading && suggestions.length === 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-3 text-center text-sm text-muted-foreground shadow-lg">
          No users found
        </div>
      )}
    </div>
  )
}

// Multi-select version for adding multiple users
interface UserMultiSelectProps {
  selectedUsers: UserProfile[]
  onAdd: (user: UserProfile) => void
  onRemove: (userId: string) => void
  workspaceId?: string
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function UserMultiSelect({
  selectedUsers,
  onAdd,
  onRemove,
  workspaceId,
  placeholder = 'Add team members...',
  disabled = false,
  className,
}: UserMultiSelectProps) {
  const [inputValue, setInputValue] = useState('')

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className={cn('space-y-2', className)}>
      <UserAutocomplete
        value={inputValue}
        onChange={setInputValue}
        onSelect={onAdd}
        workspaceId={workspaceId}
        placeholder={placeholder}
        disabled={disabled}
        excludeUserIds={selectedUsers.map((u) => u.id)}
      />

      {selectedUsers.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedUsers.map((user) => (
            <div
              key={user.id}
              className="flex items-center gap-2 rounded-full bg-secondary px-2 py-1 text-sm"
            >
              <Avatar className="h-5 w-5">
                <AvatarImage src={user.avatar_url || undefined} />
                <AvatarFallback className="text-xs">
                  {getInitials(user.full_name || user.email)}
                </AvatarFallback>
              </Avatar>
              <span className="max-w-[150px] truncate">
                {user.full_name || user.email.split('@')[0]}
              </span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => onRemove(user.id)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
