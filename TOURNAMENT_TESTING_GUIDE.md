# Tournament Management System - Testing Guide

## 🧪 How to Test the Implementation

### Prerequisites

1. Have at least 2 arbiter accounts created (to test isolation)
2. Have at least 1 player account created (to test access control)
3. Clear localStorage before testing: `localStorage.clear()`

---

## Test Scenario 1: Create Tournament as Draft

**Steps:**

1. Log in as Arbiter 1 (e.g., `arbiter1@test.com`)
2. Navigate to Create Tournament page
3. Fill in all required fields across 3 steps:
   - **Step 1**: Tournament name, dates, venue, contact info
   - **Step 2**: Game settings, prizes, tie-breakers
   - **Step 3**: Details, IDs, verification
4. Click "Save as Draft" button

**Expected Results:**

- ✅ Success toast: "Tournament saved as draft!"
- ✅ Redirected to `/orbiter/manage`
- ✅ Tournament appears with "Draft" badge
- ✅ Tournament has Edit, Publish, View, Delete buttons

---

## Test Scenario 2: Create Tournament as Published

**Steps:**

1. While logged in as Arbiter 1
2. Navigate to Create Tournament page
3. Fill in all required fields
4. Click "Publish Tournament" button

**Expected Results:**

- ✅ Success toast: "Tournament published successfully!"
- ✅ Redirected to `/orbiter/manage`
- ✅ Tournament appears with "Published" badge (green)
- ✅ Tournament has Edit, Unpublish, View, Delete buttons

---

## Test Scenario 3: Arbiter Isolation (Critical)

**Steps:**

1. Log in as Arbiter 1
2. Create 2 tournaments (any status)
3. Log out
4. Log in as Arbiter 2
5. Navigate to Manage Tournaments page

**Expected Results:**

- ✅ Arbiter 2 sees 0 tournaments
- ✅ "No Tournaments Yet" empty state is shown
- ✅ Arbiter 1's tournaments are NOT visible

---

## Test Scenario 4: Access Control for Players

**Steps:**

1. Log in as Player
2. Try to navigate to `/orbiter/manage`

**Expected Results:**

- ✅ Access denied toast: "Access denied. Only arbiters can manage tournaments."
- ✅ Redirected to home page

---

## Test Scenario 5: Publish/Unpublish Toggle

**Steps:**

1. Log in as Arbiter 1
2. Create a draft tournament
3. Click "Publish" button
4. Confirm in dialog
5. After success, click "Unpublish" button
6. Confirm in dialog

**Expected Results:**

- ✅ After publish: Badge changes to "Published" (green)
- ✅ Success toast: "Tournament published successfully"
- ✅ Button changes to "Unpublish"
- ✅ After unpublish: Badge changes to "Draft" (gray outline)
- ✅ Success toast: "Tournament unpublished"
- ✅ Button changes back to "Publish"

---

## Test Scenario 6: Edit Tournament

**Steps:**

1. Log in as Arbiter 1
2. Create a tournament
3. Click "Edit" button
4. Modify tournament name
5. Click "Publish Tournament" or "Save as Draft"

**Expected Results:**

- ✅ Form is pre-filled with existing data
- ✅ Query param shows: `?edit={tournamentId}`
- ✅ Success toast: "Tournament updated successfully!"
- ✅ Changes are reflected in the tournament card

---

## Test Scenario 7: Delete Tournament

**Steps:**

1. Log in as Arbiter 1
2. Create a draft tournament
3. Click "Delete" button
4. Confirm deletion in dialog

**Expected Results:**

- ✅ Confirmation dialog appears
- ✅ Dialog shows tournament name
- ✅ After confirmation: Success toast "Tournament deleted successfully"
- ✅ Tournament removed from list
- ✅ Tournament count updated

---

## Test Scenario 8: Cannot Delete Active Tournament

**Steps:**

1. Create a tournament
2. Change its status to "active" (manually via localStorage or in code)
3. Refresh the Manage page

**Expected Results:**

