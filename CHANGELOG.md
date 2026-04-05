# Intrigue Map — Release Notes

---

## v1.2.0 — Chat Commands & Open Fallbacks
*Current release*

### New Features

**Chat commands**
Type either of the following in any chat window to open the Intrigue Map instantly. The command is silently consumed — nothing appears in the chat log.

```
/intrigue
/im
```

Works for the GM and any player who has the module enabled.

**Keyboard shortcut**
`Ctrl+Shift+I` now opens the map from anywhere in Foundry. The binding is fully remappable via **Settings → Configure Controls**.

**Macro / console fallback**
The app class is exposed globally, so you can always open the map by running the following in the browser console (`F12`) or in a Foundry macro:

```js
IntrigueMapApp.openDefault()
```

### Bug Fixes

- Fixed: scene control button title was displaying the raw translation key (`INTRIGUEMAP.OpenMap`) instead of the localised string "Open Intrigue Map" on Foundry V13.
- Fixed: scene control button failed to appear on some V13 builds where the Notes group key was not `"notes"`. The module now falls back to scanning the controls Map by group name and icon.
- Fixed: `onChange` handler was receiving an `active` boolean but the button was defined as `button: true` (stateless), causing the map to open only on the first click on certain V13 builds. Handler simplified to fire unconditionally.

### Compatibility

| Foundry Version | Status |
|---|---|
| V13 (13.341 – 13.351) | ✅ Verified |
| V12 | ✅ Supported |
| V11 and below | ❌ Not supported |

---

## v1.1.0 — Foundry V13 Compatibility
*Released after initial V13 stable launch*

### What's New

Full compatibility with **Foundry VTT Version 13** (verified 13.341), while maintaining backwards compatibility with V12. No map data migration required.

### V13 API Changes Addressed

**ApplicationV2 migration**
The module now extends `ApplicationV2` via `HandlebarsApplicationMixin` when running on V13. Detected at runtime — V12 continues to use the legacy `Application` base class. The window renders correctly under Theme V2 including automatic light/dark mode from OS settings.

**Updated render lifecycle**
V13 replaced `getData()` and `activateListeners(html)` with `_prepareContext()` and `_onRender()`. Both lifecycle paths are implemented and delegate to a shared internal method.

**Scene controls hook**
`getSceneControlButtons` now receives a `Map` in V13 (previously an `Array`). Toolbar buttons require `onChange` instead of `onClick`. Both formats handled.

**DialogV2**
`Dialog.prompt` and `Dialog.confirm` are deprecated in V13. All dialogs now route to `DialogV2` on V13 with automatic fallback to the legacy `Dialog` API on V12.

### Bug Fixes

- Fixed: scene control button threw a console error on V13 due to missing `onChange` handler.
- Fixed: Configure Node and Clear Map dialogs failed to open on V13 after `Dialog.prompt` / `Dialog.confirm` were removed from core.

### Compatibility

| Foundry Version | Status |
|---|---|
| V13 (13.341+) | ✅ Verified |
| V12 | ✅ Supported |
| V11 and below | ❌ Not supported |

---

## v1.0.0 — Initial Release

### Features

**Four node types**
Nodes are colour-coded by type: PC (blue), NPC (red), Event (amber), Place (green). Each node displays a type badge, an editable name, and an optional sub-label (e.g. *Monster*, *Leader*, *Place*).

**Freeform canvas**
All nodes are freely draggable. Edges between nodes update in real time as nodes are moved.

**Inline name editing**
Click any node name to edit it in place. Changes are saved automatically on blur.

**Directed, labelled edges**
Enter link mode, click a source node then a target node, and enter a relationship label (e.g. *"wanted"*, *"performed by"*, *"haunted by"*). Leave the label blank when linking two PC/NPC nodes to draw a dashed mesh line instead.

**Actor sheet linking**
Double-click any node to open the Configure dialog. Pick any actor from your world via dropdown to bind it to the node. A ⊞ badge appears on the node — clicking it opens the linked actor sheet directly.

**Persistent storage**
Map data is stored as a world setting and survives page reloads and server restarts. No external database required.

**Scene controls button**
A spider-web icon is added to the Notes tool group in the scene controls sidebar.

**Internationalisation**
All UI strings are defined in `lang/en.json` and can be overridden by translation modules.

### Compatibility

| Foundry Version | Status |
|---|---|
| V12 | ✅ Verified |
| V11 and below | ❌ Not supported |

---

## Installation

**Manifest URL (recommended):**
```
https://raw.githubusercontent.com/Aniond/intrigue-map/main/module.json
```

Paste this into **Setup → Add-on Modules → Install Module → Manifest URL** and click Install.

**Manual:**
Download `intrigue-map.zip` from the release assets and extract it into your Foundry `Data/modules/` folder. Restart Foundry to detect the new module.
