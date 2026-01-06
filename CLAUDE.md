# CLAUDE.md - AI Assistant Guide for Drone Waypoint

This document provides comprehensive guidance for AI assistants working with the **map-auto-waypoint** (Drone Waypoint) codebase.

## Project Overview

Drone Waypoint is a Japanese drone inspection waypoint management application built with React and MapLibre GL JS. The app enables:

- Drawing and editing polygons on maps
- Automatic waypoint generation from polygons
- Safety checks for DID (Densely Inhabited District), airports, and no-fly zones
- AI-powered flight plan analysis via OpenAI integration
- Export to JSON/CSV/NOTAM formats

### Language & Locale

The UI is entirely in **Japanese**. All user-facing strings, comments, and documentation in the codebase use Japanese. When making changes, maintain consistency with Japanese language conventions.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Build for production (GitHub Pages)
npm run build

# Build for production (Vercel)
npm run build:vercel

# Lint code
npm run lint
```

## Project Structure

```
map-auto-waypoint/
├── src/
│   ├── App.jsx              # Main application component (1200+ lines)
│   ├── App.scss             # Global styles
│   ├── main.jsx             # React entry point
│   │
│   ├── components/          # UI components
│   │   ├── ApiSettings/     # OpenAI API configuration modal
│   │   ├── ExportPanel/     # Export functionality (JSON/CSV/NOTAM)
│   │   ├── FileImport/      # GeoJSON/KML import
│   │   ├── FlightAssistant/ # AI chat assistant sidebar
│   │   ├── GridSettingsDialog/ # Grid waypoint generation settings
│   │   ├── HelpModal/       # Keyboard shortcuts help
│   │   ├── Map/             # MapLibre map + DrawControl
│   │   ├── PolygonList/     # Polygon management sidebar
│   │   ├── SearchForm/      # Address search (Nominatim)
│   │   └── WaypointList/    # Waypoint management sidebar
│   │
│   ├── services/            # Business logic
│   │   ├── airspace.js      # Airport zones, no-fly zones, DID data
│   │   ├── chatLogService.js # Chat history persistence
│   │   ├── elevation.js     # GSI elevation API integration
│   │   ├── flightAnalyzer.js # Flight plan analysis (risk, optimization)
│   │   ├── geocoding.js     # Nominatim address search
│   │   ├── mcpClient.js     # MCP integration (future)
│   │   ├── openaiService.js # OpenAI API wrapper
│   │   ├── polygonGenerator.js # Polygon creation from search results
│   │   ├── settingsService.js # App settings management
│   │   ├── themeService.js  # Dark/light theme
│   │   └── waypointGenerator.js # Waypoint generation algorithms
│   │
│   ├── utils/               # Utilities
│   │   ├── exporters.js     # Export format generators
│   │   ├── fileParser.js    # GeoJSON/KML parsing
│   │   └── storage.js       # localStorage wrapper
│   │
│   └── test/                # Test configuration
│       └── setup.js         # Vitest setup (mocks localStorage, fetch)
│
├── docs/                    # Additional documentation
│   ├── MCP_INTEGRATION_VISION.md
│   ├── OPENAI_GPT4_1_GPT5_INTEGRATION.md
│   └── UTM_U_SPACE_DESIGN_PATTERNS.md
│
├── public/                  # Static assets
├── .github/workflows/       # GitHub Actions (deploy.yml)
├── .claude/                 # Claude skills configuration
├── index.html               # HTML entry point
├── vite.config.js           # Vite configuration
├── eslint.config.js         # ESLint configuration
└── package.json
```

## Technology Stack

| Category | Technology |
|----------|------------|
| Framework | React 19 |
| Build Tool | Vite 7 |
| Maps | MapLibre GL JS, react-map-gl |
| Drawing | @mapbox/mapbox-gl-draw |
| Geo calculations | @turf/turf |
| Styling | Sass (SCSS), CSS Modules |
| Testing | Vitest, Testing Library, jsdom |
| Linting | ESLint 9 (flat config) |
| Icons | lucide-react |
| Deployment | GitHub Pages, Vercel |

## Architecture Patterns

### State Management

State is managed in `App.jsx` using React hooks:
- `useState` for all application state (polygons, waypoints, UI state)
- `useCallback` for memoized handlers
- `useRef` for undo/redo history
- `localStorage` for persistence via `utils/storage.js`

### Component Organization

Components follow a consistent pattern:
```
ComponentName/
├── ComponentName.jsx        # Main component
├── ComponentName.scss       # Regular SCSS (global styles)
├── ComponentName.module.scss # CSS Modules (scoped styles)
└── index.js                 # Re-export (optional)
```

### Styling Conventions

- **Global styles**: Regular `.scss` files imported directly
- **Scoped styles**: CSS Modules (`.module.scss`) for component-specific styles
- **Theme support**: Dark/light themes via CSS custom properties

### Data Flow

```
User Action → App.jsx handler → Update state → Auto-save to localStorage
                              ↓
                        Child components re-render
                              ↓
                        Map updates (polygons/waypoints)
