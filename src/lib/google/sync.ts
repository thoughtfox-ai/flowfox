/**
 * Google Tasks Bi-directional Sync
 *
 * Handles syncing FlowFox cards with Google Tasks using last-write-wins conflict resolution
 */

import { createGoogleTasksClient } from './tasks-client'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  googleTaskToFlowFoxCard,
  flowFoxCardToGoogleTask,
  detectSyncConflict,
  resolveConflict,
  getChangedFields,
} from './transform'
import type { GoogleTask } from './tasks-client'
import type { Card } from '@/types/database'

export interface SyncResult {
  success: boolean
  cardsCreated: number
  cardsUpdated: number
  cardsDeleted: number
  tasksCreated: number
  tasksUpdated: number
  tasksDeleted: number
  conflicts: number
  errors: string[]
}

/**
 * Sync a single board with its mapped Google Task List
 *
 * Flow:
 * 1. Fetch all cards from the board
 * 2. Fetch all tasks from the Google Task List
 * 3. Match existing pairs using google_task_sync_state
 * 4. For each unmatched task → create new card
 * 5. For each unmatched card → create new task
 * 6. For each matched pair → sync changes with conflict resolution
 */
export async function syncBoardWithGoogleTasks(
  boardId: string,
  googleTaskListId: string,
  accessToken: string
): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    cardsCreated: 0,
    cardsUpdated: 0,
    cardsDeleted: 0,
    tasksCreated: 0,
    tasksUpdated: 0,
    tasksDeleted: 0,
    conflicts: 0,
    errors: [],
  }

  try {
    const supabase = createAdminClient()
    const tasksClient = createGoogleTasksClient(accessToken)

    // 1. Fetch all cards from the board
    const { data: cards, error: cardsError } = await supabase
      .from('cards')
      .select('*')
      .eq('board_id', boardId)

    if (cardsError) throw cardsError

    // 2. Fetch all Google Tasks
    const googleTasks = await tasksClient.getTasks(googleTaskListId, true)

    // 3. Fetch sync state for all cards
    const { data: syncStates, error: syncError } = await supabase
      .from('google_task_sync_state')
      .select('*')
      .in(
        'card_id',
        cards?.map((c) => c.id) || []
      )

    if (syncError) throw syncError

    // Build lookup maps
    const cardsBySyncState = new Map<string, Card>()
    const tasksBySyncState = new Map<string, GoogleTask>()
    const syncStateByCardId = new Map<string, any>()

    syncStates?.forEach((state) => {
      syncStateByCardId.set(state.card_id, state)
      const card = cards?.find((c) => c.id === state.card_id)
      const task = googleTasks.find((t) => t.id === state.google_task_id)
      if (card) cardsBySyncState.set(state.card_id, card)
      if (task) tasksBySyncState.set(state.google_task_id, task)
    })

    // 4. Process unmatched Google Tasks (create new cards)
    const unmatchedTasks = googleTasks.filter(
      (task) => !Array.from(tasksBySyncState.values()).find((t) => t.id === task.id)
    )

    for (const task of unmatchedTasks) {
      try {
        // Get first column of the board
        const { data: columns } = await supabase
          .from('columns')
          .select('id')
          .eq('board_id', boardId)
          .order('position', { ascending: true })
          .limit(1)

        if (!columns || columns.length === 0) {
          result.errors.push(`No columns found for board ${boardId}`)
          continue
        }

        const cardData = googleTaskToFlowFoxCard(task, columns[0].id)

        // Create card
        const { data: newCard, error: createError } = await supabase
          .from('cards')
          .insert({
            ...cardData,
            board_id: boardId,
          })
          .select()
          .single()

        if (createError) throw createError

        // Create sync state
        await supabase.from('google_task_sync_state').insert({
          card_id: newCard.id,
          google_task_id: task.id,
          google_task_list_id: googleTaskListId,
          last_synced_at: new Date().toISOString(),
          last_google_updated_at: task.updated,
          last_flowfox_updated_at: newCard.updated_at,
          sync_status: 'synced',
          sync_enabled: true,
        })

        result.cardsCreated++
      } catch (error) {
        result.errors.push(`Failed to create card from task ${task.id}: ${error}`)
      }
    }

    // 5. Process unmatched cards (create new tasks)
    const unmatchedCards = cards?.filter(
      (card) => !syncStateByCardId.has(card.id)
    ) || []

    for (const card of unmatchedCards) {
      try {
        const taskData = flowFoxCardToGoogleTask(card)

        const newTask = await tasksClient.createTask(googleTaskListId, taskData)

        // Create sync state
        await supabase.from('google_task_sync_state').insert({
          card_id: card.id,
          google_task_id: newTask.id,
          google_task_list_id: googleTaskListId,
          last_synced_at: new Date().toISOString(),
          last_google_updated_at: newTask.updated,
          last_flowfox_updated_at: card.updated_at,
          sync_status: 'synced',
          sync_enabled: true,
        })

        result.tasksCreated++
      } catch (error) {
        result.errors.push(`Failed to create task from card ${card.id}: ${error}`)
      }
    }

    // 6. Process matched pairs (sync changes)
    for (const [cardId, syncState] of syncStateByCardId.entries()) {
      try {
        const card = cardsBySyncState.get(cardId)
        const task = tasksBySyncState.get(syncState.google_task_id)

        if (!card || !task) continue

        // Check if sync is enabled
        if (!syncState.sync_enabled) continue

        // Detect conflict
        const hasConflict = detectSyncConflict(
          task,
          card,
          syncState.last_synced_at
        )

        if (hasConflict) {
          result.conflicts++

          // Resolve conflict using last-write-wins
          const winner = resolveConflict(task, card)

          // Log conflict
          await supabase.from('google_sync_audit_log').insert({
            card_id: card.id,
            sync_state_id: syncState.id,
            event_type: 'sync_conflict',
            google_task_id: task.id,
            flowfox_data: card as any,
            google_data: task as any,
            resolution: `Last-write-wins: ${winner}`,
          })

          if (winner === 'google') {
            // Update FlowFox card from Google Task
            const updates = googleTaskToFlowFoxCard(task, card.column_id, card.position)
            await supabase
              .from('cards')
              .update(updates)
              .eq('id', card.id)

            result.cardsUpdated++
          } else {
            // Update Google Task from FlowFox card
            const updates = flowFoxCardToGoogleTask(card)
            await tasksClient.updateTask(googleTaskListId, task.id, updates)

            result.tasksUpdated++
          }

          // Update sync state
          await supabase
            .from('google_task_sync_state')
            .update({
              last_synced_at: new Date().toISOString(),
              last_google_updated_at: task.updated,
              last_flowfox_updated_at: card.updated_at,
              sync_status: 'synced',
            })
            .eq('id', syncState.id)
        } else {
          // No conflict - check which side changed
          const googleChanged = new Date(task.updated) > new Date(syncState.last_synced_at)
          const flowfoxChanged = new Date(card.updated_at) > new Date(syncState.last_synced_at)

          if (googleChanged) {
            // Update FlowFox from Google
            const updates = googleTaskToFlowFoxCard(task, card.column_id, card.position)
            await supabase
              .from('cards')
              .update(updates)
              .eq('id', card.id)

            await supabase
              .from('google_task_sync_state')
              .update({
                last_synced_at: new Date().toISOString(),
                last_google_updated_at: task.updated,
                sync_status: 'synced',
              })
              .eq('id', syncState.id)

            result.cardsUpdated++
          } else if (flowfoxChanged) {
            // Update Google from FlowFox
            const updates = flowFoxCardToGoogleTask(card)
            await tasksClient.updateTask(googleTaskListId, task.id, updates)

            await supabase
              .from('google_task_sync_state')
              .update({
                last_synced_at: new Date().toISOString(),
                last_flowfox_updated_at: card.updated_at,
                sync_status: 'synced',
              })
              .eq('id', syncState.id)

            result.tasksUpdated++
          }
        }
      } catch (error) {
        result.errors.push(`Failed to sync card ${cardId}: ${error}`)
      }
    }

    return result
  } catch (error) {
    result.success = false
    result.errors.push(`Sync failed: ${error}`)
    return result
  }
}

/**
 * Sync all mapped boards for a user
 */
export async function syncAllMappedBoards(
  userId: string,
  accessToken: string
): Promise<Map<string, SyncResult>> {
  const supabase = createAdminClient()
  const results = new Map<string, SyncResult>()

  // Get all mappings for the user
  const { data: mappings, error } = await supabase
    .from('google_task_list_mappings')
    .select('*')
    .eq('user_id', userId)
    .eq('sync_enabled', true)

  if (error) {
    console.error('Failed to fetch mappings:', error)
    return results
  }

  // Sync each mapping
  for (const mapping of mappings || []) {
    const result = await syncBoardWithGoogleTasks(
      mapping.board_id,
      mapping.google_task_list_id,
      accessToken
    )
    results.set(mapping.board_id, result)
  }

  return results
}
