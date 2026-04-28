---
name: seva-data-model
description: Load this skill when creating, reading, updating, or deleting any Firestore document, building database queries, defining Pydantic models, or working with any data entity in SevaSync — needs, volunteers, assignments, users, or activity logs.
---

# SevaSync — Firestore Data Model

## Collection: `users`
```
{
  uid: string,              // Firebase Auth UID (doc ID)
  name: string,
  email: string,
  role: "admin" | "volunteer" | "field_volunteer",
  organization: string,
  createdAt: timestamp
}
```

## Collection: `volunteers`
```
{
  uid: string,              // same as users doc ID
  phone: string,
  skills: string[],         // from SKILL_TAGS list
  languages: string[],
  location: {
    area: string,           // e.g. "Kurla", "Andheri"
    city: string,
    lat: number,
    lng: number
  },
  availability: {
    weekdays: boolean,
    weekends: boolean,
    hoursPerWeek: number,
    preferredTime: "morning" | "afternoon" | "evening" | "flexible"
  },
  maxActiveTasks: number,   // default: 3
  activeTaskCount: number,  // maintained by backend
  status: "available" | "busy" | "offline",
  verified: boolean,
  totalCompleted: number,
  rating: number,           // 0-5
  joinedAt: timestamp
}
```

## Collection: `needs`
```
{
  id: string,               // auto-generated
  rawDescription: string,   // original user input
  title: string,            // AI-generated or user-provided
  category: string,         // from NEED_CATEGORIES list
  urgency: "critical" | "high" | "medium" | "low",
  status: "new" | "analyzed" | "pending_assignment" | "assigned" | "in_progress" | "completed" | "escalated",
  beneficiaryCount: number,
  location: {
    area: string,
    city: string
  },
  requiredSkills: string[], // from SKILL_TAGS list
  requiredLanguages: string[],
  estimatedHours: number,
  vulnerableGroup: boolean, // true if elderly/children/medical
  aiSummary: string,        // Gemini-generated short summary
  aiTags: string[],
  priorityScore: number,    // computed by priority engine
  submittedBy: string,      // uid
  submittedAt: timestamp,
  updatedAt: timestamp
}
```

## Collection: `assignments`
```
{
  id: string,
  needId: string,
  volunteerId: string,
  matchScore: number,       // 0-100
  matchReasons: string[],   // e.g. ["has medical skill", "available now"]
  assignedBy: string,       // admin uid
  status: "assigned" | "accepted" | "started" | "completed" | "declined",
  notes: string,
  assignedAt: timestamp,
  acceptedAt: timestamp | null,
  startedAt: timestamp | null,
  completedAt: timestamp | null
}
```

## Collection: `match_suggestions`
```
{
  id: string,
  needId: string,
  suggestions: [
    {
      volunteerId: string,
      score: number,
      reasons: string[]
    }
  ],
  generatedAt: timestamp
}
```

## Collection: `activity_logs`
```
{
  id: string,
  entityType: "need" | "assignment" | "volunteer",
  entityId: string,
  action: string,           // e.g. "status_changed", "assigned", "completed"
  actor: string,            // uid
  actorRole: string,
  metadata: object,         // any extra context
  timestamp: timestamp
}
```

## Reference: NEED_CATEGORIES
```
food_essentials | medical | elderly_support | child_support |
transport_logistics | documentation | shelter_community
```

## Reference: SKILL_TAGS
```
medical | counselling | logistics | translation |
data_entry | field_support | community_outreach | documentation
```

## Reference: URGENCY_WEIGHTS (for priority engine)
```
critical: 100 | high: 75 | medium: 40 | low: 15
```

## Firestore Rules (summary)
- `users` — read/write own doc only; admin reads all
- `volunteers` — read own doc + admin; write own doc only
- `needs` — admin CRUD; volunteer read only
- `assignments` — admin create/update; volunteer update own status
- `activity_logs` — admin/system write; admin read

## Notes
- All Firestore operations go through backend (Admin SDK) only
- Never expose service account credentials to frontend
- Use `activeTaskCount` on volunteer to prevent overloading
- Always log status changes to `activity_logs`
