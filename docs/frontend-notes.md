# Frontend Notes

## Navigation

The main sidebar nav is defined in `public/index.html`. Each item has a `data-page` attribute used for routing and a visible label.

| Label | `data-page` | Hash | Notes |
|-------|-------------|------|-------|
| Dashboard | dashboard | #dashboard | Default active page |
| Job Board | jobs | #jobs | |
| Job Scout | headhunter | #headhunter | Label renamed from "Headhunter" to "Job Scout" to match the detail page header |
| Contacts | contacts | #contacts | |
| My Profile | profile | #profile | |
| Writing Voice | writing-samples | #writing-samples | |
| Settings | *(separate)* | — | Rendered outside the main nav list |

## Pages

- **public/index.html** — Single-page app shell; all sections are toggled via JS based on the `data-page` value.
- **public/js/app.js** — All frontend logic: state management, API calls, DOM manipulation, page routing.
- **public/css/styles.css** — All styles including responsive layout and theming.

## Key Patterns

- The frontend uses `fetch()` for API calls, wrapped in an `apiCall()` helper in `app.js`.
- Navigation is handled client-side by showing/hiding page sections based on hash changes.
- ES modules are used in the browser (`<script type="module">`).
