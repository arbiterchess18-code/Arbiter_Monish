# Multi-Step Tournament Creation Workflow

## Overview

This document describes the complete tournament creation workflow with three distinct steps and demonstrates how users (Arbiter/Admin) create tournaments, generate summaries, and build custom registration forms.

---

## Architecture

### Database Schema

#### Tournament Table

- `tournament_id` (PK)
- `tournament_name` (Required)
- `description`
- `start_date`, `end_date`, `start_time`
- `venue_name`, `city`, `state`, `country`, `google_maps_link`
- `contact_person`, `contact_email`, `contact_phone`
- `organizer_name`
- `registration_type` (Free, Paid, Invite)
- `entry_fee`
- `pairing_system` (Swiss, Round Robin, Knockout)
- `event_type` (Standard, Rapid, Blitz)
- `time_control`, `increment`, `rounds`, `max_players`, `min_rating`
- `is_rated`, `fide_id`, `aicf_id`, `is_private`
- `status` (upcoming, active, published, completed)
- `created_by` (FK to User)
- `created_at`, `updated_at`

#### RegistrationFormField Table

- `field_id` (PK)
- `tournament_id` (FK)
- `field_name` (Required)
- `field_type` (Text, Email, Number, Date, Dropdown, Text Area)
- `is_required` (Boolean)
- `field_order` (Integer - for ordering)
- `created_at`

### API Endpoints

#### Tournament Endpoints

```
POST /tournaments
  - Create a new tournament
  - Requires: TournamentCreate schema
  - Returns: TournamentResponse with tournament_id

GET /tournaments
  - List all tournaments
  - Returns: List[TournamentResponse]

GET /tournaments/{tournament_id}
  - Fetch single tournament details
  - Returns: TournamentResponse

PUT /tournaments/{tournament_id}
  - Update tournament details
  - Requires: TournamentCreate schema
  - Authentication: User must be tournament creator
  - Returns: TournamentResponse
```

#### Registration Form Endpoints

```
GET /tournaments/{tournament_id}/registration-form-fields
  - Get all form fields for a tournament
  - Returns: List[RegistrationFormFieldResponse]

POST /tournaments/{tournament_id}/registration-form-fields
  - Create a new form field
  - Requires: RegistrationFormFieldCreate schema
  - Authentication: User must be tournament creator
  - Returns: RegistrationFormFieldResponse

PUT /tournaments/{tournament_id}/registration-form-fields/{field_id}
  - Update a form field
  - Requires: RegistrationFormFieldCreate schema
  - Returns: RegistrationFormFieldResponse

DELETE /tournaments/{tournament_id}/registration-form-fields/{field_id}
  - Delete a form field
  - Authentication: User must be tournament creator
```

---

## Workflow Steps

### Step 1: Tournament Creation Form

**Route:** `/orbiter/create`

**Component:** `CreateTournament.jsx`

#### Features

1. **Multi-step Navigation**
   - Step 1: General Info
   - Step 2: Game Settings & Prizes
   - Step 3: Details & IDs

2. **Step 1 - General Info Fields**
   - Tournament Name (Required)
   - Start Date (Required)
   - Start Time (Required)
   - End Date (Optional)
   - Tournament Description
   - Contact Person (Required)
   - Contact Email (Required)
   - Contact Phone (Required)
   - City (Required)
   - Venue Name (Required)
   - Organizer Name (Required)

3. **Step 2 - Game Settings**
   - Event Type (Rapid, Blitz, Standard)
   - Pairing System (Swiss, Round Robin, Knockout)
   - Time Control
   - Increment
   - Number of Rounds
   - Max Players
   - Rated/Private Toggles
   - Prize Categories (if enabled)
   - Tie-breaker Methods

4. **Step 3 - Details & IDs**
   - Registration Type (Free, Paid, Invite)
   - Entry Fee (if Paid)
   - Payment Details (Account info, IFSC code)
   - Rating IDs (if Rated)
   - Custom Fields (if Private)

#### Validation

