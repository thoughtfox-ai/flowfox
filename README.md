# FlowFox

ThoughtFox's internal project management platform combining Kanban-style boards with conversational AI task management.

## Features

- **Kanban Boards**: Visual project management with drag-and-drop cards
- **Google Workspace SSO**: Domain-restricted authentication
- **Google Tasks Sync**: Bi-directional sync with personal task lists
- **AI Chat Interface**: Natural language task creation and queries (Google Gemini)
- **Time Tracking**: Built-in timers and timesheets
- **Dependencies**: Cross-board task blocking and dependencies

## Tech Stack

- **Frontend**: Next.js 16, TypeScript, Tailwind CSS, shadcn/ui
- **State**: Zustand (client), TanStack Query (server)
- **Backend**: Supabase (PostgreSQL, Auth, Realtime, Edge Functions)
- **AI**: Google Gemini API
- **Integrations**: Google Tasks API v1

## Getting Started

### Prerequisites

- Node.js 20+
- npm
- Supabase account
- Google Cloud project (for OAuth and Gemini API)

### Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd flowfox
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy environment template:
   ```bash
   cp .env.example .env.local
   ```

4. Configure environment variables in `.env.local`:
   - Get Supabase credentials from your [Supabase Dashboard](https://supabase.com/dashboard)
   - Configure Google OAuth in Supabase Auth settings

5. Run database migrations:
   ```bash
   npx supabase db push
   ```

6. Start development server:
   ```bash
   npm run dev
   ```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `GEMINI_API_KEY` | Google Gemini API key |
| `ALLOWED_GOOGLE_DOMAIN` | Domain restriction for SSO (e.g., `thoughtfox.com`) |

## Project Structure

```
src/
├── app/
│   ├── (dashboard)/     # Protected dashboard routes
│   ├── auth/            # Authentication routes
│   └── api/             # API routes
├── components/
│   ├── ui/              # shadcn/ui components
│   ├── layout/          # Layout components
│   └── providers/       # Context providers
├── lib/
│   └── supabase/        # Supabase clients
├── hooks/               # React Query hooks
├── stores/              # Zustand stores
└── types/               # TypeScript types

supabase/
├── migrations/          # Database migrations
└── functions/           # Edge Functions
```

## Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Database Schema

See [supabase/migrations/](./supabase/migrations/) for the complete schema including:

- Users, workspaces, and board access control
- Cards, columns, labels, and subtasks
- Time tracking and recurring tasks
- Activity logs and notifications
- Row-Level Security (RLS) policies

## Deployment

Deploy to Vercel:

```bash
npx vercel
```

Ensure environment variables are configured in Vercel project settings.

## License

Internal use only - ThoughtFox 2026
