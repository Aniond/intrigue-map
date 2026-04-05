# Intrigue Map v1.1.0 — Foundry V13 Compatibility

## Overview

This release brings full compatibility with **Foundry VTT Version 13 (verified 13.351)** while maintaining backwards compatibility with V12. No map data migration is required — your existing intrigue maps will load without any changes.

---

## What's New

### ✅ Foundry V13 Support

Intrigue Map is now verified compatible with Foundry VTT V13.351. All six of V13's breaking API changes have been addressed:

**ApplicationV2 migration**
The module now extends `ApplicationV2` via `HandlebarsApplicationMixin` when running on V13. The window renders correctly under the new Theme V2 UI system, including automatic light/dark mode support from your OS settings.

**Updated render lifecycle**
V13 replaced `getData()` and `activateListeners(html)` with `_prepareContext()` and `_onRender()`. Both the old and new lifecycle hooks are implemented so the module runs correctly on either version without any config changes.

**Scene controls hook**
The `getSceneControlButtons` hook signature changed in V13 — it now receives a `Map` instead of an array, and toolbar buttons require `onChange` instead of `onClick`. The module detects which format it receives at runtime and handles both correctly.

**DialogV2**
Foundry V13 deprecated `Dialog.prompt` and `Dialog.confirm` in favour of the new `DialogV2` API. All configure-node and confirm-clear dialogs now use `DialogV2` on V13, with an automatic fallback to the legacy `Dialog` API on V12.

---

## Compatibility

| Foundry Version | Status |
|---|---|
| V13 (13.341 – 13.351) | ✅ Verified |
| V12 | ✅ Supported |
| V11 and below | ❌ Not supported |

---

## Upgrading

No action required beyond updating the module. If you installed via the manifest URL, Foundry will offer the update automatically. If you installed manually, replace the module folder with the contents of the zip attached to this release.

Your map data is stored as a world setting and is unaffected by the update.

---

## Bug Fixes

- Fixed: Scene control button caused a console error on V13 due to missing `onChange` handler (previously used `onClick` which V13 no longer accepts).
- Fixed: Configure Node dialog failed to open on V13 because `Dialog.prompt` was removed from the core API.
- Fixed: Clear Map confirmation dialog threw an unhandled exception on V13.

---

## Full Changelog

**v1.1.0** vs **v1.0.0**

- `module.json`: compatibility updated to `minimum: 12`, `verified: 13`, `maximum: 13`
- `scripts/intrigue-map.js`: ApplicationV2 class path with V12 fallback via runtime version detection
- `scripts/intrigue-map.js`: `_prepareContext()` added alongside `getData()` for V13 render lifecycle
- `scripts/intrigue-map.js`: `_onRender()` added alongside `activateListeners()` for V13 listener binding
- `scripts/intrigue-map.js`: `getSceneControlButtons` hook handles both Map (V13) and Array (V12) argument shapes
- `scripts/intrigue-map.js`: `imPrompt()` and `imConfirm()` shims route to `DialogV2` on V13, `Dialog` on V12

---

## Installation

**Manifest URL:**
```
https://raw.githubusercontent.com/Aniond/intrigue-map/main/module.json
```

Or download `intrigue-map.zip` from the assets below and install manually via **Add-on Modules → Install Module → Install from zip**.
