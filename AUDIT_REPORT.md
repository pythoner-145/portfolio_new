# Portfolio Site — Full-Stack Engineering Audit Report

**Scope:** `index.html`, `style.css`, `script.js` + security companions (`vercel.json`, `_headers`, `.htaccess`, `.well-known/security.txt`, `robots.txt`)
**Review basis:** Current working-tree state (no usable git history; `.git` objects unreadable; no commit/branch/PR supplied)
**Auditor role:** Expert full-stack engineer (runtime correctness, security, performance, accessibility, progressive enhancement, docs/code parity)

---

## Executive Summary

| Metric | Result |
|--------|--------|
| Crash-level / showstopper bugs | **0** |
| Syntax validity (`node --check script.js`) | **Pass (exit 0)** |
| Banned patterns (`innerHTML`, inline handlers, `style=`) | **0 violations** |
| CSP consistency (meta / `vercel.json` / `_headers` / `.htaccess`) | **Pass** |
| SRI on all CDN scripts | **Pass** |
| PII obfuscation (email/phone) | **Pass** |
| Progressive enhancement gaps | **1** |
| AGENTS.md design-token drift | **1** |

**Bottom line:** The codebase is defensive, well-architected, and security-hardened. No bugs crash, leak data, or break core functionality. Findings are a mix of one genuine progressive-enhancement gap, one AGENTS.md documentation violation, and several low-severity UX/efficiency notes.

---

## Severity Legend

- **Critical** — crash, data loss, security breach
- **High** — core feature broken
- **Medium** — degraded UX / partial feature failure / a11y or PE gap
- **Low** — doc drift, minor visual quirk, efficiency
- **Info** — observation, best-practice suggestion

---

## Findings

### F1 (Medium) — Progressive-enhancement violation: skill details hidden by CSS, only JS can reveal them

**Files:** `style.css:280-285`; `script.js:132-147`

`.skill-detail` is styled with `max-height: 0; opacity: 0; overflow: hidden;` by default and only revealed when JS adds the `.expanded` class (click or Enter/Space). `finalizeStaticState()` — the no-JS/fallback path — adds `.in-view` to skill cards but **never** adds `.expanded`.

**Realistic scenario:** A visitor with JavaScript blocked, or on a network where `script.js` fails to load, sees six skill cards but cannot read the detail paragraphs under any of them. The content exists in the DOM but is visually inaccessible.

**Why it matters:** AGENTS.md explicitly prohibits hiding content in CSS that only JS can reveal.

**Fix:** Make `.skill-detail` visible by default (or reveal it via a CSS-only fallback such as `:hover`/focus, or a `<noscript>` block), and let JS only animate/enhance the expansion. Do not rely solely on a JS-added class to expose content.

---

### F2 (Low) — `DESIGN_SPEC.md` is out of sync with `style.css` (AGENTS.md violation)

**Files:** `DESIGN_SPEC.md §2.1` vs `style.css:6-7`

`DESIGN_SPEC.md` claims:
- `--muted2`: `#7B7F8C`
- `--blue`: `#4C6EF5`

`style.css` actually defines:
- `--muted2`: `#828592`
- `--blue`: `#4A6BEE`

`--green: #3ED598` matches; remaining tokens match.

**Realistic scenario:** A designer or future contributor references the spec as the source of truth and applies the wrong color, producing off-spec visuals and rework.

**Fix:** Reconcile `DESIGN_SPEC.md` with `style.css` (decide which value is authoritative and update both). AGENTS.md requires the spec stay pixel-accurate whenever a design value changes.

---

### F3 (Low) — `initNetwork` caches `isSmallScreen` at load; density/cap don't re-evaluate on resize

**File:** `script.js:219, 401-404`

`isSmallScreen = window.matchMedia('(max-width: 800px)').matches` is evaluated once inside `initNetwork`. The `resize()` handler (debounced at 150 ms) regenerates nodes but reuses the cached `isSmallScreen`, so:
- Node cap stays at 60 (mobile) or 110 (desktop) from initial load.
- Density multiplier stays at ×0.6 or ×1.0 from initial load.

**Realistic scenario:** A desktop visitor resizes the browser below 800 px. The canvas continues rendering 110 nodes at full density instead of downshifting to 60 nodes at ×0.6 density — wasted GPU/CPU on a smaller viewport. The reverse (mobile→desktop) under-uses available screen.

**Fix (optional):** Re-read the media query inside `resize()` (or keep a `matchMedia` listener) so cap and density track the breakpoint dynamically.

---

### F4 (Info) — Safety mini-chart: cursor not reset on `mouseleave`

