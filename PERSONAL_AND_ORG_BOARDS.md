# Personal and Organizational Boards

FlowFox now supports two types of boards to accommodate both personal task management and team collaboration.

## Board Types

### Personal Boards

**What are they?**
- Private boards only visible to you
- Automatically created in your personal workspace
- Perfect for personal todos, notes, and private planning

**Features**:
- ✅ Only you can see, edit, and delete
- ✅ No sharing or collaboration
- ✅ Can only assign cards to yourself
- ✅ Automatically syncs with your Google Tasks (if configured)
- ✅ Appears in "My Boards" section

**Use Cases**:
- Personal task lists
- Daily planning
- Private project planning
- Shopping lists
- Personal goals tracking

### Organizational Boards

**What are they?**
- Shared boards within the ThoughtFox workspace
- Visible to all workspace members
- Perfect for team projects and collaboration

**Features**:
- ✅ Shared with all ThoughtFox team members
- ✅ Multiple users can collaborate
- ✅ Assign cards to any team member
- ✅ Role-based permissions (viewer, contributor, admin)
- ✅ Activity tracking across team
- ✅ Appears in "Team Boards" section

**Use Cases**:
- Sprint planning
- Project management
- Team task tracking
- Department workflows
- Cross-functional projects

## How It Works

### Workspaces

Every user automatically gets two workspace associations:

1. **Personal Workspace**
   - Created automatically on first personal board
   - Named "Your Name's Personal Workspace"
   - Only contains your personal boards
   - You are the owner

2. **ThoughtFox Workspace** (Organizational)
   - Shared with all @thoughtfox.io users
   - Contains all team/organizational boards
   - Workspace members can create boards
   - Role-based access control

### Board Creation Flow

**Creating a Personal Board**:
```typescript
POST /api/boards
{
  "name": "My Personal Tasks",
  "description": "Private todo list",
  "is_personal": true  // Key flag
}
```

**Creating an Organizational Board**:
```typescript
POST /api/boards
{
  "name": "Q1 Sprint Board",
  "description": "Team sprint planning",
  "is_personal": false  // Shared with workspace
}
```

### User Assignments

**Personal Boards**:
- Can only assign yourself to cards
- API enforces this via RLS policies
- Attempting to assign others fails silently

**Organizational Boards**:
- Can assign any workspace member
- Multiple users per card supported
- User avatars shown on cards
- Assignment notifications (coming soon)

## Database Schema

### Key Tables

**workspaces**:
```sql
type TEXT CHECK (type IN ('personal', 'organization'))
- 'personal': User's private workspace
- 'organization': Shared ThoughtFox workspace
```

**boards**:
```sql
is_personal BOOLEAN
- true: Private board in personal workspace
- false: Shared board in organizational workspace
```

**card_assignments**:
```sql
card_id → cards
user_id → users
- RLS enforces assignment rules based on board type
```

### Helper Functions

**get_or_create_personal_workspace(user_id)**:
- Returns UUID of user's personal workspace
- Creates if doesn't exist
- Idempotent and safe to call multiple times

**is_personal_board(board_id)**:
- Returns BOOLEAN
- Quick check for board privacy level

### RLS Policies

**Personal Boards**:
```sql
-- Can only view boards you created
SELECT: is_personal = TRUE AND created_by = current_user_id()

-- Can only edit your own personal boards
UPDATE: is_personal = TRUE AND created_by = current_user_id()

-- Can only delete your own personal boards
DELETE: is_personal = TRUE AND created_by = current_user_id()
```

**Organizational Boards**:
```sql
-- Can view if you're a board member
SELECT: can_access_board(board_id)

-- Can edit if you're a board admin
UPDATE: can_edit_board(board_id)

-- Can delete if you're a board admin
DELETE: is_board_admin(board_id, current_user_id())
```

## API Endpoints

### GET /api/boards

Fetch all accessible boards:

```bash
# All boards
GET /api/boards

# Only personal boards
GET /api/boards?type=personal

# Only organizational boards
GET /api/boards?type=organization
```

Response:
```json
{
  "boards": [
    {
      "id": "uuid",
      "name": "My Tasks",
      "is_personal": true,
      "workspace_type": "personal",
      "card_count": 12,
      "my_assigned_count": 8
    }
  ]
}
```

### GET /api/workspace-members

Fetch users for assignment:

```bash
# By workspace
GET /api/workspace-members?workspace_id=uuid

# By board (gets board's workspace members)
GET /api/workspace-members?board_id=uuid

# All accessible members
GET /api/workspace-members
```

Response:
```json
{
  "members": [
    {
      "id": "113058954775822825891",
      "full_name": "Ben Churchill",
      "email": "ben@thoughtfox.io",
      "avatar_url": "https://...",
      "role": "admin"
    }
  ]
}
```

## UI Components Needed

### Board Creation Page

