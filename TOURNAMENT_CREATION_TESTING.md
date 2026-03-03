# Tournament Creation Workflow - Implementation & Testing Guide

## Implementation Steps

### 1. Backend Setup

#### Install/Update Dependencies

```bash
cd backend
pip install fastapi sqlalchemy pydantic python-dotenv
```

#### Database Migration

Ensure these models exist in `models.py`:

- ✅ Tournament model with all required fields
- ✅ RegistrationFormField model (newly added)
- ✅ Relationships configured

#### Create Database

```bash
python init_db.py
```

#### Apply Migrations

```bash
python migrate_db.py
```

### 2. Backend Verification

Check that all endpoints are accessible:

```bash
# Start the server
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Expected endpoints (verify in browser or Postman):

1. **POST /tournaments** - Create tournament
2. **GET /tournaments** - List tournaments
3. **GET /tournaments/{id}** - Get single tournament
4. **PUT /tournaments/{id}** - Update tournament
5. **POST /tournaments/{id}/registration-form-fields** - Create form field
6. **GET /tournaments/{id}/registration-form-fields** - Get form fields
7. **PUT /tournaments/{id}/registration-form-fields/{field_id}** - Update field
8. **DELETE /tournaments/{id}/registration-form-fields/{field_id}** - Delete field

### 3. Frontend Setup

#### Install/Update Dependencies

```bash
cd frontend
npm install
# or
bun install
```

#### Verify Components Exist

- ✅ `src/pages/CreateTournament.jsx` - Updated with multi-step form
- ✅ `src/pages/TournamentSummary.jsx` - Completely rewritten
- ✅ `src/pages/RegistrationFormBuilder.jsx` - Completely rewritten
- ✅ `src/lib/tournament-service.js` - Updated with new functions

#### Update Services

Ensure `tournament-service.js` has:

- ✅ `createTournament()`
- ✅ `getTournamentById()`
- ✅ `updateTournament()`
- ✅ `getRegistrationFormFields()`
- ✅ `saveRegistrationFormFields()`

### 4. Routing Verification

Verify routes in `App.jsx`:

```jsx
// Should exist:
<Route path="/orbiter/create" element={<CreateTournament />} />
<Route path="/arbiter/tournament/:id/summary" element={<TournamentSummary />} />
<Route path="/arbiter/tournament/:id/registration-form" element={<RegistrationFormBuilder />} />
```

---

## Complete User Testing Flow

### Pre-Test Checklist

- [ ] Backend server running on `localhost:8000`
- [ ] Frontend running on `localhost:5173` (or configured port)
- [ ] User logged in with `arbiter` or `admin` role
- [ ] Auth token in localStorage

### Test Scenario 1: Create Tournament

#### Step 1.1: Navigate to Create Page

1. Go to: `/orbiter/create`
2. Verify page loads with step indicator showing "Step 1 of 3"
3. Verify title shows "Create Tournament"

#### Step 1.2: Fill General Info (Step 1)

1. **Tournament Name**: Enter "National Chess Championship 2024"
2. **Start Date**: Select a date in the future
3. **Start Time**: Set to "09:00"
4. **End Date**: Select date after start date
5. **Description**: Enter "A prestigious national chess championship"
6. **Contact Person**: Enter "John Doe"
7. **Contact Email**: Enter "john@example.com"
8. **Contact Phone**: Enter "+91 9876543210"
9. **City**: Enter "Mumbai"
10. **Venue Name**: Enter "Grand Hotel Convention Hall"
11. **Organizer Name**: Enter "Chess Federation of India"

**Verify:**

- [ ] No validation errors appear
- [ ] All fields accept input
- [ ] Page layout is responsive

#### Step 1.3: Proceed to Step 2

1. Click "Next" button at bottom
2. Verify validation passes

**Verify:**

- [ ] If validation fails, error messages display
- [ ] If validation passes, proceed to Step 2
- [ ] Step indicator updates

#### Step 1.4: Fill Game Settings (Step 2)

1. **Event Type**: Select "Rapid"
2. **Pairing System**: Select "Swiss"
3. **Time Control**: Set to "15"
4. **Increment**: Set to "10"
5. **Rounds**: Should auto-calculate based on players
6. **Max Players**: Set to "64"
7. **Enable Rated**: Toggle ON
8. **Rating IDs**: Enter FIDE ID if needed

**Verify:**

- [ ] All fields populate correctly
- [ ] Rated toggle enables rating ID fields
- [ ] No validation errors

#### Step 1.5: Proceed to Step 3

1. Click "Next" button
2. Verify Step 3 loads

#### Step 1.6: Fill Details & IDs (Step 3)

1. **Registration Type**: Select "Free"
2. **Min Rating**: Set to "800" (optional)

**Verify:**

- [ ] Payment fields don't show (since Free)
- [ ] All required fields shown

#### Step 1.7: Submit Tournament

1. Click "Submit Tournament" button
2. Verify loading state (button shows "Publishing...")

**Expected Result:**

- [ ] API call to `POST /tournaments` succeeds
- [ ] Success toast appears
- [ ] Page redirects to `/arbiter/tournament/{ID}/summary` (URL should show ID)
- [ ] Takes ~500ms before redirect

---

### Test Scenario 2: Tournament Summary Page

#### Step 2.1: Verify Summary Page Loads

1. After redirect, verify on `/arbiter/tournament/{ID}/summary`
2. Page should load tournament details

**Verify:**

- [ ] Tournament Name displays with large heading
- [ ] Category badge shows (e.g., "RAPID")
- [ ] "Success" message displays confirming creation
- [ ] All details from Step 1 appear correctly

#### Step 2.2: Verify Summary Cards

1. **Venue Card**: Shows venue name, location, maps link
2. **Registration Card**: Shows "Free"
3. **Game Control Card**: Shows Swiss, Rapid, etc.
4. **Organizer Card**: Shows organizer name, contact person

**Verify:**

- [ ] All cards display with correct data
- [ ] Layout is responsive (test on mobile view)
- [ ] Icons display correctly

#### Step 2.3: Test Edit Button

1. Click "Edit Tournament" button
2. Should navigate to `/orbiter/create?edit={ID}`
3. All fields should be pre-populated

**Verify:**

- [ ] Form loads with previous data
- [ ] Can modify fields
- [ ] Step indicator still shows
- [ ] Submit button changes behavior (Updates instead of Creates)

#### Step 2.4: Test Publish Button

1. Go back to summary page
2. Click "Publish Tournament" button

**Verify:**

- [ ] Shows "Publishing..." state
- [ ] API call to `PUT /tournaments/{id}` succeeds
- [ ] Button becomes disabled/shows "Published"
- [ ] Success toast appears
- [ ] "Published" badge appears on page

#### Step 2.5: Test Create Registration Form Button

1. Click "Create Registration Form" button
2. Should navigate to `/arbiter/tournament/{ID}/registration-form`

**Verify:**

- [ ] Page loads with correct tournament name
- [ ] Form builder interface ready
- [ ] No fields pre-populated initially

---

### Test Scenario 3: Registration Form Builder

#### Step 3.1: Understand Form Builder

1. Review instructions card
2. See that no fields are added yet

#### Step 3.2: Add First Field

1. Click "+ Add First Field" button

**Verify:**

- [ ] Field editor appears with inputs
- [ ] Field Name field is empty and editable
- [ ] Field Type defaults to "Text"
- [ ] Required toggle defaults to OFF

#### Step 3.3: Configure Fields

Create 5 fields with this configuration:

**Field 1:**

- Name: "Player Age"
- Type: "Number"
- Required: Yes

**Field 2:**

- Name: "T-Shirt Size"
- Type: "Dropdown"
- Required: Yes

**Field 3:**

- Name: "Emergency Contact"
- Type: "Email"
- Required: Yes

**Field 4:**

- Name: "Years of Experience"
- Type: "Number"
- Required: No

**Field 5:**

- Name: "Special Requests"
- Type: "Text Area"
- Required: No

**For each field:**

- Enter name
- Select type from dropdown
- Toggle required on/off
- Verify preview updates

#### Step 3.4: Test Field Operations

1. **Reorder**: Try moving fields up/down using grip handles
2. **Delete**: Try deleting Field 4
3. **Preview**: Toggle preview mode to see form

**Verify:**

- [ ] Fields reorder correctly
- [ ] Delete removes field at correct index
- [ ] Preview shows all fields with sample inputs
- [ ] Required fields show asterisk (\*)

#### Step 3.5: Test Validation

1. Click Save button
2. All fields should be valid

**Verify:**

- [ ] No error messages appear
- [ ] Form can be saved

#### Step 3.6: Add Invalid Field (Testing Validation)

1. Click "+ Add Another Field"
2. Leave Field Name empty
3. Click Save

**Verify:**

- [ ] Error message appears: "Field name is required..."
- [ ] Error is highlighted in red
- [ ] Save button disabled/shows error
- [ ] Prevents submission

#### Step 3.7: Fix and Save

1. Enter field name "Test Field"
2. Click Save

**Verify:**

- [ ] Shows "Saving..." state
- [ ] API calls to:
  - DELETE old fields (if any existed)
  - POST new fields
- [ ] Success toast: "Registration form saved successfully!"
- [ ] Redirects to `/arbiter/tournament/{ID}/summary`

---

### Test Scenario 4: Verify Data Persistence

#### Step 4.1: Reload Tournament Summary

1. Refresh the summary page
2. Go to `/arbiter/tournament/{ID}/summary`

**Verify:**

- [ ] Tournament data loads from API
- [ ] All details still correct

#### Step 4.2: Verify Form Fields Saved

1. Go back to registration form builder: `/arbiter/tournament/{ID}/registration-form`
2. Page reloads with existing fields

**Verify:**

- [ ] All previously saved fields appear
- [ ] Field names are correct
- [ ] Field types are correct
- [ ] Required flags are correct
- [ ] Field order is preserved

#### Step 4.3: List Tournaments

1. Go to `/tournaments` page
2. Should see newly created tournament in list

**Verify:**

- [ ] Tournament appears in list
- [ ] Can click to view details

---

### Test Scenario 5: Error Handling

#### Step 5.1: Missing Required Fields

1. Go to create tournament page
2. Leave required fields blank
3. Click "Submit"

**Verify:**

- [ ] Error messages show for each empty required field
- [ ] Cannot proceed
- [ ] Error messages are helpful and specific

#### Step 5.2: Invalid Email

1. Enter "invalid-email" in Contact Email
2. Trigger validation (blur or submit)

**Verify:**

- [ ] Error: "Invalid email format"
- [ ] Field highlighted in red

#### Step 5.3: Invalid Phone

1. Enter "123" in Contact Phone
2. Trigger validation

**Verify:**

- [ ] Error: "Phone must be 10-15 digits"

#### Step 5.4: API Errors

1. Stop backend server
2. Try to create tournament
3. Click Submit

**Verify:**

- [ ] Error toast appears
- [ ] User can see friendly error message
- [ ] Can retry without page crash

---

## Advanced Testing

### API Testing with Postman/Curl

#### Create Tournament

```bash
curl -X POST http://localhost:8000/tournaments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "tournament_name": "Test Tournament",
    "start_date": "2024-03-15",
    "city": "Bangalore",
    "max_players": 32,
    "is_rated": false
  }'