- ✅ Delete button is NOT visible for active tournament
- ✅ Only Edit and View buttons are shown

---

## Test Scenario 9: Multiple Tournaments Display

**Steps:**

1. Log in as Arbiter 1
2. Create 5 different tournaments with various statuses:
   - 2 drafts
   - 2 published
   - 1 active (manually set)

**Expected Results:**

- ✅ All 5 tournaments appear in grid layout
- ✅ Each shows correct status badge
- ✅ Tournament count shows "5 Tournaments"
- ✅ Correct action buttons for each based on status

---

## Test Scenario 10: View Tournament Summary

**Steps:**

1. Log in as Arbiter 1
2. Create a tournament
3. Click "View" button

**Expected Results:**

- ✅ Navigated to `/arbiter/tournament/{id}/summary`
- ✅ Tournament details page loads
- ✅ All tournament information is displayed

---

## 🔍 Data Verification

### Check localStorage Data

Open browser console and run:

```javascript
// Get all tournaments
JSON.parse(localStorage.getItem("tournaments"));

// Get current user
JSON.parse(localStorage.getItem("userData"));

// Verify createdBy field matches user email
const tournaments = JSON.parse(localStorage.getItem("tournaments"));
const user = JSON.parse(localStorage.getItem("userData"));
console.log("User:", user.email);
tournaments.forEach((t) => {
  console.log("Tournament:", t.name, "CreatedBy:", t.createdBy);
});
```

---

## 📊 Expected Data Structure

### Tournament Object

```javascript
{
  id: "t_1709097600000_abcd1234",
  name: "Grand Tournament 2026",
  status: "draft" | "upcoming" | "active" | "completed",
  createdBy: "arbiter1@test.com",
  createdAt: "2026-02-28T10:00:00.000Z",
  startDate: "2026-03-15",
  registrationType: "Free" | "Paid",
  isRated: true | false,
  maxPlayers: "64",
  registeredPlayers: [],
  // ... other fields
}
```

---

## 🐛 Common Issues & Fixes

### Issue 1: "User email not found"

**Cause**: localStorage userData is corrupted or missing  
**Fix**: Log in again or manually set userData:

```javascript
localStorage.setItem(
  "userData",
  JSON.stringify({
    email: "arbiter@test.com",
    role: "arbiter",
  }),
);
```

### Issue 2: Tournaments not appearing

**Cause**: Email mismatch between user and tournament  
**Fix**: Check that `userData.email === tournament.createdBy`

### Issue 3: Access denied even as arbiter

**Cause**: Role not set correctly in localStorage  
**Fix**: Verify role field:

```javascript
const user = JSON.parse(localStorage.getItem("userData"));
console.log("Role:", user.role); // Should be "arbiter"
```

### Issue 4: Changes not reflecting

**Cause**: Component not reloading data  
**Fix**: Refresh the page or check that `loadTournaments()` is called

---

## ✅ Success Criteria Checklist

- [ ] Draft tournaments save correctly
- [ ] Published tournaments are marked as "upcoming" status
- [ ] Only creator arbiter can see their tournaments
- [ ] Other arbiters cannot see tournaments they didn't create
- [ ] Players cannot access Manage page
- [ ] Publish/Unpublish works correctly
- [ ] Edit pre-fills form data
- [ ] Delete removes tournament
- [ ] Active/Completed tournaments cannot be deleted
- [ ] View navigates to correct summary page
- [ ] Empty state shows when no tournaments exist
- [ ] Tournament count badge is accurate
- [ ] All badges display correctly (Status, Paid/Free, Rated)

---

## 🎯 Performance Testing

1. **Load Test**: Create 50+ tournaments and verify page loads smoothly
2. **Filter Test**: Verify filtering is fast with large dataset
3. **Action Speed**: Ensure CRUD operations complete within 500ms

---

**Testing Completed By**: ******\_******  
**Date**: ******\_******  
**Status**: [ ] Pass [ ] Fail  
**Notes**: **********************\_**********************