**Toggle Component**:
```jsx
<RadioGroup value={boardType} onValueChange={setBoardType}>
  <div className="space-y-2">
    <RadioGroupItem value="personal">
      <Lock className="w-4 h-4" />
      <div>
        <div className="font-medium">Personal Board</div>
        <div className="text-sm text-muted-foreground">
          Only visible to you
        </div>
      </div>
    </RadioGroupItem>

    <RadioGroupItem value="team">
      <Users className="w-4 h-4" />
      <div>
        <div className="font-medium">Team Board</div>
        <div className="text-sm text-muted-foreground">
          Shared with ThoughtFox workspace
        </div>
      </div>
    </RadioGroupItem>
  </div>
</RadioGroup>
```

### Boards List Page

**Grouped Display**:
```jsx
<div className="space-y-8">
  <section>
    <h2 className="text-2xl font-bold mb-4">
      <Lock className="inline w-5 h-5 mr-2" />
      My Boards
    </h2>
    <BoardGrid boards={personalBoards} />
  </section>

  <section>
    <h2 className="text-2xl font-bold mb-4">
      <Users className="inline w-5 h-5 mr-2" />
      Team Boards
    </h2>
    <BoardGrid boards={organizationalBoards} />
  </section>
</div>
```

### Card Component

**Assignment Avatars** (Organizational Boards Only):
```jsx
{!board.is_personal && card.assignees.length > 0 && (
  <div className="flex -space-x-2">
    {card.assignees.map(user => (
      <Avatar key={user.id} className="w-6 h-6 border-2">
        <AvatarImage src={user.avatar_url} />
        <AvatarFallback>{user.full_name[0]}</AvatarFallback>
      </Avatar>
    ))}
  </div>
)}
```

### Assignment Dialog

**For Organizational Boards**:
```jsx
<Command>
  <CommandInput placeholder="Search team members..." />
  <CommandList>
    {workspaceMembers.map(member => (
      <CommandItem
        key={member.id}
        onSelect={() => assignUser(member.id)}
      >
        <Avatar className="w-8 h-8 mr-2">
          <AvatarImage src={member.avatar_url} />
          <AvatarFallback>{member.full_name[0]}</AvatarFallback>
        </Avatar>
        <div>
          <div className="font-medium">{member.full_name}</div>
          <div className="text-sm text-muted-foreground">
            {member.email}
          </div>
        </div>
      </CommandItem>
    ))}
  </CommandList>
</Command>
```

## Testing

### Test Personal Board Privacy

1. **User A** creates personal board "A's Tasks"
2. **User B** tries to access via API:
   ```bash
   GET /api/boards
   # Should NOT see "A's Tasks"
   ```
3. **User A** can see their own board:
   ```bash
   GET /api/boards?type=personal
   # Should see "A's Tasks"
   ```

### Test Organizational Board Sharing

1. **User A** creates org board "Sprint Planning"
2. **User B** can see it:
   ```bash
   GET /api/boards?type=organization
   # Should see "Sprint Planning"
   ```
3. **User B** can be assigned to cards on that board

### Test Assignment Rules

**Personal Board**:
```bash
POST /api/cards/{card_id}/assign
{
  "user_id": "different_user_id"  # Should fail via RLS
}
```

**Organizational Board**:
```bash
POST /api/cards/{card_id}/assign
{
  "user_id": "any_workspace_member_id"  # Should succeed
}
```

## Migration Checklist

- [ ] Run migration 006
- [ ] Test personal board creation
- [ ] Test organizational board creation
- [ ] Verify RLS policies work (try accessing other users' personal boards)
- [ ] Test user assignment on both board types
- [ ] Update UI to show board type toggle
- [ ] Add assignment UI for organizational boards
- [ ] Test Google Tasks sync with personal boards
- [ ] Document team onboarding process

## FAQ

**Q: What happens to existing boards?**
A: All existing boards are marked as `is_personal = FALSE` by default, making them organizational boards visible to all workspace members.

**Q: Can I convert a personal board to organizational?**
A: Not yet - this feature is coming soon. For now, create a new board of the desired type.

**Q: Do personal boards sync with Google Tasks?**
A: Yes! Personal boards can be mapped to your Google Task Lists just like organizational boards.

**Q: Can I be a member of multiple organizations?**
A: The current implementation supports one organization (ThoughtFox) plus your personal workspace. Multi-organization support is planned for a future release.

**Q: What's the difference between workspace members and board members?**
A:
- **Workspace members**: Users who belong to the ThoughtFox organization
- **Board members**: Specific role on a board (viewer, contributor, admin)
- All workspace members automatically have access to organizational boards
- Personal boards ignore workspace membership

**Q: Can admins see my personal boards?**
A: No. Personal boards are private to the creator via RLS policies enforced at the database level. Even database admins would need to bypass RLS to see them.
