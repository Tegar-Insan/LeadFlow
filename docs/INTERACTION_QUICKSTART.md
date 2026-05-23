# Interaction Messaging Module - Quick Start

## What Was Implemented?

Internal user-to-user messaging system for LeadFlow. Marketing staff and business owners can now send/receive direct messages within the platform.

## Files You Need to Know

### Backend Core
```
src/routes/interactionRoutes.ts        ← Mount point for messaging routes
src/controllers/InteractionMessageController.ts  ← HTTP handlers
src/services/interactionService.ts     ← Business logic
src/models/InternalMessage.ts          ← Database queries
src/validators/interactionValidator.ts ← Input validation
```

### Frontend
```
src/pages/interaction/InteractionPage.tsx       ← Main page
src/components/interaction/DMCard.tsx           ← User list
src/components/interaction/InteractionInbox.tsx ← Chat area
src/components/interaction/ReplyBox.tsx         ← Message input
src/hooks/useInteraction.ts                     ← State management
```

### Database
```
database/migrations/018_create_internal_messages.sql
```

## Running Locally

### 1. Apply Database Migration
```bash
# If using Supabase CLI
supabase db push

# Or manually run in Supabase SQL Editor:
# Copy-paste: database/migrations/018_create_internal_messages.sql
```

### 2. Start Backend (port 5000)
```bash
cd backend
npm run dev
```

### 3. Start Frontend (port 5173)
```bash
cd frontend
npm run dev
```

### 4. Test the Feature
1. Open http://localhost:5173
2. Log in as marketing_staff
3. Click "Messages" in sidebar
4. Send a message
5. Switch user role to business_owner and verify message received

## API Endpoints

```
GET    /api/message                  - Get all conversations
GET    /api/message/:userId          - Get message history
POST   /api/message                  - Send message
DELETE /api/message/:messageId       - Delete message
GET    /api/message/unread/count     - Get unread count
```

## Usage in Components

```typescript
// In any component
import { useInteraction } from '../hooks/useInteraction';

function MyComponent() {
  const { messages, conversations, sendMessage, loading } = useInteraction();
  
  return (
    // Use the data...
  );
}
```

## Key Features

✅ User-to-user messaging
✅ Automatic message read status
✅ Unread count tracking
✅ Permission-based access (RLS)
✅ Responsive mobile design
✅ Auto-refresh every 30 seconds
✅ Error handling
✅ TypeScript support

## Troubleshooting

### Messages not appearing?
1. Check browser console for errors
2. Verify token in localStorage: `console.log(localStorage.getItem('token'))`
3. Check backend logs for API errors

### Permission denied errors?
1. Verify user role (marketing_staff or business_owner)
2. Check RLS policies in Supabase
3. Ensure authenticated user matches request

### Database errors?
1. Verify migration ran: `SELECT * FROM internal_messages;`
2. Check Supabase logs
3. Verify connection string in .env

## Next Steps

- [ ] Add WebSocket for real-time messaging
- [ ] Add message attachments
- [ ] Add message search
- [ ] Add typing indicators
- [ ] Add voice/video calls

See `INTERACTION_IMPLEMENTATION_GUIDE.md` for full documentation.