- All required fields must be filled
- Email format validation
- Phone number validation (10-15 digits)
- Minimum length validations
- Conditional validation for paid tournaments
- IFSC code format validation

#### On Submission

1. Validates all fields using `validateStep()` function
2. Calls `createTournament()` API endpoint
3. Saves tournament to database
4. Returns tournament with `tournament_id`
5. **Redirects to Tournament Summary Page**
   - URL: `/arbiter/tournament/{id}/summary`

---

### Step 2: Tournament Summary Page

**Route:** `/arbiter/tournament/{id}/summary`

**Component:** `TournamentSummary.jsx`

#### Features

1. **Tournament Overview Card**
   - Tournament Category Badge
   - Tournament Name (Large Heading)
   - Description
   - Date & Time Info (in grid layout)
   - Max Players count

2. **Venue Card**
   - Venue Name
   - Location (City, State, Country)
   - Google Maps Link (if available)

3. **Registration Settings Card**
   - Registration Type
   - Entry Fee (if Paid)
   - Tournament Status

4. **Game Control Card**
   - Pairing System Type
   - Event Type
   - Rounds Count
   - Time Control

5. **Organizer Card**
   - Organizer Name
   - Contact Person
   - Contact Email

6. **Success Message**
   - Confirm tournament created successfully
   - Guide user to next steps

#### Action Buttons

1. **Edit Tournament**
   - Opens CreateTournament with `edit={id}` query param
   - Pre-populates all fields

2. **Publish Tournament**
   - Updates tournament status to "published"
   - Disables further editing
   - Shows "Published" badge

3. **Create Registration Form**
   - Navigates to `/arbiter/tournament/{id}/registration-form`
   - Starts Step 3

---

### Step 3: Registration Form Builder

**Route:** `/arbiter/tournament/{id}/registration-form`

**Component:** `RegistrationFormBuilder.jsx`

#### Features

1. **Form Builder Interface**
   - Field Name Input
   - Field Type Selector (6 types)
   - Required Toggle
   - Drag Handle (for reordering)
   - Delete Button

2. **Field Types**
   - Text (single-line)
   - Email
   - Number
   - Date
   - Dropdown (multi-option)
   - Text Area (multi-line)

3. **Field Management**
   - Add Field Button
   - Remove Field Button
   - Reorder Fields (Up/Down)
   - Field Order Preservation

4. **Form Preview**
   - Toggle Preview Mode
   - Shows how form appears to participants
   - Displays with sample inputs

5. **Instructions Card**
   - Explains how to build form
   - Guides through each step

#### Validation

- Field Name: Required, minimum 2 characters
- Field Type: Must be valid type
- No duplicate field names (recommended)
- Custom error messages

#### On Save

1. Validates all form fields
2. Calls `saveRegistrationFormFields()` function (handles):
   - Delete existing fields for tournament
   - Insert new fields with proper order
   - Maintain field_order for proper display
3. Shows success toast
4. **Redirects back to Tournament Summary**

---

## Frontend Service Layer

### `/frontend/src/lib/tournament-service.js`

#### Core Functions

```javascript
// GET operations
getTournaments();
getTournamentById(id);
getRegistrationFormFields(tournamentId);

// POST operations
createTournament(tournamentData);
saveRegistrationFormFields(tournamentId, fields);

// PUT operations
updateTournament(id, updates);

// DELETE operations (handled in saveRegistrationFormFields)
```

#### Field Mapping

**Frontend → Backend**

```javascript
{
  name → tournament_name
  startDate → start_date
  startTime → start_time
  venueName → venue_name
  contactPerson → contact_person
  contactEmail → contact_email
  contactPhone → contact_phone
  organizerName → organizer_name
  registrationType → registration_type
  entryFee → entry_fee
  pairingSystem → pairing_system
  eventType → event_type
  timeControl → time_control
  maxPlayers → max_players
  minRating → min_rating
  isRated → is_rated
  fideId → fide_id
  aicfId → aicf_id
  isPrivate → is_private
}
```

---

## User Flow Diagram

