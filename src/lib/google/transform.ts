/**
 * Transformation layer for converting between Google Tasks and FlowFox cards
 */

import type { GoogleTask } from './tasks-client'
import type { Card } from '@/types/database'

export interface FlowFoxCardData {
  title: string
  description?: string
  status?: 'pending' | 'completed'
  due_date?: string
  priority?: 'low' | 'medium' | 'high' | 'critical'
  column_id: string
  position: number
}

/**
 * Convert Google Task to FlowFox card data
 *
 * Mapping:
 * - task.title → card.title
 * - task.notes → card.description
 * - task.status → card.status (completed/pending)
 * - task.due → card.due_date
 * - task.updated → used for conflict detection
 */
export function googleTaskToFlowFoxCard(
  task: GoogleTask,
  columnId: string,
  position: number = 0
): FlowFoxCardData {
  return {
    title: task.title,
    description: task.notes || '',
    status: task.status === 'completed' ? 'completed' : 'pending',
    due_date: task.due ? new Date(task.due).toISOString() : undefined,
    priority: extractPriorityFromNotes(task.notes),
    column_id: columnId,
    position,
  }
}

/**
 * Convert FlowFox card to Google Task data
 *
 * Mapping:
 * - card.title → task.title
 * - card.description + priority → task.notes
 * - card.status → task.status
 * - card.due_date → task.due
 */
export function flowFoxCardToGoogleTask(
  card: Partial<Card>
): Partial<GoogleTask> {
  const notes = buildNotesFromCard(card)

  return {
    title: card.title || '',
    notes: notes || undefined,
    status: card.status === 'completed' ? 'completed' : 'needsAction',
    due: card.due_date ? formatDateForGoogle(card.due_date) : undefined,
  }
}

/**
 * Extract priority from Google Task notes
 *
 * Looks for patterns like [Priority: High] or #high in the notes
 */
function extractPriorityFromNotes(
  notes?: string
): 'low' | 'medium' | 'high' | 'critical' | undefined {
  if (!notes) return undefined

  const lowerNotes = notes.toLowerCase()

  // Check for [Priority: X] format
  const priorityMatch = notes.match(/\[priority:\s*(low|medium|high|critical)\]/i)
  if (priorityMatch) {
    return priorityMatch[1].toLowerCase() as 'low' | 'medium' | 'high' | 'critical'
  }

  // Check for #priority format
  if (lowerNotes.includes('#critical')) return 'critical'
  if (lowerNotes.includes('#high')) return 'high'
  if (lowerNotes.includes('#medium')) return 'medium'
  if (lowerNotes.includes('#low')) return 'low'

  return undefined
}

/**
 * Build Google Task notes from FlowFox card
 *
 * Format: [Priority: X]\n\n{description}
 */
function buildNotesFromCard(card: Partial<Card>): string {
  const parts: string[] = []

  // Add priority tag if present
  if (card.priority) {
    parts.push(`[Priority: ${capitalizeFirst(card.priority)}]`)
  }

  // Add description
  if (card.description) {
    parts.push(card.description)
  }

  return parts.join('\n\n')
}

/**
 * Format FlowFox date for Google Tasks API
 *
 * Google Tasks expects RFC 3339 format (YYYY-MM-DDTHH:MM:SS.sssZ)
 */
function formatDateForGoogle(dateString: string): string {
  const date = new Date(dateString)
  return date.toISOString()
}

/**
 * Capitalize first letter of a string
 */
function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * Determine if Google Task has been updated more recently than FlowFox card
 *
 * Used for conflict detection during sync
 */
export function hasGoogleTaskBeenUpdatedSince(
  googleTask: GoogleTask,
  lastSyncedAt: string
): boolean {
  const googleUpdated = new Date(googleTask.updated).getTime()
  const lastSynced = new Date(lastSyncedAt).getTime()
  return googleUpdated > lastSynced
}

/**
 * Determine if FlowFox card has been updated more recently than last sync
 */
export function hasFlowFoxCardBeenUpdatedSince(
  card: Card,
  lastSyncedAt: string
): boolean {
  const cardUpdated = new Date(card.updated_at).getTime()
  const lastSynced = new Date(lastSyncedAt).getTime()
  return cardUpdated > lastSynced
}

/**
 * Detect sync conflict
 *
 * Returns true if both Google Task and FlowFox card have been modified since last sync
 */
export function detectSyncConflict(
  googleTask: GoogleTask,
  card: Card,
  lastSyncedAt: string
): boolean {
  return (
    hasGoogleTaskBeenUpdatedSince(googleTask, lastSyncedAt) &&
    hasFlowFoxCardBeenUpdatedSince(card, lastSyncedAt)
  )
}

/**
 * Resolve sync conflict using last-write-wins strategy
 *
 * Returns 'google' if Google Task is more recent, 'flowfox' otherwise
 */
export function resolveConflict(
  googleTask: GoogleTask,
  card: Card
): 'google' | 'flowfox' {
  const googleUpdated = new Date(googleTask.updated).getTime()
  const flowfoxUpdated = new Date(card.updated_at).getTime()

  return googleUpdated > flowfoxUpdated ? 'google' : 'flowfox'
}

/**
 * Calculate which fields have changed between Google Task and FlowFox card
 */
export function getChangedFields(
  googleTask: GoogleTask,
  card: Card
): string[] {
  const changes: string[] = []

  if (googleTask.title !== card.title) changes.push('title')
  if ((googleTask.notes || '') !== (card.description || '')) changes.push('description')
  if (
    (googleTask.status === 'completed' ? 'completed' : 'pending') !== card.status
  ) {
    changes.push('status')
  }

  const googleDue = googleTask.due ? new Date(googleTask.due).toISOString() : null
  const cardDue = card.due_date ? new Date(card.due_date).toISOString() : null
  if (googleDue !== cardDue) changes.push('due_date')

  return changes
}
