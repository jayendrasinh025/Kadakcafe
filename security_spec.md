# Security Specification — MenuStudio (Kadak Café QR Menu)

## 1. Data Invariants
1. **Public Read-Only Menu Access**: Customers scanning a table QR code must be able to read `restaurant_settings`, `menu_categories`, `menu_items`, and `tables` without authentication (`allow get, list: if true;`), and no customer PII is stored in any collection.
2. **Strict Owner Write Isolation**: Only an authenticated, email-verified owner (`isOwnerOrAdmin()`) can create, update, or delete documents in `restaurant_settings`, `menu_categories`, `menu_items`, and `tables`.
3. **Strict Schema & Volumetric Validation**: Every create and update operation must pass `isValidRestaurantSettings`, `isValidMenuCategory`, `isValidMenuItem`, or `isValidRestaurantTable`, enforcing exact key allowlists (`hasAll` and `hasOnly`), string `.size()` bounds, regex patterns, numeric bounds, and server timestamp integrity (`updatedAt == request.time`).
4. **Relational Integrity**: Creating or updating a `menu_items` document requires `exists(/databases/$(database)/documents/menu_categories/$(incoming().categoryId))` so no orphaned menu item can reference a non-existent category.

## 2. The "Dirty Dozen" Payloads
1. **Unauthenticated Menu Mutation**: `auth = null`, `POST /menu_items/item_1` -> `PERMISSION_DENIED`.
2. **Unverified Email Admin Spoof**: `auth = { uid: 'u1', token: { email: 'vaghelajayendra031@gmail.com', email_verified: false } }` -> `PERMISSION_DENIED`.
3. **Owner ID Spoofing on Create**: `auth.uid = 'u1'`, `incoming().ownerId = 'u2'` -> `PERMISSION_DENIED`.
4. **Owner ID Mutation on Update**: `existing().ownerId = 'u1'`, `incoming().ownerId = 'u2'` -> `PERMISSION_DENIED`.
5. **Shadow / Ghost Field Injection**: `incoming()` includes `isVerified: true` not in `hasOnly` allowlist -> `PERMISSION_DENIED`.
6. **Denial-of-Wallet Oversized String**: `incoming().name` with 5,000 characters (`> 100`) -> `PERMISSION_DENIED`.
7. **ID Poisoning**: Document path ID containing spaces or special characters failing `^[a-zA-Z0-9_\-]+$` -> `PERMISSION_DENIED`.
8. **Orphaned Menu Item Category**: `incoming().categoryId = 'non_existent_cat'` where category document does not exist -> `PERMISSION_DENIED`.
9. **Negative Menu Item Price**: `incoming().price = -50` -> `PERMISSION_DENIED`.
10. **Forged Client Timestamp**: `incoming().updatedAt != request.time` -> `PERMISSION_DENIED`.
11. **Invalid Enum Value**: `restaurant_settings.secondaryActionType = 'hack'` (not in `['waiter', 'whatsapp', 'call', 'disabled']`) -> `PERMISSION_DENIED`.
12. **Value Poisoning on Partial Update**: Updating `price` with a string `'free'` instead of a non-negative number -> `PERMISSION_DENIED`.
