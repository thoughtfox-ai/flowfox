/**
 * Hook for auto-saving board drafts
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useDebounce } from './use-debounce'

interface AutoSaveOptions {
  debounceMs?: number
  enabled?: boolean
}

interface AutoSaveState {
  isSaving: boolean
  lastSaved: Date | null
  hasDraft: boolean
  error: string | null
}

export function useAutoSave<T extends Record<string, unknown>>(
  boardId: string,
  currentData: T,
  originalData: T,
  options: AutoSaveOptions = {}
) {
  const { debounceMs = 2000, enabled = true } = options

  const [state, setState] = useState<AutoSaveState>({
    isSaving: false,
    lastSaved: null,
    hasDraft: false,
    error: null,
  })

  const debouncedData = useDebounce(currentData, debounceMs)
  const isFirstRender = useRef(true)
  const previousDataRef = useRef<string>(JSON.stringify(originalData))

  // Check if data has changed from original
  const hasChanges = useCallback(() => {
    return JSON.stringify(debouncedData) !== JSON.stringify(originalData)
  }, [debouncedData, originalData])

  // Save draft to server
  const saveDraft = useCallback(async (data: T) => {
    if (!boardId) return

    setState((prev) => ({ ...prev, isSaving: true, error: null }))

    try {
      const response = await fetch(`/api/boards/${boardId}/draft`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error('Failed to save draft')
      }

      setState((prev) => ({
        ...prev,
        isSaving: false,
        lastSaved: new Date(),
        hasDraft: true,
      }))
    } catch (error) {
      console.error('Failed to save draft:', error)
      setState((prev) => ({
        ...prev,
        isSaving: false,
        error: 'Failed to save draft',
      }))
    }
  }, [boardId])

  // Clear draft from server
  const clearDraft = useCallback(async () => {
    if (!boardId) return

    try {
      const response = await fetch(`/api/boards/${boardId}/draft`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to clear draft')
      }

      setState((prev) => ({
        ...prev,
        hasDraft: false,
        lastSaved: null,
      }))
    } catch (error) {
      console.error('Failed to clear draft:', error)
    }
  }, [boardId])

  // Load existing draft on mount
  useEffect(() => {
    if (!boardId || !enabled) return

    async function loadDraft() {
      try {
        const response = await fetch(`/api/boards/${boardId}/draft`)
        if (!response.ok) return

        const { draft, updated_at } = await response.json()

        if (draft) {
          setState((prev) => ({
            ...prev,
            hasDraft: true,
            lastSaved: updated_at ? new Date(updated_at) : null,
          }))
        }
      } catch (error) {
        console.error('Failed to load draft:', error)
      }
    }

    loadDraft()
  }, [boardId, enabled])

  // Auto-save when debounced data changes
  useEffect(() => {
    // Skip first render
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    if (!enabled) return

    // Check if data actually changed since last save
    const currentDataStr = JSON.stringify(debouncedData)
    if (currentDataStr === previousDataRef.current) {
      return
    }

    // Only save if there are actual changes from original
    if (!hasChanges()) {
      // If data matches original but we had a draft, clear it
      if (state.hasDraft) {
        clearDraft()
      }
      return
    }

    previousDataRef.current = currentDataStr
    saveDraft(debouncedData)
  }, [debouncedData, enabled, hasChanges, saveDraft, clearDraft, state.hasDraft])

  // Discard draft and reset
  const discardDraft = useCallback(async () => {
    await clearDraft()
    setState((prev) => ({
      ...prev,
      hasDraft: false,
      lastSaved: null,
      error: null,
    }))
  }, [clearDraft])

  return {
    ...state,
    hasChanges: hasChanges(),
    saveDraft,
    clearDraft,
    discardDraft,
  }
}
