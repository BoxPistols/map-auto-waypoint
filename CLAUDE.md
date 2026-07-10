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
│   ├── App.jsx              # Root component (71 lines, refactored)
│   ├── App.scss             # Global styles
│   ├── main.jsx             # React entry point
│   │
│   ├── components/          # UI components
│   │   ├── ApiSettings/     # OpenAI API configuration modal
│   │   ├── CoordinateDisplay/ # Coordinate display component
│   │   ├── ExportPanel/     # Export functionality (JSON/CSV/NOTAM)
│   │   ├── FacilityPopup/   # Facility details popup
│   │   ├── FileImport/      # GeoJSON/KML import
│   │   ├── FlightAssistant/ # AI chat assistant sidebar (1,367 lines) 🟡
│   │   ├── FlightPlanner/   # Flight planning interface
│   │   ├── FlightRequirements/ # Flight requirement checker
│   │   ├── FocusCrosshair/  # Map center crosshair
│   │   ├── GridSettingsDialog/ # Grid waypoint generation settings
│   │   ├── HelpModal/       # Keyboard shortcuts help
│   │   ├── MainLayout/      # Main layout wrapper (495 lines, refactored ✅)
│   │   │   ├── MainLayout.jsx           # Orchestrator component
│   │   │   ├── components/              # AppHeader, AppSidebar, AppModals, MobileMapControls, NotificationBanner, DrawHints
│   │   │   ├── hooks/                   # useWaypointOperations, usePolygonOperations, useCollisionDetection, useKeyboardShortcuts, etc.
│   │   │   └── utils/                   # constants, mapZoom
│   │   ├── Map/             # MapLibre map component (2,051 lines) 🔴 Phase 4 (描画ロジック分離)未実施
│   │   │   ├── Map.jsx                  # Main map component
│   │   │   ├── DrawControl.jsx          # Drawing controls
│   │   │   ├── ControlGroup.jsx         # Layer control grouping
│   │   │   └── CustomLayerManager.jsx   # Custom layer management
│   │   ├── MapTooltip/      # Map hover tooltips
│   │   ├── PolygonList/     # Polygon management sidebar
│   │   ├── RouteOptimizer/  # Route optimization panel
│   │   ├── SearchForm/      # Address search (Nominatim)
│   │   ├── WaypointList/    # Waypoint management sidebar
│   │   └── WeatherForecast/ # Weather forecast panel
│   │
│   ├── contexts/            # React contexts
│   │   └── DroneDataContext.jsx # Global state management
│   │
│   ├── services/            # Business logic
│   │   ├── airspace.js      # Airport zones, no-fly zones, DID data
│   │   ├── chatLogService.js # Chat history persistence
│   │   ├── elevation.js     # GSI elevation API integration
│   │   ├── flightAnalyzer.js # Flight plan analysis (risk, optimization)
│   │   ├── geocoding.js     # Nominatim address search
│   │   ├── legalRequirements.js # 後方互換ファサード → legal/ に分割
│   │   ├── legal/           # aviationLaw, smallUASLaw, landManager, procedures, externalLinks, integratedCheck
│   │   ├── mcpClient.js     # MCP integration (mock implementation ready)
│   │   ├── openaiService.js # 後方互換ファサード → openai/ に分割
│   │   ├── openai/          # client, prompts, models, config
│   │   ├── riskService.js   # 後方互換ファサード → risk/ に分割
│   │   ├── risk/            # airspaceCheck, didCheck, pathCollision, collisionDetails, analysis
│   │   ├── routePlanner.js  # ルート生成（分割未着手、docs/ROUTE_PLANNER_REFACTORING_PLAN.md 参照）
│   │   ├── weatherService.js # Weather data integration
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
│   ├── ROUTE_PLANNER_REFACTORING_PLAN.md # routePlanner.js 分割計画（未着手）
│   └── UTM_U_SPACE_DESIGN_PATTERNS.md
│
├── public/                  # Static assets
│   └── data/did/            # DID GeoJSON data (47 prefectures)
├── .github/workflows/       # GitHub Actions (deploy.yml)
├── .claude/                 # Claude Code skills configuration
├── .serena/                 # Serena MCP configuration
│   └── project.yml          # Project-specific Serena settings
├── .storybook/              # Storybook configuration
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
| Geo calculations | @turf/turf, rbush (spatial indexing) |
| Styling | Sass (SCSS), CSS Modules |
| Testing | Vitest, Testing Library, jsdom |
| Linting | ESLint 9 (flat config) |
| Icons | lucide-react |
| Markdown | react-markdown, remark-gfm |
| Component Catalog | Storybook 10 |
| Deployment | GitHub Pages, Vercel |
| AI/MCP | OpenAI API, Serena MCP |

## Architecture Patterns

### State Management

Multi-layered state management approach:
- **Global Context**: `DroneDataContext` for shared drone data (polygons, waypoints, settings)
- **Component State**: `useState` for local UI state in individual components
- **Memoization**: `useCallback` and `useMemo` for performance optimization
- **History**: `useRef` for undo/redo history management
- **Persistence**: `localStorage` for data persistence via `utils/storage.js`
- **Settings**: Centralized settings via `services/settingsService.js`

### Component Organization

