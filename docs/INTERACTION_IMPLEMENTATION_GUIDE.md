# LeadFlow Interaction Messaging Module - Implementation Guide

## Overview
Successfully implemented internal user-to-user messaging system for LeadFlow, enabling authenticated users (marketing staff and business owners) to communicate directly within the platform.

**Status**: ✅ COMPLETE (Phase 1)
**Date**: 2026-05-23
**Stack**: TypeScript/Node.js (backend), React/Tailwind (frontend), Supabase PostgreSQL

---

## Implementation Summary

### Backend Architecture
Following LeadFlow's layered architecture pattern:

```
Routes → Controllers → Services → Models → Database
   ↓          ↓            ↓         ↓         ↓
Validation   HTTP Handlers Business Logic DB Queries
```

### 1. Database Layer (Infrastructure)
**File**: `database/migrations/018_create_internal_messages.sql`

**Table**: `internal_messages`
- `id` (UUID, Primary Key)
- `sender_id` (FK → users)
- `receiver_id` (FK → users)
- `message_text` (TEXT)
- `is_read` (BOOLEAN)
- `created_at`, `updated_at` (TIMESTAMPTZ)

**Features**:
- ✅ Automatic timestamp management (`trigger_set_updated_at`)
- ✅ Performance indexes on (sender_id, receiver_id, created_at)
- ✅ Full-text search index for message content
- ✅ Row-Level Security (RLS) policies:
  - Marketing Staff: Full CRUD on their own messages
  - Business Owner: Full CRUD on their own messages
  - Admin: Read-only access (auditing)

**RLS Policies**:
```sql
-- Each role can only see messages where they are sender OR receiver
-- Each user can only send/modify their own messages
```

### 2. Types Layer
**File**: `src/types/index.ts`

```typescript
// DTOs (Data Transfer Objects)
interface InternalMessageDTO {
  id: string;
  senderId: string;
  receiverId: string;
  messageText: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ConversationDTO {
  userId: string;
  userName: string;
  userEmail: string;
  latestMessage?: string;
  latestMessageTime?: string;
  unreadCount: number;
}
```

### 3. Model Layer (Data Access)
**File**: `src/models/InternalMessage.ts`

Core functions:
- `getConversation(userId1, userId2, limit, offset)` - Message history between two users
- `getUserConversations(userId)` - List all conversations
- `sendMessage(senderId, receiverId, messageText)` - Create message
- `markAsRead(messageId)` - Update read status
- `getMessageById(messageId)` - Fetch single message
- `deleteMessage(messageId)` - Delete message
- `getUnreadCount(userId)` - Count unread messages

### 4. Validation Layer
**File**: `src/validators/interactionValidator.ts`

Validation functions:
- `validateSendMessage(body)` - Validates receiver, message text (1-5000 chars)
- `validateDeleteMessage(body)` - Validates message ID
- `validateGetMessagesQuery(query)` - Validates pagination (limit 1-100)
- `validateDifferentUsers(senderId, receiverId)` - Prevents self-messaging
- `validateDeletePermission(senderId, userId)` - Ensures sender is deletor

### 5. Service Layer (Business Logic)
**File**: `src/services/interactionService.ts`

High-level operations:
- `getConversations(userId)` - Get all conversations with users
- `getMessages(userId, recipientId, limit, offset)` - Fetch message history + auto-mark read
- `sendMessage(userId, request)` - Send message with validation
- `deleteMessage(userId, messageId)` - Delete with permission check
- `getUnreadCount(userId)` - Count unread messages

**Key Features**:
- Automatic marking of received messages as read when retrieved
- Error handling with proper HTTP status codes
- Logging of all operations
- User existence verification before operations

### 6. Controller Layer (HTTP Handlers)
**File**: `src/controllers/InteractionMessageController.ts`

Endpoints:
- `GET /api/message` → `getConversations` - All conversations
- `GET /api/message/:userId` → `getMessages` - History with user
- `POST /api/message` → `sendMessage` - Send message
- `DELETE /api/message/:messageId` → `deleteMessage` - Delete message
- `GET /api/message/unread/count` → `getUnreadCount` - Unread count

### 7. Routes
**File**: `src/routes/interactionRoutes.ts`

```
/api/message                    GET     → getConversations
/api/message/unread/count       GET     → getUnreadCount (priority route)
/api/message/:userId            GET     → getMessages
/api/message                    POST    → sendMessage
/api/message/:messageId         DELETE  → deleteMessage
```

**Note**: All routes require `authMiddleware` authentication

