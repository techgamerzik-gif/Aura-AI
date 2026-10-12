# Security Specification: AURA Executive AI Firestore Rules

## 1. Data Invariants
1. **Identity Isolation**: All documents in `/events`, `/tasks`, and `/docs` must contain a `userId` field that strictly equals `request.auth.uid`. No user can read, create, modify, or delete another executive's records.
2. **User Profile Protection**: In `/users/{userId}`, the document ID `{userId}` must equal `request.auth.uid`. Only the authenticated user can access their own profile.
3. **No Unauthenticated Access**: Default-deny catch-all rule `match /{document=**} { allow read, write: if false; }`.
4. **Validation Blueprints**: Writes must validate required keys, string length bounds, and valid document IDs (`^[a-zA-Z0-9_\\-]+$`).
5. **No Client-Delegated Query Security**: Every collection queried via list queries enforces `resource.data.userId == request.auth.uid`.

## 2. The Dirty Dozen Payloads (Designed to break laws of Identity and State)
1. **Payload 1 (Identity Spoofing on Create)**: Trying to write an event with `userId: "attacker_uid"`. Must return `PERMISSION_DENIED`.
2. **Payload 2 (Cross-User List Scraping)**: Attempting to query `/events` or `/tasks` without matching `userId == request.auth.uid`. Must return `PERMISSION_DENIED`.
3. **Payload 3 (Unauthenticated Read)**: Querying `/events` with `request.auth == null`. Must return `PERMISSION_DENIED`.
4. **Payload 4 (Path Poisoning Attack)**: Injecting a 2KB junk character string into document path `{eventId}`. Must return `PERMISSION_DENIED`.
5. **Payload 5 (Shadow Update / Ghost Fields)**: Attempting to update a task adding `{ "isAdmin": true, "elevated": true }`. Must return `PERMISSION_DENIED`.
6. **Payload 6 (Owner Tampering on Update)**: Updating an event to change its `userId` to someone else. Must return `PERMISSION_DENIED`.
7. **Payload 7 (Denial of Wallet - Giant Payload)**: Injecting a 500KB string into the `title` field. Must return `PERMISSION_DENIED`.
8. **Payload 8 (Foreign Profile Access)**: Reading `/users/{otherUserId}`. Must return `PERMISSION_DENIED`.
9. **Payload 9 (Unauthenticated Task Delete)**: Calling `deleteDoc(doc(db, "tasks", "task-1"))` as an anonymous or foreign user. Must return `PERMISSION_DENIED`.
10. **Payload 10 (Schema Violation on Create)**: Attempting to create an event missing the required `timeStart` or `timeEnd`. Must return `PERMISSION_DENIED`.
11. **Payload 11 (Empty Title Injection)**: Attempting to write an event with an empty title `""`. Must return `PERMISSION_DENIED`.
12. **Payload 12 (Foreign Document Overwrite)**: Attempting to update or overwrite `/docs/{foreignDocId}`. Must return `PERMISSION_DENIED`.
