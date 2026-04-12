# Frontend Code Style — LeadFlow
Stack: React 18 + Vite + Tailwind CSS. Port 5173.
## Exports
- Contexts → **named** export/import: `export const AuthContext` / `import { AuthContext } from '../context/AuthContext'`
- Components/pages → **default** export/import
- Folder is `context/` (singular), files: `AuthContext.jsx`, `NotificationContext.jsx`
## Env
- All vars prefixed `VITE_`: `VITE_API_BASE_URL`, `VITE_DEBUG_AUTH`
## Tailwind
- Tokens: `brand:#e31837`, `surface.DEFAULT:#131313`, `font-display:Manrope`, `font-body:Inter`
- Dark theme throughout. Auth pages dark/red; calendar/main light/pink (intentional coexistence)
- `postcss.config.js` REQUIRED or Tailwind silently breaks
- `index.html` lives at `frontend/` root, NOT `frontend/public/`
## Time
- Use `utils/formatDate.js` exporting `nowWIB` (NOT `nowJakarta` — that's backend)