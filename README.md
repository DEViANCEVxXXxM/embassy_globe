# 🌍 Burger Embassy — Flavor Passport

> An interactive 3D globe where every dish is a visa to a new country.
> Spin the globe, tap a marker, order in Telegram.

**Live:** [not yet](#) · **Telegram bot:** [@burgerembassy_uzbot](https://t.me/burgerembassy_uzbot) · **Instagram:** [@burgerembassyuz](https://www.instagram.com/burgerembassyuz/)

---

## 📖 Table of Contents

- [Overview](#overview)
- [Design Goals](#design-goals)
- [Feature Set](#feature-set)
- [Architecture](#architecture)
- [Data Model](#data-model)
- [3D Scene Deep-Dive](#3d-scene-deep-dive)
- [UX Decisions](#ux-decisions)
- [Accessibility](#accessibility)
- [Performance](#performance)
- [Analytics & Tracking](#analytics--tracking)
- [Internationalization](#internationalization)
- [Design Tokens](#design-tokens)
- [Deployment](#deployment)
- [Browser Support](#browser-support)
- [Roadmap](#roadmap)
- [License](#license)

---

## Overview

**Burger Embassy** is a single-page marketing and ordering experience for a Tashkent-based burger chain. Instead of a flat menu, the entire catalog is organized geographically — each burger is tied to a country of origin (New York, Istanbul, Seoul…) and lives as a glowing marker on a rotating 3D Earth.

**The core interaction:**
1. User sees the globe spinning slowly.
2. Drags to rotate, zooms with wheel/pinch.
3. Taps a marker → side panel slides in with the country's menu.
4. Taps a dish → modal with photo, price, calories, allergens.
5. Clicks "Order in Telegram" → hands off to the bot with UTM + branch context.

The whole experience runs as a **single HTML file** (~120 KB unminified) with Three.js loaded via importmap from CDN. No build step, no bundler, no framework.

---

## Design Goals

| Goal | How we achieve it |
|---|---|
| **Wow-factor on first paint** | Rotating 3D Earth with atmospheric glow, particle stars, pulsing markers |
| **Zero-build deployment** | Single-file HTML + ES modules + CDN imports |
| **Works on slow networks** | Graceful WebGL fallback → opens list view; geoJSON with 8s timeout |
| **Mobile-first** | Touch gestures, bottom-sheet panel, FAB list, geolocation |
| **Keyboard & screen-reader friendly** | Focus trap, ARIA roles, `prefers-reduced-motion` |
| **Order-driven** | Sticky Telegram CTA everywhere; UTM + branch in `start` payload |
| **Low-ops** | No backend, no database — static file + Telegram bot |

**Anti-goals:** we're not building an app shell, a PWA install-first flow, or a CMS. Content is edited by editing the `places` array.

---

## Feature Set

### 🗺️ Interactive Globe
- Spinning 3D Earth (Three.js) with procedurally-painted country map
- Drag-rotate + wheel/pinch zoom
- 15 markers, each with pulsing ring animation
- Country highlight overlay (additive-blended sphere with per-country canvas texture)
- Auto-rotate after 1.4s idle, pauses on hover or when any panel is open

### 📋 Menu Browser
- Panel with search, category chips, sort (price ↑↓, discount, new), "in stock only" toggle
- Item cards: photo, badges (−%, new), price, old price, weight
- Highlight matched text in search results (`<mark>`)
- Empty state with clickable search suggestions + reset button

### 🛒 Dish Detail Modal
- Hero image (`object-fit: contain` on white bg — never cropped)
- Kicker with country · city · allergens · calories
- Favorite (♥) and Share (Web Share API with clipboard fallback)
- Disabled state for out-of-stock items

### 📍 Branch Selector
- 15 branches with real open/closed status computed in **Asia/Tashkent** timezone
- Geolocation: "Detect nearest" → Haversine distance → auto-select if < 100 km
- "Only open now" filter
- Persists in `localStorage` (`manual` / `auto` / `url` / `default` source)

### 🔍 Global Search (Sheet)
- "All places" bottom sheet with global dish search
- Recent places + favorites as quick chips
- Shortcut `/` on desktop

### 🎨 Design Details
- Promo banner (dismissable for 24h)
- Toast notifications for actions
- Loading spinner with 8s timeout
- Onboarding hint fades after 6.5s
- Skeuomorphic gold-on-dark palette

---

## Architecture

```mermaid
graph TD
    subgraph Frontend ["index.html (Single Page)"]
        UI["UI Layer<br/>(HTML + CSS Tokens)"]
        Logic["App Logic<br/>(ES Modules)"]
        Three["3D Scene<br/>(Three.js)"]
        
        UI <--> Logic
        Logic <--> Three
    end

    subgraph Data ["Data Model (Inline JS)"]
        Branches["Branches Array<br/>(Geo, Hours)"]
        Places["Places Array<br/>(Countries, Dishes)"]
        
        Branches --> Logic
        Places --> Logic
    end

    subgraph External ["External Dependencies (CDN)"]
        ThreeCDN["three@0.160.0"]
        Flags["flag-icons@7.2.3"]
        GeoJSON["World GeoJSON"]
        
        ThreeCDN --> Three
        Flags --> UI
        GeoJSON --> Three
    end

    subgraph Services ["External Services"]
        TG["Telegram Bot<br/>(Ordering)"]
        Metrika["Yandex Metrika<br/>(Analytics)"]
        Insta["Instagram<br/>(Social)"]
        
        Logic --> TG
        Logic --> Metrika
        UI --> Insta
    end

    style Frontend fill:#1a1510,stroke:#f5a623,stroke-width:2px,color:#f5efe6
    style Data fill:#100d0a,stroke:#a08a60,stroke-width:1px,color:#bcb4aa
    style External fill:#221c16,stroke:#d4b47a,stroke-width:1px,color:#f5c76a
    style Services fill:#070605,stroke:#2AABEE,stroke-width:2px,color:#f5efe6
  ```mermaid

### Module breakdown (inside the `<script module>`)

| Section | Responsibility |
|---|---|
| **Constants** | `IMG_BASE`, `ORDER_URL`, `METRIKA_ID` |
| **Analytics** | `initMetrika()`, `track(event, params)` |
| **Branches** | Coordinates, schedule parser, `isBranchOpen()` using `Intl.DateTimeFormat('Asia/Tashkent')` |
| **Geo math** | `distanceKm()` (Haversine), `findNearestBranch()` |
| **State** | `currentBranch`, `currentBranchSource`, `branchOpenOnly` (persisted) |
| **Data** | `places` — countries → items; `countryIndex` aggregates by ISO |
| **Helpers** | `flagIcon()`, `escapeHtml()`, `highlightSafe()`, `blurIfContains()` |
| **Categories** | `detectCategory(item)` (regex-based, no manual tagging), `CATEGORIES` metadata (kcal, allergens) |
| **3D Scene** | `initScene()` (conditional), marker creation, pointer handling, render loop |
| **Panel** | `openPlace()`, `openCountry()`, `applyFilter()`, `renderCategoryChips()` |
| **Modal** | `openModal()`, favorites, share, calories/allergens |
| **Sheet** | `buildSheet()`, `renderGlobalSearch()`, recents/favorites |
| **Branch selector** | `renderBranchDropdown()`, `detectNearestBranch()`, keyboard nav |
| **Routing** | `parseHash()`, `restoreFromHash()` — format `#/tashkent?branch=ukchi` |
| **PWA** | Inline blob manifest with absolute URLs |
| **Keyboard** | Escape hierarchy, `/` search, focus trap |

---

## Data Model

### Branch

```js
{
  id: 'mirzo',                       // used in ?start=branch_mirzo
  name: 'Мирзо Улугбека, 55',
  address: '',
  hours: 'Круглосуточно',            // or '10:00 – 23:00'
  is24: true,
  lat: 41.3250,
  lon: 69.3250,
}
```

### Place

```js
{
  id: 'newyork',
  name: 'New York',
  country: 'США',
  iso: 'USA',                        // must match GeoJSON ADM0_A3
  lat: 40.7128,
  lon: -74.0060,
  items: [ /* Dish[] */ ],
}
```

### Dish

```js
{
  n: 'New York Burger',              // name
  p: 52000,                          // price (UZS)
  old: 63000,                        // optional: old price → auto −% badge
  w: '325 г',                        // weight
  e: '🍔',                           // emoji fallback
  i: 'abc123-300x300.jpeg',          // filename in /assets
  d: 'Говяжья котлета, чеддер…',     // description
  out: true,                         // optional: out of stock
}
```

### Category

`Category (derived, not stored)`

Categories are auto-detected from the name by `detectCategory()`:

```js
/салат/                 → salads
/фондан|чизкейк|донат/  → desserts
/сет/                   → sets
/хотдог/                → hotdogs
/cola|sprite|чай|сок/   → drinks
/burger|бургер/         → burgers
```

Each category carries static metadata (`kcal`, `allergens`) — so we don't need to maintain the same info per dish.

## 3D Scene Deep-Dive

### Sphere stack

```text
scene
├── earth          (96×64 sphere, MeshPhongMaterial + canvas map texture)
├── hlSphere       (96×64, additive-blended overlay for country highlight)
├── grid           (lat/lon lines, 15° step)
├── atmosphere     (backside-rendered shader glow)
├── stars          (1100 points, spherical distribution r=14..40)
└── 15 marker groups
    ├── ring       (RingGeometry 0.026–0.034, pulsing)
    ├── dot        (Sphere 0.013, scales on hover)
    └── hit        (invisible Sphere 0.075 desktop / 0.11 touch)
```

### Map painting

On load, we fetch `ne_110m_admin_0_countries.geojson` and paint each country's polygon onto a 2048×1024 canvas using the equirectangular projection:

```js
function lonLatToXY(lon, lat) {
  return [ ((lon + 180) / 360) * 2048, ((90 - lat) / 180) * 1024 ];
}
```

The canvas is then uploaded as `THREE.CanvasTexture`.

Why canvas instead of a pre-rendered texture? Zero dependencies — no image asset to host, no risk of stale borders. The GeoJSON is fetched from jsDelivr and cached by the browser.

### Country highlight

When a country is selected, we render its polygon onto a second canvas (`hlCanvas`) with warm gold fill and glowing stroke, then apply it to `hlSphere`. Because it uses `AdditiveBlending`, it glows over the base map without obscuring it.

### Rotation model

```js
// Yaw/pitch instead of quaternion input → easier to clamp
globe.quaternion = qX(pitch) * qY(yaw);
```

- Yaw: free 360° spin
- Pitch: clamped to ±65°
- Auto-rotate kicks in after 1.4s of no interaction — pauses on marker hover or when any panel/modal/sheet is open
- `prefers-reduced-motion` disables auto-rotate and pulsing rings

### Raycasting

Each marker carries a low-poly invisible sphere (`hit mesh`) with a larger radius on touch devices:

```js
const IS_TOUCH = window.matchMedia('(pointer:coarse)').matches;
const HIT_GEO = new THREE.SphereGeometry(IS_TOUCH ? 0.11 : 0.075, 12, 12);
```

This is the single biggest win for mobile UX — the visible dot is tiny (0.013), but the hit target is finger-sized.

## UX Decisions

### Bottom-sheet on mobile, side-panel on desktop

The menu lives in `<aside class="panel">`. On mobile it's a bottom sheet (85 vh, swipe-to-close on the drag handle); on desktop it slides in from the right and pushes the globe left via `targetYaw` offset.

```js
const yawOffset = isMobile ? 0 : -0.22;       // shift globe left when panel opens
const pitchOffset = isMobile ? -0.55 : 0;     // tilt down to keep markers visible
```

### Auto-zoom to marker

When a country opens, we don't snap — we tween over ~1 second using `yaw += dyaw * ease`. This orients the globe so the selected country faces the user.

### Multi-layer Escape hierarchy

Escape closes in this priority:

1. Branch dropdown (if open)
2. Modal
3. Sheet
4. Panel

This prevents “double-close” bugs where Escape kills two layers at once.

### Focus management before `aria-hidden`

Setting `aria-hidden="true"` on a container whose descendant has focus triggers a Chrome/Safari warning. We always call `blurIfContains(el)` before hiding, and in `closeModal()` we try to restore focus to the trigger first.

### Disabled link, not disabled button

Out-of-stock dishes use `<a aria-disabled="true" class="disabled">` with `pointer-events: none`. This keeps the DOM stable and avoids disabled styling resets from UA stylesheets.

### Deferred analytics

Metrika only loads if `window.__METRIKA_ID__` is set. Debug mode (`?debug`) logs every `track()` call to console — great for QA without polluting the production dashboard.

## Accessibility

| Requirement | Implementation |
| --- | --- |
| Keyboard nav | Branch dropdown: ↑↓ Home End Enter Esc; chips: Tab; modal: focus trap |
| Focus visible | `:focus-visible` gold outline on all interactive elements |
| Screen reader | `role="dialog"`, `aria-modal`, `aria-labelledby`, `aria-describedby`, `aria-live="polite"` on count, `aria-pressed` on favorite |
| Touch targets | ≥ 44×44 on all buttons; hit spheres ×2 on coarse pointers |
| Reduced motion | `@media (prefers-reduced-motion)` disables animations + auto-rotate + marker pulse |
| Color contrast | All text ≥ 4.5:1 against backgrounds (gold-on-dark ≥ 7:1) |
| No-JS / no-WebGL fallback | Auto-opens sheet with full list; panel/modal/search still work |
| Deep-link errors | Invalid `#/xxx` shows toast instead of blank screen |
| Form states | Search, checkbox, sort all have visible focus + hover |

## Performance

| Concern | Mitigation |
| --- | --- |
| 3D scene cost | 96×64 sphere segments (not 128×128); markers are <10 tris each |
| Map texture | 2048×1024 canvas painted once on load, reused via `CanvasTexture` |
| Image loading | `loading="lazy"` on thumbnails; `opacity: 0 → 1` fade on load; `onerror` → hide |
| Image prefetch | `prefetchImages(place)` fires on marker hover, preloads top 3 dishes |
| GeoJSON timeout | 8-second watchdog; if slow, we let the app run without the map |
| WebGL detection | Tested before creating renderer; failure → sheet opens automatically |
| Raycast throttling | Only runs on `pointermove` when not dragging; skipped entirely on touch |
| CSS containment | Panels use transform (GPU-composited) instead of left/top |

No build step means no minification — but the whole document is still under 130 KB compressed, and all heavy assets (Three.js, GeoJSON, flag-icons) are CDN-cached.

## Analytics & Tracking

Yandex Metrika is integrated but off by default:

```html
<script>window.__METRIKA_ID__ = null;</script>
```

Set to your counter ID to enable. Events tracked:

| Event | Params |
| --- | --- |
| `open_country` | `{ country }` |
| `open_place` | `{ place, country }` |
| `open_item` | `{ item, price, place, country }` |
| `click_order` | `{ item, branch, price }` |
| `favorite` | `{ item, added }` |
| `share` | `{ item, place }` |
| `sort` | `{ value }` |
| `open_sheet` | — |
| `select_branch` | `{ branch, source }` |
| `geolocate_ok` | `{ branch, distance }` |
| `geolocate_err` | `{ message }` |
| `geolocate_far` | `{ distance }` |
| `branch_filter_open` | `{ enabled }` |

Debug mode: open any page with `?debug` in the URL — all events log to `console.log`.

## Internationalization

Currently Russian only. All strings live inline in HTML and the places data. For future multi-language:

- Content strings (`name`, `d`, `country`) live in the data model — could become `{ ru, uz, en }` objects
- UI strings (~40) are scattered — should be extracted to a `STRINGS` map if i18n becomes a requirement
- Date/time formatting already uses `Intl.DateTimeFormat` with explicit `Asia/Tashkent` timezone — the foundation is right

## Design Tokens

```css
/* Palette */
--bg-deep:      #070605;
--bg-mid:       #100d0a;
--surface-1:    rgba(32,28,24,.82);
--border-gold:  rgba(200,160,80,.18);
--gold:         #f5a623;
--gold-light:   #f5c76a;
--text-primary: #f5efe6;
--green:        #3ecf7f;
--red:          #ff7d7d;
--tg-blue:      #2AABEE;

/* Radii */
--radius-pill:  999px;
--radius-card:  14px;
--radius-panel: 20px;
--radius-sheet: 24px;

/* Motion */
--ease-out:     cubic-bezier(.22,.9,.24,1);
--dur-short:    .2s;
--dur-medium:   .3s;
--dur-long:     .5s;
```

Touch targets, spacing, and typography scale with the `@media (max-width: 900px)` breakpoint — no mobile detection in JS.

## Deployment

Fully static. Drop the folder onto any CDN:

```text
/ (root)
├── index.html
├── favicon.ico
├── og-cover.jpg          (1200×630, for Telegram/WhatsApp previews)
└── assets/
    ├── adfecde1cb66d522582c97b9f75b060f-300x300.jpeg
    └── … (~50 dish photos)
```

Requirements:

- HTTPS (for `navigator.geolocation` and `navigator.share`)
- Path stays `/` — manifest `start_url` uses `location.origin + pathname`
- No special headers required
- Recommended hosts: Cloudflare Pages, Vercel, Netlify, GitHub Pages, any nginx

### Post-deploy checklist

- [ ] Set `window.__METRIKA_ID__` to your Yandex counter ID
- [ ] Replace `og-cover.jpg` with branded social card
- [ ] Verify `favicon.ico` at `/favicon.ico` (browser + PWA)
- [ ] Test geolocation prompts on mobile
- [ ] Test Telegram bot receives `/start branch_mirzo utm_source=site…`
- [ ] Verify `navigator.share()` on iOS Safari and Android Chrome

## Browser Support

| Browser | Version | Notes |
| --- | --- | --- |
| Chrome / Edge | 90+ | Full experience |
| Safari (macOS) | 15+ | Web Share API requires user gesture (handled) |
| Safari (iOS) | 15+ | Add to Home Screen works (manifest inline) |
| Firefox | 90+ | `navigator.share` unsupported → falls back to clipboard |
| Firefox | < 121 | No `:has()` — handled with JS flag classes |
| WebView (Telegram) | Current | Telegram WebView supports WebGL — verified |
| No WebGL | Any | Auto-opens list view; no globe but full menu |

## Roadmap

### ✅ Shipped

- 3D globe with country highlight
- Panel + modal + sheet + global search
- Branch selector with geolocation + real-time status
- Favorites, recents, share, categories, sorting
- Analytics hooks, PWA manifest, a11y, i18n-ready tokens

### 🚧 Next

- [ ] Uzbek / English translations (extract strings)
- [ ] Composition / allergen page — expand `CATEGORIES` metadata into per-dish info
- [ ] Order in bot without leaving site — Telegram Web App integration
- [ ] Menu CMS — move `places[]` to a JSON endpoint so ops can edit without deploy
- [ ] Photo gallery — 2–3 images per dish (currently 1)
- [ ] Service Worker — offline-first menu, stale-while-revalidate
- [ ] Delivery ETA — show ~30 мин next to price

### 💭 Ideas parked

- AR mode (point phone at table, see the menu)
- Globe “fly to” animation on deep-link
- Story-like “today’s pick” feed

## License

Internal project for Burger Embassy Tashkent.
Built with ❤️ and no framework.