**Mounted in**: `src/app.ts` line 119: `app.use('/api/message', interactionRoutes);`

---

## Frontend Architecture

### 1. Types
**File**: `src/types/interaction.ts`

Frontend-specific DTOs matching backend responses

### 2. Hook (State Management)
**File**: `src/hooks/useInteraction.ts`

```typescript
useInteraction() → {
  messages: InternalMessageDTO[]
  conversations: ConversationDTO[]
  currentRecipient: ConversationDTO | null
  loading: boolean
  error: string | null
  getConversations(): Promise<void>
  getMessages(recipientId): Promise<void>
  sendMessage(recipientId, messageText): Promise<void>
  deleteMessage(messageId): Promise<void>
  selectConversation(recipientId): void
  clearError(): void
  unreadCount: number
  getUnreadCount(): Promise<void>
}
```

**Features**:
- Auto-fetches conversations on mount
- Auto-refreshes every 30 seconds
- Error handling with clearable error state
- Loading states for async operations
- Automatic unread count tracking

### 3. Components

#### DMCard.tsx (User List Item)
- Displays single conversation
- Shows latest message preview
- Displays unread badge
- Responsive with timestamp
- Click to select conversation

#### InteractionInbox.tsx (Chat Area)
- Displays message history
- Auto-scroll to newest messages
- Shows timestamps for each message
- Delete button on own messages (hover)
- Empty state messaging
- Loading indicator

#### ReplyBox.tsx (Input Area)
- Textarea with auto-resize (max 120px)
- Character counter (max 5000)
- Send on Ctrl+Enter / Cmd+Enter
- Error display (empty/too long)
- Loading state on send button
- Disabled state management

#### InteractionPage.tsx (Main Page)
- Desktop: Sidebar + Main chat layout
- Mobile: Toggle sidebar (responsive)
- Header with conversation info
- Unread count display
- Error banner with dismiss
- Empty state when no conversation selected

---

## API Specification

### Authentication
All endpoints require:
```
Header: Authorization: Bearer <access_token>
```

### GET /api/message
Get all conversations for authenticated user

**Response** (200):
```json
{
  "success": true,
  "message": "Conversations retrieved successfully",
  "data": {
    "conversations": [
      {
        "userId": "uuid",
        "userName": "John Doe",
        "userEmail": "john@example.com",
        "latestMessage": "How are you?",
        "latestMessageTime": "2026-05-23T10:30:00.000Z",
        "unreadCount": 2
      }
    ]
  }
}
```

### GET /api/message/:userId
Get message history with specific user

**Query Parameters**:
- `recipientId` (required) - User to get messages with
- `limit` (optional, default: 50, max: 100)
- `offset` (optional, default: 0)

**Response** (200):
```json
{
  "success": true,
  "message": "Messages retrieved successfully",
  "data": {
    "messages": [
      {
        "id": "uuid",
        "senderId": "uuid",
        "receiverId": "uuid",
        "messageText": "Hello!",
        "isRead": true,
        "createdAt": "2026-05-23T10:30:00.000Z",
        "updatedAt": "2026-05-23T10:30:00.000Z"
      }
    ]
  }
}
```

### POST /api/message
Send a new message

**Body**:
```json
{
  "receiverId": "uuid",
  "messageText": "Your message here"
}
```

**Response** (201):
```json
{
  "success": true,
  "message": "Message sent successfully",
  "data": {
    "message": {
      "id": "uuid",
      "senderId": "uuid",
      "receiverId": "uuid",
      "messageText": "Your message here",
      "isRead": false,
      "createdAt": "2026-05-23T10:30:00.000Z",
      "updatedAt": "2026-05-23T10:30:00.000Z"
    }
  }
}
```

### DELETE /api/message/:messageId
Delete a message (sender only)

**Response** (200):
```json
{
  "success": true,
  "message": "Message deleted successfully"
}
```

### GET /api/message/unread/count
Get total unread message count

**Response** (200):
```json
{
  "success": true,
  "message": "Unread count retrieved successfully",
  "data": {
    "unreadCount": 5
  }
}
```

---

## Error Handling

### HTTP Status Codes

| Status | Scenario | Cause |
|--------|----------|-------|
| 400 | Bad Request | Validation failed (empty message, invalid ID, etc.) |
| 401 | Unauthorized | Missing/invalid auth token |
| 403 | Forbidden | User not sender (delete), etc. |
| 404 | Not Found | Message/recipient doesn't exist |
| 500 | Server Error | Database error, unhandled exception |

