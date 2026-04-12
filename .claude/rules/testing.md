# Testing — LeadFlow

## Frontend — Vitest
- Location: `frontend/tests/{components,pages}/`
- Required suites: login form, OTP verification component, calendar view, drag-drop slot, login page, schedule queue page
- Config: `vitest.config.js`
- Use `VITE_DEBUG_AUTH=true` to mock the service layer for backendless component tests

## Backend — Jest + Supertest
- Cover the full auth flow end-to-end: register → OTP issue → OTP verify → login → JWT decode → role guard rejection on wrong role
- Cover calendar CRUD, drag-drop reorder persistence, and the cron auto-publish trigger firing at the correct UTC equivalent of a WIB schedule
- Cover media upload validation: reject wrong MIME, reject >50MB, accept valid
- Mock TikTok publish and FastAPI `/analyze` calls — never hit real APIs in tests
- Cover interaction fetch → classify → reply → delete flow
- Cover weekly dashboard aggregation math (current / last / two weeks ago)

## AI Analyzer — pytest
- Location: `ai-analyzer/tests/`
- Required suites: classifier unit tests, `/analyze` route integration tests
- Assert all five sentiment categories: `purchase_intent, complaint, general_inquiry, compliment, spam`
- Assert all three priority levels: `high, medium, low`

## CI/CD — GitHub Actions
- Runner: `ubuntu-24.04` exclusively
- Workflows: `.github/workflows/{ci-frontend.yml, ci-backend.yml, ci-ai.yml}`
- Run on every PR. Block merge on any failure.