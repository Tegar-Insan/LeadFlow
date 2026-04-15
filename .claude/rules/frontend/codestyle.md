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

```markdown
# Design System Specification: High-Tech Kineticism
 
## 1. Overview & Creative North Star
**Creative North Star: "The Kinetic Monolith"**
 
This design system is built to shatter the "generic SaaS" mold. It is rooted in the concept of a "Kinetic Monolith"—an interface that feels carved out of deep, obsidian space, illuminated by high-energy, technical light sources. We are moving away from traditional flat grids toward an editorial, high-performance aesthetic. 
 
The experience is defined by **intentional asymmetry** and **tonal depth**. By utilizing extreme contrast between `#000000` and `#FFD700`, we create a high-tension environment that feels both premium and industrial. Elements should overlap, mesh gradients should provide organic movement, and typography must feel like a precision instrument. This is not just a UI; it is a digital engine.
 
---
 
## 2. Colors & Surface Logic
The palette is a sophisticated interplay of deep void-blacks and electrified golds. 
 
*   **Primary (#ffe792 / #ffd709):** Use these for "Active" states and high-energy moments.
*   **Surface Hierarchy:** We utilize the `surface-container` tiers to create a sense of physical architecture. 
    *   **Surface (#0e0e0e):** The infinite canvas.
    *   **Surface-Container-Lowest (#000000):** Used to "recess" elements into the screen.
    *   **Surface-Container-Highest (#262626):** Used for foreground objects that demand immediate focus.
 
### The "No-Line" Rule
**Explicit Instruction:** Traditional 1px solid borders for sectioning are strictly prohibited. Boundaries must be defined solely through background color shifts. For example, a `surface-container-low` section sitting on a `surface` background creates a clean, sophisticated break without the visual "noise" of a line.
 
### The "Glass & Gradient" Rule
To achieve a signature high-tech feel, use Glassmorphism for floating panels. Combine `surface-variant` colors at 40-60% opacity with a `backdrop-blur` (20px+). 
**Signature Textures:** Incorporate mesh gradients transitioning from `primary` (#ffe792) to `primary-container` (#ffd709) in hero sections. This adds a "soul" to the interface that flat colors cannot replicate.
 
---
 
## 3. Typography
Our typography scale bridges the gap between editorial prestige and technical data.
 
*   **Display & Headlines (Space Grotesk):** This is our "Technical Signature." Space Grotesk’s geometric quirks provide a modern, engineered feel. Use `display-lg` (3.5rem) with tight letter-spacing (-0.02em) to create authoritative, poster-like headers.
*   **Body & Titles (Manrope):** We use Manrope for content density. It is highly legible and balances the aggression of the headlines with a human, premium touch.
*   **Hierarchy as Identity:** Use `label-md` (Space Grotesk) in all-caps with increased letter-spacing for metadata and small tags. This reinforces the "high-tech" instrument look.
 
---
 
## 4. Elevation & Depth
In this design system, depth is a matter of light and layering, not shadows.
 
*   **The Layering Principle:** Stacking `surface-container` tiers creates natural lift. Place a `surface-container-highest` card on a `surface-container-low` background to simulate physical elevation.
*   **Ambient Shadows:** If an element must "float" (e.g., a modal), use an ultra-diffused shadow. 
    *   *Color:* Use a 10% opacity version of `surface-tint`.
    *   *Values:* 0px 24px 48px. This mimics the glow of the yellow accents hitting the black surfaces.
*   **The "Ghost Border" Fallback:** If accessibility requires a stroke, use the `outline-variant` token at **15% opacity**. This creates a "glint" on the edge of the object rather than a hard boundary.
 
---
 
## 5. Components
 
### Buttons
*   **Primary:** Background: `primary_container`. Text: `on_primary_container`. Shape: `md` (0.375rem).
*   **Secondary (Glass):** Background: `surface_variant` at 20% opacity with a `backdrop-blur`. 
*   **Interaction:** On hover, primary buttons should emit a soft glow using a 12px blur of the `primary` color.
 
### Chips
*   Use `full` (9999px) roundedness. 
*   **Filter Chips:** Use `surface_container_high` with `label-md` typography. Avoid borders; use a subtle scale-up (1.05x) on hover to indicate interactivity.
 
### Input Fields
*   **Style:** Minimalist. Background: `surface_container_low`. 
*   **Active State:** The bottom border transforms into a 2px `primary` gradient. 
*   **Error:** Use `error` (#ff7351) for helper text and `error_container` for the input background at 10% opacity.
 
### Cards & Lists
*   **No Dividers:** Forbid the use of divider lines. Separate list items using `vertical white space` (16px/24px) or a alternating `surface-container` shifts.
*   **Glass Cards:** For premium content, use a `surface-variant` background at 30% opacity with a `sm` (0.125rem) ghost border.
 
### Additional Component: "The Data Glow"
*   For numerical readouts or status indicators, use `display-sm` typography with a `drop-shadow` that matches the text color at 30% opacity. This creates a "neon-technical" look.
 
---
 
## 6. Do's and Don'ts
 
### Do:
*   **Embrace Asymmetry:** Align text to the left while placing decorative mesh gradients or data visualizations offset to the right.
*   **Layer with Intent:** Ensure that "closer" objects are always lighter (`surface-container-high`) and "further" objects are darker (`surface-container-lowest`).
*   **Use High-Contrast Type:** Pair a `display-lg` headline with a `body-sm` description to create a sophisticated, editorial scale.
 
### Don't:
*   **Don't use 100% Opaque Borders:** This kills the "glass" aesthetic and makes the UI look like a basic template.
*   **Don't Over-illuminate:** Use the vibrant yellow (`primary`) sparingly. It should act as a laser-focus, not a floodlight.
*   **Don't use Standard Shadows:** Avoid "Black" shadows on black surfaces. Use tinted, glowing ambient shadows to maintain depth.
*   **Don't Crowd the Space:** This system requires "Breathing Room." If an element feels cramped, increase the padding using our `xl` (0.75rem) or higher spacing increments.