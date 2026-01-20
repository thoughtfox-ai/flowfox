/**
 * Google Tasks API Client
 *
 * Wraps the Google Tasks API for bi-directional sync with FlowFox cards.
 *
 * API Reference: https://developers.google.com/tasks/reference/rest/v1
 */

export interface GoogleTask {
  id: string
  title: string
  notes?: string
  status: 'needsAction' | 'completed'
  due?: string // RFC 3339 timestamp
  updated: string // RFC 3339 timestamp
  parent?: string // Parent task ID for subtasks
  position?: string // Position in the parent task list
  links?: Array<{ type: string; description: string; link: string }>
}

export interface GoogleTaskList {
  id: string
  title: string
  updated: string
}

export interface GoogleTasksListResponse {
  kind: 'tasks#tasks'
  items?: GoogleTask[]
  nextPageToken?: string
}

export interface GoogleTaskListsResponse {
  kind: 'tasks#taskLists'
  items?: GoogleTaskList[]
  nextPageToken?: string
}

export class GoogleTasksClient {
  private accessToken: string
  private baseUrl = 'https://tasks.googleapis.com/tasks/v1'

  constructor(accessToken: string) {
    this.accessToken = accessToken
  }

  /**
   * Get all task lists for the authenticated user
   */
  async getTaskLists(): Promise<GoogleTaskList[]> {
    const response = await fetch(`${this.baseUrl}/users/@me/lists`, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch task lists: ${response.statusText}`)
    }

    const data: GoogleTaskListsResponse = await response.json()
    return data.items || []
  }

  /**
   * Get a specific task list by ID
   */
  async getTaskList(taskListId: string): Promise<GoogleTaskList> {
    const response = await fetch(`${this.baseUrl}/users/@me/lists/${taskListId}`, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch task list: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Get all tasks in a task list
   */
  async getTasks(taskListId: string, showCompleted = false): Promise<GoogleTask[]> {
    const params = new URLSearchParams({
      showCompleted: showCompleted.toString(),
      showHidden: 'false',
    })

    const response = await fetch(
      `${this.baseUrl}/lists/${taskListId}/tasks?${params}`,
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to fetch tasks: ${response.statusText}`)
    }

    const data: GoogleTasksListResponse = await response.json()
    return data.items || []
  }

  /**
   * Get tasks updated after a specific timestamp
   */
  async getTasksUpdatedSince(
    taskListId: string,
    updatedMin: string
  ): Promise<GoogleTask[]> {
    const params = new URLSearchParams({
      updatedMin,
      showCompleted: 'true',
      showHidden: 'false',
    })

    const response = await fetch(
      `${this.baseUrl}/lists/${taskListId}/tasks?${params}`,
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to fetch updated tasks: ${response.statusText}`)
    }

    const data: GoogleTasksListResponse = await response.json()
    return data.items || []
  }

  /**
   * Get a specific task
   */
  async getTask(taskListId: string, taskId: string): Promise<GoogleTask> {
    const response = await fetch(
      `${this.baseUrl}/lists/${taskListId}/tasks/${taskId}`,
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to fetch task: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Create a new task
   */
  async createTask(
    taskListId: string,
    task: Partial<GoogleTask>
  ): Promise<GoogleTask> {
    const response = await fetch(`${this.baseUrl}/lists/${taskListId}/tasks`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(task),
    })

    if (!response.ok) {
      throw new Error(`Failed to create task: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Update an existing task
   */
  async updateTask(
    taskListId: string,
    taskId: string,
    updates: Partial<GoogleTask>
  ): Promise<GoogleTask> {
    const response = await fetch(
      `${this.baseUrl}/lists/${taskListId}/tasks/${taskId}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to update task: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Delete a task
   */
  async deleteTask(taskListId: string, taskId: string): Promise<void> {
    const response = await fetch(
      `${this.baseUrl}/lists/${taskListId}/tasks/${taskId}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to delete task: ${response.statusText}`)
    }
  }

  /**
   * Mark a task as completed
   */
  async completeTask(taskListId: string, taskId: string): Promise<GoogleTask> {
    return this.updateTask(taskListId, taskId, { status: 'completed' })
  }

  /**
   * Mark a task as incomplete
   */
  async uncompleteTask(taskListId: string, taskId: string): Promise<GoogleTask> {
    return this.updateTask(taskListId, taskId, { status: 'needsAction' })
  }

  /**
   * Move a task to a different position or parent
   */
  async moveTask(
    taskListId: string,
    taskId: string,
    parent?: string,
    previous?: string
  ): Promise<GoogleTask> {
    const params = new URLSearchParams()
    if (parent) params.set('parent', parent)
    if (previous) params.set('previous', previous)

    const response = await fetch(
      `${this.baseUrl}/lists/${taskListId}/tasks/${taskId}/move?${params}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to move task: ${response.statusText}`)
    }

    return response.json()
  }
}

/**
 * Create a Google Tasks client with the provided access token
 */
export function createGoogleTasksClient(accessToken: string): GoogleTasksClient {
  return new GoogleTasksClient(accessToken)
}
