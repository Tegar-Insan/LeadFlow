---
name: leadflow-testing
description: Use when writing or reviewing tests in LeadFlow — frontend Vitest, backend Jest/Supertest, or AI pytest.
---

# LeadFlow Test Quality

## Core Principle

Tests verify **behavior through public interfaces**, not implementation details.
A good LeadFlow test reads like a spec: "marketing staff can approve an idea and it appears in the calendar."

## Test Runners by Layer

| Layer | Runner | File location | Command |
|---|---|---|---|
| Frontend components | Vitest | `frontend/tests/components/` | `npm test` in frontend/ |
| Frontend pages | Vitest | `frontend/tests/pages/` | `npm test` in frontend/ |
| Backend routes | Jest + Supertest | `backend/tests/` | `npm test` in backend/ |
| AI Analyzer | pytest | `ai-analyzer/tests/` | `pytest tests/` |

## Good vs Bad Tests

**Good — tests observable behavior through the API:**
```typescript
// ✅ Backend: tests the full route path
test("marketing staff can submit a prompt", async () => {
  const res = await request(app)
    .post("/api/prompt")
    .set("Authorization", `Bearer ${marketingToken}`)
    .send({ prompt_text: "Krench promo for Eid" });
  expect(res.status).toBe(201);
  expect(res.body.data.prompt_text).toBe("Krench promo for Eid");
});
```

```typescript
// ✅ Frontend: tests user-visible behavior
test("approve button creates calendar entry", async () => {
  render(<IdeaValidationPage />);
  await userEvent.click(screen.getByRole("button", { name: /approve/i }));
  expect(screen.getByText(/added to calendar/i)).toBeInTheDocument();
});
```

**Bad — tests implementation details:**
```typescript
// ❌ Verifies internal call, not behavior
test("approveIdea calls contentIdeaModel.updateStatus", async () => {
  const spy = jest.spyOn(contentIdeaModel, "updateStatus");
  await approveIdea("idea-123");
  expect(spy).toHaveBeenCalledWith("idea-123", "approved");
});
```

## What to Mock in LeadFlow

Mock **only at system boundaries** — things you don't control:

| External system | Mock approach |
|---|---|
| TikTok Business API | `jest.mock` the axios call in `tiktokPublishService.ts` |
| Anthropic / OpenAI | Mock `anthropicService.ts` — never the SDK directly |
| FastAPI `/analyze` | Mock the HTTP call in `interactionService.ts` |
| Gmail SMTP | Mock `emailService.ts` transporter |
| Supabase Storage | Mock the `storage.from().upload()` call |
| Supabase DB | Use a **real test DB** (Supabase branch) — do NOT mock your own queries |

**Do NOT mock:**
- Your own services or controllers
- `responseHelper`, `jwtHelper`, `jakartaTime` — test through them
- Internal helpers or utilities

## Backend Test Setup Pattern

```typescript
// Use a real JWT signed with the test secret
const marketingToken = signAccessToken({
  userId: "test-user-id",
  roleName: "marketing_staff",
});

// Use Supertest — tests the full Express pipeline
const res = await request(app)
  .get("/api/calendar")
  .set("Authorization", `Bearer ${marketingToken}`);
```

## Frontend Test Setup Pattern

```typescript
// Use VITE_DEBUG_AUTH=true to mock the auth service layer
// Mock services via vi.mock(), not axios internals
vi.mock("../services/contentService", () => ({
  generateDrafts: vi.fn().mockResolvedValue([mockDraft]),
}));
```

## AI Analyzer Test Pattern

```python
# Test through the /analyze endpoint, not the classifier function
def test_classifies_purchase_intent():
    response = client.post("/analyze", json={
        "text": "where can I buy your chicken?",
        "channel_type": "comment"
    })
    assert response.status_code == 200
    assert response.json()["sentiment_type"] == "purchase_intent"
```

## Required Test Coverage per UC

| UC | Required scenarios |
|---|---|
| UC001–002 | register → OTP → verify → login → role rejection |
| UC004–006 | prompt save, idea generate (3 ideas), approve → draft created, reject → no calendar row |
| UC007 | calendar CRUD, drag-drop reschedule, WIB window enforcement |
| UC008 | valid upload, wrong MIME rejected, >50MB rejected |
| UC009 | publish success path, publish failure path |
| UC010–012 | fetch interactions, classify (all 5 sentiment types), reply push |
| UC013 | dashboard aggregation this/last/2-weeks-ago, business_owner gate |

## Red Flags

- Test asserts on a mock call count instead of a return value or HTTP response
- Test name says "calls" or "invokes" — it should say "can" or "returns"
- Test queries Supabase directly to verify — use the API response instead
- Test breaks after internal rename with no behavior change

## Cross-References

- Good vs bad test examples: `.agents/skills/tdd/tests.md`
- When and how to mock: `.agents/skills/tdd/mocking.md`
- Full TDD loop: `.agents/skills/tdd/SKILL.md`