**File:** `script.js:575-603`

The `safety` chart's `mousemove` sets `canvas.style.cursor = 'pointer'` when near a waypoint and `'default'` otherwise. The `mouseleave` handler only resets `hoverCell`/`hoverT` for `grid` and `terminal`; it does **not** reset the cursor for `safety`.

**Realistic scenario:** After hovering over a waypoint then leaving the canvas, the cursor may remain `pointer` until the next mousemove elsewhere on the canvas. Minor visual inconsistency, no functional breakage.

---

### F5 (Info) — Scrollspy active-link can flicker when sections overlap

**File:** `script.js:203-207`

The `IntersectionObserver` uses `rootMargin: '-40% 0px -55% 0px'`. Adjacent sections can be simultaneously "intersecting," and the observer iterates all entries, toggling `.active` on each match — so the last intersecting section wins.

**Realistic scenario:** During scroll, the nav highlight can briefly flicker between two sections where the observer regions overlap. Cosmetic only; navigation still works.

---

### F6 (Info) — `.skill-detail` max-height cap may clip long text

**File:** `style.css:285`

Expanded detail is capped at `max-height: 160px` with `overflow: hidden`. Current detail strings are short enough to fit, but the cap is fixed.

**Realistic scenario:** If a skill detail is later expanded beyond ~160 px of rendered text, it will be silently clipped. No scrollbar is provided.

**Fix:** Either raise/remove the fixed cap (let content flow) or add `overflow-y: auto` to the expanded state.

---

### F7 (Info) — `security.txt` contains plaintext email

**File:** `.well-known/security.txt:1`

`Contact: mailto:vishalsensen928@gmail.com` is plaintext. This is conventional for `security.txt` (a contact file), but it is inconsistent with the site's otherwise rigorous PII-obfuscation pattern (base64 `data-enc` + `atob` + `[at]` noscript fallback).

**Realistic scenario:** Email harvesters can scrape `security.txt` while the HTML itself obfuscates the address. Not an AGENTS.md violation (that rule is HTML-scoped), but worth noting.

---

## Deep Engineering Review by Domain

### Security (Grade A — no findings)

- **CSP:** Strict, no `unsafe-inline`, identical string across meta tag / `vercel.json` / `_headers` / `.htaccess`. `frame-ancestors 'none'` correctly lives only in HTTP headers (meta cannot carry it), exactly as AGENTS.md requires.
- **SRI:** `gsap.min.js`, `ScrollTrigger.min.js`, and lazily-injected `Tone.js` all carry `integrity` + `crossorigin="anonymous"`.
- **No injection vectors:** Zero `innerHTML`; all DOM writes use `textContent` / `createElement`. Zero inline event handlers (`onclick`, etc.). Verified by grep.
- **PII:** Email and phone are base64 in `data-enc`, decoded at runtime via `atob` (verified: email → `mailto:vishalsensen928@gmail.com`, phone → `+91 93409 69265`), with `[at]`-style `<noscript>` fallback.
- **Headers:** HSTS, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `X-Frame-Options: DENY`, `Permissions-Policy` (camera/mic/geo/payment disabled), `Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy` — all present and consistent.
- **External links:** `rel="noopener noreferrer"` present.
- **Logs:** Gated behind `?debug` (`debugLog` wraps `console.error`).

### Performance (Grade A)

- `DPR = min(devicePixelRatio, 2)` — canvas never renders beyond 2× CSS pixels.
- Canvas node caps: 60 mobile / 110 desktop; density scaled ×0.6 on small screens.
- `IntersectionObserver` + `visibilitychange` pause canvas rendering when off-screen/tab-hidden.
- Debounced resize (150 ms); rAF-throttled scroll progress; `requestAnimationFrame` guarded by `rafId` (no spiral).
- Terminal scrollback capped at 40 lines; command history capped at 100 entries; input capped at 200 chars.
- GSAP `quickTo` for card tilt (efficient, no per-frame tween creation).
- `document.fonts.ready` → `ScrollTrigger.refresh()` to counter webfont layout shift.
- O(n²) canvas connection drawing is bounded by the 110-node cap (~6,670 pair checks/frame) — acceptable at current scale, but do not raise the cap without re-evaluating.

### Accessibility (Grade A)

