export interface BoardColumn {
  id: string
  board_id: string
  name: string
  position: number
  wip_limit: number | null
  is_done_column: boolean
  created_at: string
  updated_at: string
}

export interface CardLabel {
  id: string
  name: string
  color: string
}

export interface CardAssignee {
  id: string
  email: string
  full_name: string
  avatar_url: string | null
}

export interface BoardCard {
  id: string
  board_id: string
  column_id: string
  title: string
  description: string | null
  position: number
  priority: 'low' | 'medium' | 'high' | 'critical' | null
  due_date: string | null
  time_estimate_minutes: number | null
  time_logged_minutes: number
  is_archived: boolean
  created_by: string
  created_at: string
  updated_at: string
  completed_at: string | null
  google_task_id?: string | null
  labels?: CardLabel[]
  assignees?: CardAssignee[]
  subtask_count?: number
  subtask_completed_count?: number
}

export interface Board {
  id: string
  workspace_id: string
  name: string
  description: string | null
  slug: string
  is_archived: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export interface BoardWithDetails extends Board {
  columns: BoardColumn[]
  cards: BoardCard[]
}

export type CardPriority = 'low' | 'medium' | 'high' | 'critical'

export const PRIORITY_COLORS: Record<CardPriority, string> = {
  low: 'bg-slate-500',
  medium: 'bg-blue-500',
  high: 'bg-orange-500',
  critical: 'bg-red-500',
}

export const PRIORITY_LABELS: Record<CardPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
}

// Subtask types
export interface Subtask {
  id: string
  card_id: string
  parent_subtask_id: string | null
  title: string
  is_completed: boolean
  assignee_id: string | null
  due_date: string | null
  position: number
  is_checklist_item: boolean
  created_at: string
  updated_at: string
  completed_at: string | null
  // Nested children for 2-level structure
  children?: Subtask[]
  assignee?: CardAssignee
}

// My Day card - includes board info for context
export interface MyDayCard extends BoardCard {
  board_name: string
  column_name: string
}
