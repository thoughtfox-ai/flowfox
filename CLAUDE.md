# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FlowFox is an internal project management and delivery platform for ThoughtFox's consulting teams. It combines Kanban-style visual project management with conversational AI interaction, integrating with Google Tasks for bi-directional synchronisation.

Key differentiators:
- Conversational interface for task management (natural language chat)
- Google Tasks API integration (bi-directional sync within 5 minutes)
- AI-powered features using Google Gemini (smart planning, status summaries, estimation learning)

## Tech Stack (Planned)

- **Framework**: Next.js 14+ with App Router
- **Styling**: Tailwind CSS (ThoughtFox brand)
- **Backend**: Supabase (PostgreSQL, Auth, Realtime, Edge Functions)
- **AI**: Google Gemini API for conversational interface
- **Hosting**: Vercel (frontend), Supabase hosted (backend)
- **Authentication**: Google Workspace SSO

## Core Features

### Kanban Board System
- Boards with customisable columns (default: To Do, In Progress, Review, Done)
- Cards with: title, description, assignees, due date, labels, priority, time estimate
- WIP limits on columns
- Drag-and-drop card movement

### Subtask Hierarchy
- Max nesting: task → subtask → sub-subtask (2 levels)
- Parent cards show completion percentage
- Subtask promotion to full cards when scope expands

### Google Tasks Integration
- OAuth with Tasks API scope only
- Polling-based sync (5 minute default interval)
- Last-write-wins conflict resolution
- Per-card sync toggle

### Conversational Interface (Chat)
- Sidebar panel design (collapsible, visible alongside Kanban)
- Task creation: "Add a task to the Acme project: Review contract draft, due Friday, assign to Sarah"
- Status queries: "What's overdue on the Meridian project?"
- Task updates: "Mark the contract review task as complete"
- Context persistence for follow-up queries

## Data Model Concepts

**Boards**: Projects/engagements with configurable columns
**Cards**: Tasks that move through columns
**Subtasks**: Child tasks with assignee, due date, completion status
**Users**: Authenticated via Google Workspace SSO
**Roles**: viewer, contributor, admin (per board)

## Architecture Notes

### Row Level Security (RLS)
Use Supabase RLS policies for all data access control. Never bypass RLS in application code.

### Realtime Updates
Use Supabase Realtime subscriptions for live board updates across clients.

### Sync Service
Edge Functions handle Google Tasks sync:
- Triggered by database webhooks and cron jobs
- Handle OAuth token refresh
- Implement retry logic for failed syncs

### Chat Context
Store conversation context per user session in Supabase. Chat maintains context for follow-up queries without restating.

## Performance Targets

- Page load: < 2 seconds (board views with 200 cards)
- Chat response: < 3 seconds (95th percentile)
- Google Tasks sync: < 5 minutes
- Concurrent users: 50

## Non-Functional Requirements

- Desktop-optimised (1280px+), mobile out of scope for v1
- WCAG 2.1 AA accessibility compliance
- 99.5% uptime during business hours
- Daily backups with 30-day retention