Components follow a consistent pattern:
```
ComponentName/
├── ComponentName.jsx          # Main component
├── ComponentName.scss         # Regular SCSS (global styles)
├── ComponentName.module.scss  # CSS Modules (scoped styles)
├── ComponentName.stories.tsx  # Storybook stories (optional)
└── index.js                   # Re-export (optional)
```

**Storybook Integration:**
- Component catalog available at: https://boxpistols.github.io/map-auto-waypoint/storybook/
- Stories document component props, variants, and usage patterns
- Isolated component development without running the full app

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

## Key Components

### `ControlGroup` (Map Layer Control)

レイヤーコントロールのグループ化コンポーネント（Issue #29で実装）。

**主な機能:**
- グループ全体のON/OFF機能（`groupToggle`）
- 部分選択状態の表示（`indeterminate`）
- お気に入り機能（`favoritable`）
- 開閉状態のlocalStorage永続化
- アイコン + ラベル表示

**使用例:**
```jsx
<ControlGroup
  id="aviation"
  icon={<Plane size={18} />}
  label="航空制限"
  groupToggle={true}
  groupEnabled={isAnyLayerEnabled}
  indeterminate={isSomeButNotAllEnabled}
  onGroupToggle={(enabled) => toggleAllLayers(enabled)}
  favoritable={true}
  isFavorite={isFavorite}
  onFavoriteToggle={toggleFavorite}
>
  {/* 子レイヤーボタン */}
</ControlGroup>
```

**Indeterminate状態（部分選択）:**
- チェックボックスが3つの状態を持つ：
  - ☐ 全てOFF: `groupEnabled={false}, indeterminate={false}`
  - ☑ 全てON: `groupEnabled={true}, indeterminate={false}`
  - ⊟ 一部のみON: `groupEnabled={true}, indeterminate={true}`

**ALLグループ:**
Map.jsxに実装されている特殊なグループで、飛行制限関連の全レイヤーを一括制御：
- DID（人口密集地）
- 禁止区域グループ（レッドゾーン、イエローゾーン、原発、県庁、警察、刑務所、自衛隊）
- 航空制限グループ（空港、制限表面、ヘリポート、緊急空域、RemoteID、有人機）

**スタイリング:**
- ライトモード: 明瞭なボーダー、影、不透明度0.85の背景
- ダークモード: 暗い半透明背景、強調されたActive状態
- Active状態: プライマリカラー塗りつぶし + 白文字（最高コントラスト）
- グラスモーフィズム効果（`backdrop-filter: blur()`）

**ファイル構成:**
- `src/components/Map/ControlGroup.jsx` - メインコンポーネント
- `src/components/Map/ControlGroup.module.scss` - スタイル
- `src/components/Map/ControlGroup.stories.tsx` - Storybook

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
| `0` | Japan overview ⇔ Return to saved position |
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

- ✅ `App.jsx` has been refactored (71 lines, lightweight)
- 🔴 **`Map.jsx` is large (2,051 lines, down from 3,018)** - Phase 1/2/3/5 complete, Phase 4（描画ロジック分離）未実施、priority refactoring candidate
  - Consider splitting remaining draw logic into: `utils/mapDataTransformers.js`, `hooks/useMapOverlays.js`（詳細は `docs/MAP_REFACTORING_PLAN.md`）
  - Use Serena MCP tools for efficient symbol-level refactoring
- ✅ `MainLayout.jsx` has been refactored (495 lines, down from 1,807) - split into `components/`, `hooks/`, `utils/`
- 🟡 `FlightAssistant.jsx` is growing (1,367 lines) - consider modularization（次の分割候補）
- 🟡 `routePlanner.js`（491 lines）- 分割着手も未完成、`docs/ROUTE_PLANNER_REFACTORING_PLAN.md` 参照
- ✅ `legalRequirements.js` / `riskService.js` / `openaiService.js` は `legal/` / `risk/` / `openai/` にそれぞれ分割済み（後方互換ファサード）
- Map operations can be expensive - use `useCallback` for handlers
- Avoid unnecessary re-renders with proper memoization

**Refactoring Strategy (Serena-assisted):**
1. Use `get_symbols_overview()` to analyze large components
2. Use `find_symbol()` to identify cohesive responsibility groups
3. Use `find_referencing_symbols()` to understand dependencies
4. Use `replace_symbol_body()` for safe symbol-level extraction

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

- `README.md` - User documentation (Japanese)
- `docs/MCP_INTEGRATION_VISION.md` - MCP server integration plans (5 servers)
- `docs/OPENAI_GPT4_1_GPT5_INTEGRATION.md` - OpenAI API integration (GPT-4.1/5 compatibility)
- `docs/OPENAI_GPT4_GPT5_GENERAL_INTEGRATION.md` - General OpenAI integration notes
- `docs/UTM_U_SPACE_DESIGN_PATTERNS.md` - UTM integration patterns (EU U-space)
- `docs/RENDERING_PERFORMANCE.md` - Performance optimization strategies
- `docs/MAP_REFACTORING_PLAN.md` - Map.jsx 分割計画（Phase 4 未実施）
- `docs/ROUTE_PLANNER_REFACTORING_PLAN.md` - routePlanner.js 分割計画（未着手）
- `.serena/project.yml` - Serena MCP configuration
- Storybook: https://boxpistols.github.io/map-auto-waypoint/storybook/
