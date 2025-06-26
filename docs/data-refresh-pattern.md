# Data Refresh Pattern

## Overview
This project uses a custom event system to trigger data refreshes across components when study sessions are modified, without requiring SWR or other external state management libraries.

## Implementation

### 1. Event System (`/utils/events.ts`)
- Defines custom events for study session lifecycle
- `SESSION_STOPPED`: Emitted when a study session ends
- `SESSION_STARTED`: Emitted when a study session starts
- `SESSION_UPDATED`: Emitted when a study session is updated

### 2. Event Emission
In `useStudyTimer` hook, when a session is stopped:
```typescript
emitStudyEvent(StudyEvents.SESSION_STOPPED, { 
  sessionId: currentSession.id, 
  duration 
})
```

### 3. Event Listening
Components that need to refresh data listen for these events:

#### Dashboard Page
```typescript
useEffect(() => {
  const cleanup = useStudyEvent(StudyEvents.SESSION_STOPPED, () => {
    loadDashboardData()
    loadCalendarData()
  })
  return cleanup || (() => {})
}, [user])
```

#### Main Page
```typescript
useEffect(() => {
  const cleanup = useStudyEvent(StudyEvents.SESSION_STOPPED, () => {
    if (!authLoading && user) {
      initData()
    }
  })
  return cleanup || (() => {})
}, [user, authLoading])
```

#### StudyHistorySection Component
```typescript
useEffect(() => {
  const cleanup = useStudyEvent(StudyEvents.SESSION_STOPPED, () => {
    loadData(grain)
  })
  return cleanup || (() => {})
}, [grain])
```

## Benefits
1. **No External Dependencies**: Uses browser's native CustomEvent API
2. **Decoupled Components**: Components don't need to know about each other
3. **Flexible**: Easy to add new events and listeners
4. **Performance**: Only refreshes data when needed
5. **Type-Safe**: TypeScript ensures event types are consistent

## Adding New Events
1. Add event type to `StudyEvents` object in `/utils/events.ts`
2. Emit event where needed using `emitStudyEvent()`
3. Listen for event in components that need to react using `useStudyEvent()`