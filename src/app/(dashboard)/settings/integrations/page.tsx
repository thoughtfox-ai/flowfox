'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, RefreshCw, Trash2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface Board {
  id: string
  name: string
  description: string | null
}

interface GoogleTaskList {
  id: string
  title: string
  updated: string
}

interface Mapping {
  id: string
  board_id: string
  google_task_list_id: string
  google_task_list_title: string
  sync_enabled: boolean
  boards: Board
}

export default function IntegrationsPage() {
  const { toast } = useToast()
  const [boards, setBoards] = useState<Board[]>([])
  const [taskLists, setTaskLists] = useState<GoogleTaskList[]>([])
  const [mappings, setMappings] = useState<Mapping[]>([])
  const [isLoadingBoards, setIsLoadingBoards] = useState(true)
  const [isLoadingTaskLists, setIsLoadingTaskLists] = useState(false)
  const [isLoadingMappings, setIsLoadingMappings] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [selectedBoard, setSelectedBoard] = useState<string>('')
  const [selectedTaskList, setSelectedTaskList] = useState<string>('')

  // Fetch boards
  useEffect(() => {
    fetchBoards()
    fetchMappings()
  }, [])

  const fetchBoards = async () => {
    try {
      const response = await fetch('/api/boards')
      if (!response.ok) throw new Error('Failed to fetch boards')
      const data = await response.json()
      setBoards(data.boards || [])
    } catch (error) {
      console.error('Failed to fetch boards:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch boards',
        variant: 'destructive',
      })
    } finally {
      setIsLoadingBoards(false)
    }
  }

  const fetchTaskLists = async () => {
    setIsLoadingTaskLists(true)
    try {
      const response = await fetch('/api/google/task-lists')
      if (!response.ok) throw new Error('Failed to fetch Google Task Lists')
      const data = await response.json()
      setTaskLists(data.taskLists || [])
    } catch (error) {
      console.error('Failed to fetch task lists:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch Google Task Lists. Make sure you\'re signed in with Google.',
        variant: 'destructive',
      })
    } finally {
      setIsLoadingTaskLists(false)
    }
  }

  const fetchMappings = async () => {
    try {
      const response = await fetch('/api/google/mappings')
      if (!response.ok) throw new Error('Failed to fetch mappings')
      const data = await response.json()
      setMappings(data.mappings || [])
    } catch (error) {
      console.error('Failed to fetch mappings:', error)
    } finally {
      setIsLoadingMappings(false)
    }
  }

  const handleCreateMapping = async () => {
    if (!selectedBoard || !selectedTaskList) {
      toast({
        title: 'Error',
        description: 'Please select both a board and a Google Task List',
        variant: 'destructive',
      })
      return
    }

    const taskList = taskLists.find((tl) => tl.id === selectedTaskList)
    if (!taskList) return

    try {
      const response = await fetch('/api/google/mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boardId: selectedBoard,
          googleTaskListId: selectedTaskList,
          googleTaskListTitle: taskList.title,
        }),
      })

      if (!response.ok) throw new Error('Failed to create mapping')

      toast({
        title: 'Success',
        description: 'Board mapped to Google Task List',
      })

      // Refresh mappings and reset selections
      fetchMappings()
      setSelectedBoard('')
      setSelectedTaskList('')
    } catch (error) {
      console.error('Failed to create mapping:', error)
      toast({
        title: 'Error',
        description: 'Failed to create mapping',
        variant: 'destructive',
      })
    }
  }

  const handleDeleteMapping = async (mappingId: string) => {
    try {
      const response = await fetch('/api/google/mappings', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mappingId }),
      })

      if (!response.ok) throw new Error('Failed to delete mapping')

      toast({
        title: 'Success',
        description: 'Mapping removed',
      })

      fetchMappings()
    } catch (error) {
      console.error('Failed to delete mapping:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete mapping',
        variant: 'destructive',
      })
    }
  }

  const handleSync = async () => {
    setIsSyncing(true)
    try {
      const response = await fetch('/api/google/sync', {
        method: 'POST',
      })

      if (!response.ok) throw new Error('Sync failed')

      const data = await response.json()

      toast({
        title: 'Sync Complete',
        description: `Synced ${Object.keys(data.results).length} board(s)`,
      })

      fetchMappings()
    } catch (error) {
      console.error('Sync failed:', error)
      toast({
        title: 'Error',
        description: 'Sync failed',
        variant: 'destructive',
      })
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Integrations</h1>
        <p className="text-muted-foreground">
          Connect FlowFox with Google Tasks for bi-directional sync
        </p>
      </div>

      {/* Active Mappings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Google Tasks Sync</CardTitle>
              <CardDescription>
                Boards synced with Google Task Lists
              </CardDescription>
            </div>
            <Button
              onClick={handleSync}
              disabled={isSyncing || mappings.length === 0}
              className="bg-[#FF6B35] hover:bg-[#FF6B35]/90"
            >
              {isSyncing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Sync Now
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingMappings ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : mappings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No boards mapped to Google Tasks yet
            </div>
          ) : (
            <div className="space-y-3">
              {mappings.map((mapping) => (
                <div
                  key={mapping.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="font-medium">{mapping.boards.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {mapping.google_task_list_title}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {mapping.sync_enabled ? (
                      <Badge variant="secondary" className="gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1">
                        <XCircle className="h-3 w-3" />
                        Disabled
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteMapping(mapping.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add New Mapping */}
      <Card>
        <CardHeader>
          <CardTitle>Add New Mapping</CardTitle>
          <CardDescription>
            Connect a FlowFox board to a Google Task List
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {taskLists.length === 0 && (
            <Button
              variant="outline"
              onClick={fetchTaskLists}
              disabled={isLoadingTaskLists}
              className="w-full"
            >
              {isLoadingTaskLists ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading Google Task Lists...
                </>
              ) : (
                'Load Google Task Lists'
              )}
            </Button>
          )}

          {taskLists.length > 0 && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">FlowFox Board</label>
                <Select value={selectedBoard} onValueChange={setSelectedBoard}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a board" />
                  </SelectTrigger>
                  <SelectContent>
                    {boards
                      .filter(
                        (board) => !mappings.find((m) => m.board_id === board.id)
                      )
                      .map((board) => (
                        <SelectItem key={board.id} value={board.id}>
                          {board.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Google Task List</label>
                <Select value={selectedTaskList} onValueChange={setSelectedTaskList}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a task list" />
                  </SelectTrigger>
                  <SelectContent>
                    {taskLists.map((list) => (
                      <SelectItem key={list.id} value={list.id}>
                        {list.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleCreateMapping}
                disabled={!selectedBoard || !selectedTaskList}
                className="w-full bg-[#FF6B35] hover:bg-[#FF6B35]/90"
              >
                Create Mapping
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Help Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            How Sync Works
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• Tasks created in Google Tasks appear as cards in the first column of your board</p>
          <p>• Cards created in FlowFox are synced to Google Tasks</p>
          <p>• Changes to title, description, status, and due date sync both ways</p>
          <p>• Conflicts are resolved using last-write-wins (most recent change wins)</p>
          <p>• Sync runs automatically every 5 minutes (coming soon) or click "Sync Now"</p>
        </CardContent>
      </Card>
    </div>
  )
}
