// Custom event system for cross-component communication

export const StudyEvents = {
  SESSION_STOPPED: 'study:session:stopped',
  SESSION_STARTED: 'study:session:started',
  SESSION_UPDATED: 'study:session:updated',
} as const

export type StudyEventType = typeof StudyEvents[keyof typeof StudyEvents]

export function emitStudyEvent(eventType: StudyEventType, detail?: any) {
  const event = new CustomEvent(eventType, { detail })
  window.dispatchEvent(event)
}

export function useStudyEvent(eventType: StudyEventType, handler: (event: CustomEvent) => void) {
  if (typeof window === 'undefined') return

  const eventHandler = (event: Event) => {
    handler(event as CustomEvent)
  }

  window.addEventListener(eventType, eventHandler)
  
  return () => {
    window.removeEventListener(eventType, eventHandler)
  }
}