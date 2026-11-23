# BatchVerse Security Specification

## 1. Data Invariants
1. **Admin Authority**: Only a Google-authenticated user (`email_verified == true`) can create a `SchoolGroup`, and `adminUid` MUST match `request.auth.uid` and remain immutable after creation.
2. **Global Group Isolation**: `inviteCodes` cannot be listed (preventing scraping of all global schools); clients can only `get` a specific 5-digit numeric code (`^[0-9]{5}$`). `groups` can only be listed by their own `adminUid`.
3. **Vacant-Only Claiming & Atomic Secret Binding**: A student without logging in can claim a seat `groups/{groupId}/seats/{seatId}` ONLY if the parent group exists, is not locked (`isLocked == false`), the seat document does not already exist, and a matching write-only `seatSecrets/{seatId}` document is written in the same atomic batch.
4. **4-Digit Personal Edit PIN Protection**: `groups/{groupId}/seatSecrets/{seatId}` is strictly unreadable (`allow read: if false;`). Updating, vacating (deleting), or drag-moving an occupied seat requires either:
   - The caller is the group's verified Admin (`request.auth.uid == group.adminUid`), OR
   - In the exact same atomic batch, the caller updates `seatSecrets/{seatId}` with `proofPinHash == existing().pinHash` and `updatedAt == request.time`, verified via `getAfter()` on the seat rule.
5. **No Overwriting Occupied Seats on Drag-Move**: Moving to a target seat uses `create` on the target `seats/{targetSeatId}`, which Firestore rejects if the target seat is already occupied.
6. **Subcollection Safety for Graffiti & Teacher Notes**: Classmates can append Desk Graffiti notes (`seats/{seatId}/graffiti/{noteId}`) and Teacher Appreciation Notes (`teachers/{teacherId}/notes/{noteId}`) without receiving write access to the parent seat or teacher document.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Scrape All Invite Codes**: `list /inviteCodes` -> `PERMISSION_DENIED`.
2. **Scrape All School Groups**: `list /groups` without `where('adminUid', '==', auth.uid)` -> `PERMISSION_DENIED`.
3. **Spoof Group Admin on Create**: Create `/groups/g1` with `adminUid: "victim_uid"` while authenticated as `"attacker_uid"` -> `PERMISSION_DENIED`.
4. **Unverified Email Admin**: Create `/groups/g1` with `email_verified: false` -> `PERMISSION_DENIED`.
5. **Read Private Seat PIN Hash**: `get /groups/g1/seatSecrets/grade10_1` -> `PERMISSION_DENIED`.
6. **Edit Classmate's Seat Without PIN**: `update /groups/g1/seats/grade10_1` changing `fullName` without matching `proofPinHash` update on `seatSecrets/grade10_1` -> `PERMISSION_DENIED`.
7. **Vacate/Delete Classmate's Seat Without PIN**: `delete /groups/g1/seats/grade10_1` without matching `seatSecrets/grade10_1` proof update -> `PERMISSION_DENIED`.
8. **Claim Seat in Locked Classroom**: `create /groups/g1/seats/grade10_5` while `groups/g1.isLocked == true` -> `PERMISSION_DENIED`.
9. **Claim Seat Without PIN Secret (Orphaned Write)**: `create /groups/g1/seats/grade10_5` without creating/updating `seatSecrets/grade10_5` in the same batch -> `PERMISSION_DENIED`.
10. **Shadow Field Injection**: `create /groups/g1/seats/grade10_5` including unexpected ghost key `isAdmin: true` -> `PERMISSION_DENIED`.
11. **Non-Admin Teacher Mutation**: `create /groups/g1/teachers/t1` by an unauthenticated student or non-admin user -> `PERMISSION_DENIED`.
12. **Client Timestamp Forgery / ID Poisoning**: `create /groups/g1/seats/../../bad` or `createdAt` not equal to `request.time` -> `PERMISSION_DENIED`.