### Example Error Response
```json
{
  "success": false,
  "message": "messageText cannot exceed 5000 characters",
  "statusCode": 400
}
```

---

## Deployment Checklist

### Database
- [ ] Run migration 018: `018_create_internal_messages.sql`
- [ ] Verify RLS policies are enabled
- [ ] Test with `SELECT COUNT(*) FROM internal_messages;`

### Backend
- [ ] `npm run build` - TypeScript compilation succeeds
- [ ] `npm test` - All tests pass
- [ ] `npm run dev` - Server starts on port 5000
- [ ] Test endpoints with Postman/curl

### Frontend
- [ ] `npm run build` - Vite build succeeds
- [ ] Components render without errors
- [ ] Test message send/receive flow
- [ ] Verify responsive design on mobile

### Environment Variables
**Backend** (`.env`):
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
DATABASE_URL=postgresql://...
```

**Frontend** (`.env`):
```
VITE_API_BASE_URL=http://localhost:5000
```

---

## Testing Guide

### Manual Testing (Frontend)
1. **Login** as marketing_staff and business_owner
2. **Send message** from staff to owner
3. **Verify** message appears in both conversations
4. **Delete message** - only sender can delete
5. **Refresh page** - verify messages persist
6. **Unread count** - verify increments correctly

### API Testing (curl)

```bash
# Get conversations
curl -X GET http://localhost:5000/api/message \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get messages with user
curl -X GET "http://localhost:5000/api/message/USER_ID?recipientId=OTHER_USER_ID&limit=50" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Send message
curl -X POST http://localhost:5000/api/message \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"receiverId": "USER_ID", "messageText": "Hello!"}'

# Delete message
curl -X DELETE http://localhost:5000/api/message/MESSAGE_ID \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get unread count
curl -X GET http://localhost:5000/api/message/unread/count \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Performance Optimization

### Indexes
- `(sender_id, receiver_id)` - Fast conversation lookup
- `(receiver_id)` - Unread count queries
- `(created_at DESC)` - Recent message retrieval
- `message_text gin_trgm_ops` - Full-text search (future)

### Pagination
- Default limit: 50 messages
- Max limit: 100 messages
- Prevents loading entire conversation at once

### Auto-Refresh
- Frontend refreshes conversations every 30 seconds
- Prevents stale data without real-time overhead
- Can be upgraded to WebSocket later

---

## Future Enhancements (Phase 2+)

### Immediate Next Steps
- [ ] Message read receipts (per-message status)
- [ ] Typing indicators
- [ ] Message search within conversation
- [ ] Soft delete with retention period
- [ ] Message reactions/emojis

### Advanced Features
- [ ] WebSocket for real-time messaging
- [ ] Voice/video call integration
- [ ] Message attachments (images, files)
- [ ] Group conversations
- [ ] Message encryption
- [ ] Archive conversations
- [ ] Mute notifications

### Integration
- [ ] TikTok comment management (UC011/UC012)
- [ ] Message notifications (email/SMS)
- [ ] Unread message badge in navbar
- [ ] Dark theme (already in place)

---

## Files Modified/Created

### Backend
```
✅ database/migrations/018_create_internal_messages.sql (NEW)
✅ src/types/index.ts (MODIFIED)
✅ src/models/InternalMessage.ts (NEW)
✅ src/validators/interactionValidator.ts (NEW)
✅ src/services/interactionService.ts (NEW)
✅ src/controllers/InteractionMessageController.ts (NEW)
✅ src/routes/interactionRoutes.ts (NEW)
✅ src/app.ts (MODIFIED - added route mount)
```

### Frontend
```
✅ src/types/interaction.ts (NEW)
✅ src/hooks/useInteraction.ts (NEW)
✅ src/components/interaction/DMCard.tsx (NEW)
✅ src/components/interaction/InteractionInbox.tsx (NEW)
✅ src/components/interaction/ReplyBox.tsx (NEW)
✅ src/pages/interaction/InteractionPage.tsx (NEW)
```

---

## References

- Architecture: LeadFlow MVC Layered Pattern (Backend)
- React Patterns: Hooks + Context (Frontend)
- DB: PostgreSQL RLS with Supabase
- Testing: Jest (backend), Vitest (frontend)
- TypeScript: Strict mode enabled

---

## Support

For issues or questions:
1. Check error messages in browser console (frontend)
2. Check server logs in terminal (backend)
3. Verify database migrations ran successfully
4. Ensure authentication token is valid
5. Review RLS policies are enabled on table