```
1. Arbiter/Admin visits /orbiter/create
   ↓
2. Fills out tournament details (Step 1)
   ↓
3. Proceeds to Step 2 (Game Settings)
   ↓
4. Proceeds to Step 3 (Details & IDs)
   ↓
5. Clicks "Submit Tournament"
   ↓
6. API: POST /tournaments (creates tournament)
   ↓
7. Receives tournament_id from response
   ↓
8. Redirects to /arbiter/tournament/{id}/summary
   ↓
9. Views Tournament Summary Page
   ↓
10. Can either:
    a) Edit: Returns to /orbiter/create?edit={id}
    b) Publish: Updates status
    c) Create Form: Goes to /arbiter/tournament/{id}/registration-form
   ↓
11. On Create Form: Registration Form Builder opens
   ↓
12. Adds custom fields with name, type, required flag
   ↓
13. Clicks "Save Form"
   ↓
14. API: POST/DELETE registration-form-fields
   ↓
15. Form saved to database
   ↓
16. Redirects back to Tournament Summary
   ↓
17. Tournament is now ready for publishing
```

---

## Key Implementation Details

### Role-Based Access Control

All tournament creation features require:

- User Role: `arbiter` or `admin`
- Authentication: Valid JWT token in localStorage
- Ownership: Can only edit own tournaments

### State Management

**CreateTournament Component**

- `tournamentData`: Main form state
- `currentStep`: Navigation between steps
- `errors`: Validation error messages
- `isPublishing`: Loading state during submission

**TournamentSummary Component**

- `tournament`: Fetched tournament data
- `loading`: Initial data load state
- `isPublishing`: Button loading state

**RegistrationFormBuilder Component**

- `fields`: Array of form fields
- `saving`: Save operation state
- `errors`: Field validation errors
- `showPreview`: Preview toggle state

### Error Handling

- API errors converted to user-friendly toast messages
- Validation errors displayed inline for each field
- Failed submissions show error toast with retry option
- Network errors handled with user feedback

### Loading States

- Spinner during initial data fetch
- Button disabled state during async operations
- Toast notifications for success/failure
- Redirect with timeout for better UX

---

## Testing Checklist

### Step 1: Form Validation

- [ ] All required fields show validation messages when empty
- [ ] Email validation works correctly
- [ ] Phone validation accepts 10-15 digits
- [ ] Cannot proceed without fixing errors
- [ ] Navigation between steps works

### Step 2: Creation

- [ ] Tournament created in database
- [ ] tournament_id returned properly
- [ ] Redirects to summary page
- [ ] Summary page loads tournament data

### Step 3: Summary Page

- [ ] All tournament details display correctly
- [ ] Edit button opens form with populated data
- [ ] Publish button updates status
- [ ] Create Form button navigates correctly

### Step 4: Registration Form

- [ ] Can add multiple fields
- [ ] Field types dropdown works
- [ ] Required toggle functions
- [ ] Delete removes field
- [ ] Reordering works (if implemented)
- [ ] Preview shows form layout
- [ ] Save validates all fields
- [ ] Form fields persisted to database

### Step 5: End-to-End

- [ ] Create tournament → Summary → Create Form → Complete
- [ ] All redirects work properly
- [ ] Data persists across navigation
- [ ] List tournaments shows newly created tournament
- [ ] Edit tournament pre-populates all fields

---

## Database Migration

To implement this workflow, ensure:

1. Tournament table has all fields as described
2. RegistrationFormField table created with foreign key to Tournament
3. Migration scripts applied to create tables
4. Indexes on tournament_id for performance

---

## Future Enhancements

1. **Bulk Import**: CSV upload for custom fields
2. **Field Groups**: Organize fields into sections
3. **Conditional Fields**: Show fields based on other field values
4. **Field Validation Rules**: Custom regex patterns
5. **Form Themes**: Customizable form appearance
6. **Field Templates**: Pre-built form templates
7. **Multi-language**: Form labels in multiple languages
8. **Form Analytics**: Track field abandonment rates
9. **Version Control**: Form field history and rollback
10. **Integration**: Link forms to external services
