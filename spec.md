# Nibba Nibbi

## Current State
Chat has sendMessage and getConversationsWithUser backend functions. Message type has: from, to, content, timestamp, isRead fields. No delete functionality exists.

## Requested Changes (Diff)

### Add
- `isDeletedForEveryone: Bool` field to Message type
- `deleteMessageForEveryone(recipient: Principal, timestamp: Int)` backend function — marks message as deleted for both users
- Frontend: long-press (mobile) and right-click (desktop) on own messages shows context menu with "Delete for Everyone" option
- Frontend: deleted messages show "This message was deleted" placeholder (grey italic) for receiver; sender sees nothing (empty/removed)

### Modify
- Message type to include isDeletedForEveryone field
- getConversationsWithUser to return messages with isDeletedForEveryone
- ChatPage to handle deleted message display and deletion UI

### Remove
Nothing removed.

## Implementation Plan
1. Update Message type with isDeletedForEveryone field
2. Update sendMessage to set isDeletedForEveryone = false by default
3. Add deleteMessageForEveryone function that finds message by timestamp+sender and marks it deleted
4. Frontend: add long-press/right-click handler on own messages
5. Frontend: show context menu with "Delete for Everyone"
6. Frontend: render deleted messages as placeholder or hidden based on role
