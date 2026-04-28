---
name: leadflow-design
description: Use when designing a new LeadFlow service, controller, model, or component interface before writing implementation code.
---

# LeadFlow Interface Design

## Core Principle

**Deep module** = small public interface + complex logic hidden inside.
**Shallow module** = large interface that just passes through (avoid).

Apply this at every layer of the LeadFlow MVC stack.

## LeadFlow Layer Rules

```
routes → middleware → controllers → services → models
```

| Layer | Public Interface | What to Hide Inside |
|---|---|---|
| **Model** | `getById(id)`, `upsert(data)` | SQL query, column mapping, Supabase error normalization |
| **Service** | `generateIdeas(promptId)` | OpenAI call, retry logic, DB writes, error translation |
| **Controller** | `req, res` | Input validation, service orchestration, response shaping |
| **Component** | `props` | Internal state, API calls (goes in service), local formatting |

## Interface Design Checklist

**1. Accept dependencies — don't create them**

```typescript
// ✅ Testable — caller injects supabase client
export async function getPrompt(id: string, db: SupabaseClient) {}

// ❌ Hard to test — creates dependency internally
export async function getPrompt(id: string) {
  const db = createClient(process.env.SUPABASE_URL, ...);
}
```

**2. Return results — don't mutate shared state**

```typescript
// ✅ Testable
export function buildCaption(idea: ContentIdea): string {}

// ❌ Hard to test — side effect only
export function applyCaption(idea: ContentIdea): void {
  idea.caption = format(idea);
}
```

**3. Small surface area**

Before adding a method to a service, ask:
- Can this be part of an existing method?
- Can the caller compute this from what the service already returns?
- Does the controller actually need to know about this?

## Deep Module Examples for LeadFlow

**Good — `scheduleService.ts`:**
```typescript
// Small interface
export async function getDueSchedules(): Promise<ContentQueueSchedule[]>
export async function markPublished(id: string): Promise<void>
export async function markFailed(id: string, reason: string): Promise<void>

// Deep implementation hides:
// - isScheduleTimeReached() call
// - jakartaTime.ts UTC conversion
// - Supabase query + error handling
// - WIB window check (08:00–22:00)
```

**Shallow — avoid this pattern:**
```typescript
// Too many params leak internal complexity to caller
export async function getSchedules(
  status: string,
  timezone: string,
  checkWindow: boolean,
  windowStart: number,
  windowEnd: number
): Promise<ContentQueueSchedule[]>
```

## When to Split a Service

Split when:
- Two callers use completely different halves of the service
- The service has 8+ public methods
- Testing one behavior requires setting up the other behavior's state

**Don't split** just because the file is long — depth is good.

## Frontend Component Rules

- Props = public interface. Keep them minimal.
- Move all API calls to `services/` — never `fetch()` inside a component.
- Move all formatting to `utils/formatDate.ts` or inline — never in JSX.
- `useXxx` hooks are the component's "service layer" — keep them thin.

## Cross-References

- Deep module concept: `.agents/skills/tdd/deep-modules.md`
- Interface testability patterns: `.agents/skills/tdd/interface-design.md`
- Refactor candidates after GREEN: `.agents/skills/tdd/refactoring.md`
