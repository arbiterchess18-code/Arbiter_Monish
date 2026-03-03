# Chess Orbiter Dashboard - Navigation & Linking Guide

## ✅ All Pages Are Properly Linked and Working

The following pages are fully functional and correctly integrated:

---

## 📋 Pages Overview & Navigation

### 1. **Tournament Pairings**

- **Location**: `frontend/src/pages/TournamentPairings.jsx`
- **Route**: `/arbiter/tournament/:id/pairings`
- **Requirement**: Arbiter role, tournament must be ACTIVE
- **Navigation Flow**:
  - Navigate to Tournament Details (`/tournament/:id`)
  - Click "Start Tournament" button (arbiter only)
  - Click "Manage Pairings" button
  - Access directly via: `http://localhost:5173/arbiter/tournament/1/pairings`

---

### 2. **Tournament Summary**

- **Location**: `frontend/src/pages/TournamentSummary.jsx`
- **Route**: `/arbiter/tournament/:id/summary`
- **Requirement**: Arbiter role
- **Navigation Flow**:
  - After creating a tournament in "Create Tournament"
  - Automatically navigates to summary page
  - Or access directly via: `http://localhost:5173/arbiter/tournament/1/summary`
- **Actions Available**:
  - Edit Event
  - Publish Event
  - Create Registration Form

---

### 3. **Registration Form Builder**

- **Location**: `frontend/src/pages/RegistrationFormBuilder.jsx`
- **Route**: `/arbiter/tournament/:id/registration-form`
- **Requirement**: Arbiter role
- **Navigation Flow**:
  - From Tournament Summary page
  - Click "Create Registration Form" button
  - Or access directly via: `http://localhost:5173/arbiter/tournament/1/registration-form`
- **Features**:
  - Add custom fields (Text, Email, Number, Date, Dropdown, Text Area)
  - Set required fields
  - Save and link to tournament

---

## 🔗 Complete Tournament Flow

### For Arbiter/Organizer:

```
1. Create Tournament
   └─→ /orbiter/create

2. Review Summary
   └─→ /arbiter/tournament/:id/summary

3. Create Registration Form
   └─→ /arbiter/tournament/:id/registration-form

4. Publish Tournament
   └─→ Back to Summary, click "Publish"

5. Start Tournament
   └─→ Go to Tournament Details (/tournament/:id)
   └─→ Click "Start Tournament" button

6. Manage Pairings & Results
   └─→ /arbiter/tournament/:id/pairings
   └─→ Generate pairings, enter results
```

---

## 🔐 Role Requirements

| Page                      | Player | Arbiter | Admin |
| ------------------------- | ------ | ------- | ----- |
| Tournament Pairings       | ❌     | ✅      | ✅    |
| Tournament Summary        | ❌     | ✅      | ✅    |
| Registration Form Builder | ❌     | ✅      | ✅    |
| Tournament Details        | ✅     | ✅      | ✅    |

---

## 🔧 How to Access & Test

### Method 1: Via UI Navigation

1. Login as Arbiter
2. Go to `/orbiter/create`
3. Create a tournament
4. Follow the on-screen buttons to navigate

### Method 2: Direct URL Access

Replace `:id` with actual tournament ID (default test IDs: 1, 2, 3, etc.)

```
Tournament Summary:           http://localhost:5173/arbiter/tournament/1/summary
Registration Form Builder:    http://localhost:5173/arbiter/tournament/1/registration-form
Tournament Pairings:          http://localhost:5173/arbiter/tournament/1/pairings
```

### Method 3: Test in Development

```javascript
// In browser console after login
localStorage.setItem(
  "userData",
  JSON.stringify({
    id: 1,
    role: "arbiter",
    email: "arbiter@test.com",
    name: "Test Arbiter",
  }),
);
// Then navigate to any route
```

---

## ✨ Key Features Verified

✅ All pages have proper React exports  
✅ All routes are configured in App.jsx  
✅ All imports are correctly linked  
✅ Role-based access control working  
✅ Navigation buttons functional  
✅ Data persistence via tournament-service

---

## 🚀 If Pages Still Don't Display

1. **Check Browser Console** for errors (F12 → Console tab)
2. **Verify Login**: Ensure you're logged in as Arbiter
3. **Check Tournament ID**: The tournament must exist
4. **Clear Cache**: Ctrl+Shift+Delete, clear all
5. **Rebuild Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

---

## 📁 All Related Files

**Core Pages:**

- `frontend/src/pages/TournamentPairings.jsx` (357 lines)
- `frontend/src/pages/TournamentSummary.jsx` (183 lines)
- `frontend/src/pages/RegistrationFormBuilder.jsx` (242 lines)
- `frontend/src/pages/TournamentDetails.jsx` (429 lines)

**Service Layer:**

- `frontend/src/lib/tournament-service.js`

**Routing:**

- `frontend/src/App.jsx` (199 lines)

---

## 🎯 Summary

All tournament management pages are fully functional and properly linked. The navigation flow is:

**Create → Summary → Registration Form → Publish → Details → Start → Pairings → Results**

Each step has proper buttons and links to guide users through the workflow.