```

## Key Services

### `flightAnalyzer.js`

The core service for flight plan safety analysis. Key functions:
- `analyzeFlightPlanLocal()` - Main analysis function (risk level, score, recommendations)
- `analyzeWaypointGaps()` - Check waypoints against airspace restrictions
- `generateOptimizationPlan()` - Generate safe waypoint positions
- `checkDIDArea()` - Check if location is in DID (Densely Inhabited District)

### `airspace.js`

Contains static data for Japanese airspace restrictions:
- `AIRPORT_ZONES` - 150+ airports/airfields with restriction radii
- `NO_FLY_ZONES` - Government buildings, nuclear plants, US military bases
- `HELIPORTS` - Major heliports
- `DID_TILE_URL` - GSI DID tile layer URL

### `openaiService.js`

OpenAI API integration with model support for:
- GPT-4o Mini (default)
- GPT-4.1 Nano
- Local LLM support (LM Studio compatible)

Handles `max_tokens` vs `max_completion_tokens` differences between model versions.

### `waypointGenerator.js`

Waypoint generation algorithms:
- `polygonToWaypoints()` - Vertices only
- `generatePerimeterWaypoints()` - Even distribution along perimeter
- `generateGridWaypoints()` - Grid pattern inside polygon

## Testing

### Test Framework

Uses **Vitest** with **Testing Library** for React components.

```bash
# Run all tests
npm test

# Run tests once (CI mode)
npm run test:run
```

### Test Setup

`src/test/setup.js` provides:
- `@testing-library/jest-dom` matchers
- `localStorage` mock
- Global `fetch` mock

### Test Files

Test files are co-located with source files:
- `src/services/flightAnalyzer.test.js`
- `src/services/airspace.test.js`

### Writing Tests

```javascript
import { describe, it, expect, vi } from 'vitest';

describe('ComponentName', () => {
  it('should do something', () => {
    expect(result).toBe(expected);
  });
});
```

## Development Workflow

### Code Style

- **ESLint** with flat config (`eslint.config.js`)
- `no-unused-vars` configured to ignore capitalized variables and `_` prefixed args
- React hooks lint rules enabled

### Making Changes

1. **Components**: Add to `src/components/` with associated `.scss` or `.module.scss`
2. **Services**: Add to `src/services/` with unit tests
3. **Utilities**: Add to `src/utils/`

### Environment Variables

```bash
# .env or .env.local
VITE_OPENAI_API_KEY=sk-xxx...
VITE_REINFOLIB_API_KEY=xxx...  # Optional
```

Environment variables are accessed via `import.meta.env.VITE_*`.

### Git Workflow

- Main branch: `main`
- Auto-deploy to GitHub Pages on push to `main`
- PR workflow for feature branches

## External APIs & Data Sources

| Service | Purpose | Rate Limits |
|---------|---------|-------------|
| Nominatim (OSM) | Address search | 1 req/sec |
| GSI Elevation API | Waypoint elevation | Reasonable use |
| GSI DID Tiles | DID overlay | Raster tiles |
| OpenAI | AI analysis | Per API key |

## Keyboard Shortcuts

When adding new shortcuts, update `HelpModal.jsx`:

| Key | Action |
|-----|--------|
| `C` | Toggle chat |
| `S` | Toggle sidebar |
| `P` | Polygon panel |
| `W` | Waypoint panel |
| `?` | Help |
| `Cmd/Ctrl+Z` | Undo |
| `Cmd/Ctrl+Shift+Z` | Redo |
| `D` | Toggle DID overlay |
| `A` | Toggle airport zones |
| `R` | Toggle red zones |
| `Y` | Toggle yellow zones |
| `H` | Toggle heliports |
| `M` | Change map style |
| `3` | Toggle 3D |
| `F` | Full map mode |
| `Shift+click` | Add manual waypoint |
| `Shift+drag` | Select multiple waypoints |

## Common Tasks

### Adding a New Component

```bash
mkdir src/components/NewComponent
touch src/components/NewComponent/NewComponent.jsx
touch src/components/NewComponent/NewComponent.module.scss
```

### Adding Airspace Data

Edit `src/services/airspace.js`:
```javascript
export const AIRPORT_ZONES = [
  // Add new entry
  { name: 'New Airport', lat: XX.XXXX, lng: XXX.XXXX, radius: 6000, type: 'airport' },
  ...
];
```

### Modifying OpenAI Integration

Edit `src/services/openaiService.js`:
- Add models to `AVAILABLE_MODELS`
- Update `requiresMaxCompletionTokens()` for new model families
- Modify system prompts in `analyzeFlightPlan()`, `getFlightAdvice()`

## Deployment

### GitHub Pages

Automatic deployment via `.github/workflows/deploy.yml`:
1. Push to `main`
2. Build with `npm run build`
3. Deploy to GitHub Pages

Base URL: `/map-auto-waypoint/`

### Vercel

1. Connect repo to Vercel
2. Framework: Vite
3. Build command: `npm run build:vercel`
4. Output: `dist`

Base URL: `/`

## Important Considerations

### Performance

- `App.jsx` is large (~1280 lines) - consider splitting if adding major features
- Map operations can be expensive - use `useCallback` for handlers
- Avoid unnecessary re-renders with proper memoization

### Accessibility

- Keyboard shortcuts should have visible hints
- Use semantic HTML in components
- Maintain focus management in modals

### Error Handling

- API errors are caught and shown as notifications
- Graceful degradation when OpenAI API is unavailable
- localStorage errors are logged but don't crash the app

### Security

- API keys stored in localStorage (development) or env vars (production)
- No sensitive data in git
- External API calls validated before use

## Related Documentation

- `README.md` - User documentation
- `docs/MCP_INTEGRATION_VISION.md` - MCP server integration plans
- `docs/OPENAI_GPT4_1_GPT5_INTEGRATION.md` - OpenAI API details
- `docs/UTM_U_SPACE_DESIGN_PATTERNS.md` - UTM integration patterns
