# Cart Persistence Fix

## Issue Summary
The shopping cart was not persisting items after navigation. When a guest user added an item to their cart and navigated to the cart page, the cart appeared empty.

## Root Cause
The issue was in the frontend state management (`vitereact/src/store/main.tsx`). The cart state management had several critical problems:

1. **No Session ID Generation**: Guest users had no `session_id` generated, so the backend couldn't associate cart items with the same session across requests
2. **Missing cart_id Storage**: When items were added to the cart, the `cart_id` returned by the backend was not captured or stored
3. **Incomplete Request Parameters**: Cart GET requests didn't pass the `session_id` or `cart_id`, causing the backend to create new carts or return empty results

## The Fix

### 1. Added `cart_id` to CartState Interface
```typescript
interface CartState {
  // ... existing fields
  cart_id: string | null;  // NEW
}
```

### 2. Created Session ID Generator
Added a utility function to generate and persist guest session IDs:
```typescript
const getOrCreateSessionId = (): string => {
  const storageKey = 'guest-session-id';
  let sessionId = localStorage.getItem(storageKey);
  
  if (!sessionId) {
    sessionId = `guest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(storageKey, sessionId);
  }
  
  return sessionId;
};
```

### 3. Updated `add_to_cart` Function
- Generates session_id for guest users before making the API call
- Captures and stores the `cart_id` from the response
- Passes both `session_id` and `cart_id` as query parameters

### 4. Updated `load_cart` Function
- Generates session_id for guest users if not present
- Passes both `session_id` and `cart_id` to the backend
- Stores `cart_id` from response for future requests

### 5. Updated Logout and Clear Cart
- Clears both `cart_id` and `session_id` from state
- Removes guest session ID from localStorage on logout

### 6. Updated Persistence Configuration
- Added `cart_id` to the persisted state fields

## How It Works Now

### For Guest Users:
1. When first adding to cart, a unique `session_id` is generated and stored in localStorage
2. The backend creates a cart with this `session_id`
3. The `cart_id` from the response is stored in the app state
4. All subsequent cart operations use both `session_id` and `cart_id` to maintain consistency
5. The cart persists across page refreshes and navigation

### For Authenticated Users:
1. Cart operations use the auth token
2. Backend associates cart with the user's `user_id`
3. Cart persists across sessions

## Testing
To test the fix:
1. Navigate to a product page as a guest
2. Select a size and add to cart
3. Click the cart icon or navigate to /cart
4. Verify the item appears in the cart
5. Refresh the page - cart should still contain the item
6. Close and reopen the browser - cart should persist

## Files Modified
- `/app/vitereact/src/store/main.tsx` - Main state management file
