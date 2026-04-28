---
name: seva-change-log
description: Load this skill after completing ANY task. Always append a new log entry to LOG_Changes.md at the project root. Never overwrite or modify previous entries.
---

# SevaSync — Change Log Instructions

After completing every task, append to LOG_Changes.md using this format:

---
## [Task Name] | DD Mon YYYY, HH:MM IST

**Prompt Summary:** One line of what was asked.

**Files Created:**

**Files Modified:**

**Files Deleted:** (if any)

**Status:** ✅ Complete / ⚠️ Partial / ❌ Failed
---

Rules:
- ALWAYS append. Never touch entries above the new one.
- If LOG_Changes.md doesn't exist yet, create it with a title line first:
  `# SevaSync — Change Log` then append the first entry.
- Keep file paths relative to project root.
- Be specific — "created needs router with 4 endpoints" not "created file".