- `prefers-reduced-motion` honored in CSS (`animation:none; transition:none`) and JS (no node drift, static canvas unless pointer, no tilt, `scrollIntoView` behavior `auto`, terminal static text).
- `focus-visible` outlines on nav links, sound toggle, nav toggle, text links, buttons, skill cards.
- Full keyboard access: nav (Esc closes, outside-click closes), skill cards (Enter/Space toggle, `aria-expanded` synced), terminal (Enter submit, Up/Down history).
- `aria-live="polite"` on terminal output; `role=textbox` + hidden input pattern for terminal.
- `aria-label`/`aria-expanded` on nav toggle; skill-card `aria-label` refined with actual skill name.

### Progressive Enhancement (Grade B — dragged down by F1)

- Content is **not** hidden in CSS that only JS can reveal — except `.skill-detail` (F1).
- `.reveal` has no CSS hiding rule; JS hides via GSAP only after confirming it can animate; 3-second safety net forces `.reveal`/hero visible regardless.
- `finalizeStaticState()` guarantees stat counters and skill-bar fills reach end state without GSAP.
- Hero terminal degrades gracefully to static `whoami` text when GSAP is absent or motion is reduced.

### Code Correctness (deep walkthrough)

- **Terminal (`runCommand`, `enableLiveTerminal`, `runTerminalIntro`):** Command parsing is safe (trim, max-length 200, history caps, `cd` target whitelisted against `TERMINAL_SECTIONS`). `sudo` is intercepted before the generic `command not found` branch. `clear` wipes output after echoing the command (standard terminal behavior). No crash paths found; all `getElementById` results are null-checked before use.
- **Sound:** `Tone.js` lazy-loaded with `onerror` fallback; `uiSynth` creation wrapped in try/catch; `playTick` rate-limited at 60 ms; `Tone.start()` called on user gesture.
- **Cursor:** `mousemove` tracked; `hovering` class added/removed on `mouseenter`/`mouseleave` for interactive elements; hidden on `hover:none` (touch) and when JS not ready.
- **Nav toggle:** `body.style.overflow` locked on open, restored on close; Escape and outside-click handlers present.
- **Scroll progress + scrollspy:** `pct` clamped 0–100; guards against `scrollable === 0`.
- **Canvas networks:** `resize()` recomputes backing-store dimensions with DPR; nodes regenerated; pointer attract and links bounded by `maxDist`; anchors only rendered at `cssW >= 900`; paused when hidden; static frame under reduced motion.
- **Mini charts:** Grid/terminal/safety each maintain persistent closure state generated once (`ensureData`). Safety click uses `textContent`/`appendChild` (no `innerHTML`) for the caption — future API data cannot become XSS.
- **Deobfuscation:** `try/catch` around `atob`; falls back to `#contact` href if email decode fails; phone only set if decode succeeds.

---

## Compliance Checklist vs AGENTS.md

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Static site only, no build step | Pass | HTML/CSS/JS only |
| Strict CSP (no inline scripts/styles/handlers, no `innerHTML`) | Pass | grep clean; `textContent`/`createElement` only |
| SRI on every CDN script | Pass | GSAP + ScrollTrigger + dynamic Tone.js all have `integrity` |
| CSP identical across meta / `vercel.json` / `_headers` / `.htaccess` | Pass | `frame-ancestors 'none'` header-only per spec |
| Readable with JS/CDNs blocked (progressive enhancement) | Partial | F1: `.skill-detail` CSS-hidden without JS |
| `prefers-reduced-motion`, `focus-visible`, full keyboard access | Pass | Verified in all subsystems |
| PII obfuscated + `[at]` noscript fallback | Pass | Verified decode; security.txt noted (F7) |
| `node --check script.js` + banned-pattern grep before finishing | Pass | exit 0; zero matches |

---

## Recommended Action Items

1. **Fix F1 (required for AGENTS.md compliance):** Reveal `.skill-detail` without requiring JS (CSS-only default visibility or `:hover`/focus fallback, plus `<noscript>`). Do not hide content behind a JS-added class.
2. **Fix F2:** Reconcile `DESIGN_SPEC.md` with `style.css` for `--blue` and `--muted2`; keep the spec pixel-accurate going forward.
3. **Optional — F3:** Recompute `isSmallScreen` inside `resize()` so canvas density/cap track the 800 px breakpoint.
4. **Optional — F4/F5/F6:** Reset safety-chart cursor on `mouseleave`; review scrollspy `rootMargin` overlap; make skill-detail overflow scrollable or remove the fixed `max-height` cap.
5. **Optional — F7:** Decide whether to obfuscate the `security.txt` contact or accept it as standard convention.

---

**Note:** No diff-based review was possible because the `.git` directory is present but unreadable (OneDrive placeholders). To review a specific commit, branch, or PR, make git functional in this directory first, then supply the reference.
