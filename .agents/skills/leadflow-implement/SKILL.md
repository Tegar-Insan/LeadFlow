---
name: leadflow-implement
description: Use when starting any LeadFlow feature, bugfix, or UC implementation — before writing any code, test, or scaffold.
---

# LeadFlow Implementation Orchestrator

## Core Rule

**STOP. Ask the user before writing a single line of code or test.**

Every implementation session starts with the planning checklist below. No exceptions — not for "small" bugfixes, not for "obvious" changes, not for stubs.

## Step 1 — Planning (MANDATORY FIRST)

Ask the user these questions before anything else:

```
1. Which UC (UC001–UC013) are we implementing?
2. What is the public interface? (route path, function signature, component props)
3. Which behaviors matter most — list them in priority order.
4. Are there any constraints I should know? (DB columns, enum values, role gates)
```

Do not proceed until the user answers. Use their answers to drive Step 2.

**REQUIRED SUB-SKILL:** Read `.agents/skills/tdd/SKILL.md` for the full planning checklist before asking.

## Step 2 — Design Review

Before writing code, confirm:

- [ ] Interface follows `routes → middleware → controllers → services → models` (backend)
- [ ] Service accepts dependencies, does not create them internally
- [ ] Function returns a value — does not mutate shared state
- [ ] Deep module? (small public interface, complex logic hidden inside)

**REQUIRED SUB-SKILL:** Use `leadflow-design` for interface and deep-module decisions.

## Step 3 — RED-GREEN-REFACTOR Loop

Follow the vertical slice rule from `.agents/skills/tdd/SKILL.md`:

```
ONE behavior → write test (RED) → minimal code (GREEN) → next behavior
```

Never write all tests first. Never write all code first.

**Stack-specific test runners:**

| Layer | Runner | Location |
|---|---|---|
| Frontend components/pages | Vitest | `frontend/tests/` |
| Backend routes/controllers | Jest + Supertest | `backend/tests/` |
| AI Analyzer endpoints | pytest | `ai-analyzer/tests/` |

**REQUIRED SUB-SKILL:** Use `leadflow-testing` for what makes a good test and what to mock.

## Step 4 — Mandatory Checks Before Marking Done

- [ ] Route mounted in `backend/src/app.ts` (unmounted = silently dead)
- [ ] `responseHelper` used — never raw `res.json()`
- [ ] Timestamps go through `jakartaTime.ts` — never raw `new Date()`
- [ ] Column names match exactly (see `leadflow-ubiquitous`)
- [ ] `VITE_` prefix on all new frontend env vars
- [ ] New role gates added: `authMiddleware → roleMiddleware([...]) → controller`

## Red Flags — STOP and Ask

- You're about to write code before the user confirmed the interface
- You're writing more than one test at a time
- You're skipping the planning step because it "seems obvious"
- You're using a column name from memory — check `leadflow-ubiquitous` first

## Cross-References

- Full TDD workflow: `.agents/skills/tdd/SKILL.md`
- Interface + deep module design: `leadflow-design`
- Test quality + mocking: `leadflow-testing`
- Shared vocabulary: `leadflow-ubiquitous`
- Progress tracker: `.claude/rules/progress.md`
