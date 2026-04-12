# Server Architecture — LeadFlow
Strict MVC. Frontend(5173) ↔ Express(5000) → Supabase PG / OpenAI GPT-4o / TikTok Business API v2. Express → FastAPI(8000) → GPT-4o.
## Layers
- routes/ → middlewares → controllers → services → models (Supabase queries)
- validators/ runs before controller
- jobs/ for cron (auto-publish, fetch interactions)
## Production
- nginx reverse proxy. Ports 5000 & 8000 bind 127.0.0.1 only, never public
- pm2: `pm2 start server.js --name leadflow-backend && pm2 startup systemd && pm2 save`
- AI Analyzer (FastAPI) isolated microservice at `ai-analyzer/`, venv via `python3 -m venv venv && source venv/bin/activate` (Linux only — never `venv\Scripts\activate`)
- POST /analyze → `{text, channel_type}` → `{sentiment_type, priority_level, classified_by}`
- Pydantic schemas in `app/models/schemas.py`