```

#### Get Tournament

```bash
curl http://localhost:8000/tournaments/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Create Form Field

```bash
curl -X POST http://localhost:8000/tournaments/1/registration-form-fields \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "field_name": "Player Rating",
    "field_type": "Number",
    "is_required": true,
    "field_order": 0
  }'
```

#### Get Form Fields

```bash
curl http://localhost:8000/tournaments/1/registration-form-fields \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Performance Testing

### Load Scenarios

1. **Create Large Form**
   - Add 50+ fields
   - Verify save time < 3 seconds
   - Check memory usage

2. **List Tournaments**
   - Create 100+ tournaments
   - Verify list loads quickly
   - Check pagination if implemented

3. **Concurrent Users**
   - Have 5+ users create tournaments simultaneously
   - Verify no conflicts
   - Check database consistency

---

## Browser Compatibility

Test on:

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

---

## Accessibility Testing

- [ ] All form labels associated with inputs
- [ ] Error messages accessible to screen readers
- [ ] Keyboard navigation works
- [ ] Color not only means of communication
- [ ] Buttons have sufficient contrast

---

## Completion Checklist

- [ ] All backend endpoints working
- [ ] All frontend components rendering
- [ ] Create tournament form validation working
- [ ] Tournament summary page displaying
- [ ] Registration form builder functional
- [ ] Form fields saved to database
- [ ] All redirects working correctly
- [ ] Error handling in place
- [ ] Success messages displaying
- [ ] Data persisting across sessions
- [ ] Role-based access control enforced
- [ ] API field mapping correct
- [ ] UI responsive on mobile
- [ ] Loading states working
- [ ] Toast notifications appearing

---

## Troubleshooting

### Tournament Not Creating

**Check:**

1. Backend running on port 8000
2. Auth token valid in localStorage
3. Network tab for API errors
4. Backend console for exceptions

### Fields Not Saving

**Check:**

1. Tournament ID correct in URL
2. Form fields have valid names
3. API endpoint accessible
4. No network errors in console

### Page Not Redirecting

**Check:**

1. React Router configured correctly
2. Route params match URL pattern
3. Navigation not blocked by errors
4. Browser console for errors

### Validation Not Working

**Check:**

1. validateField function called
2. Errors state updating
3. Error messages rendering
4. Validation regex correct
