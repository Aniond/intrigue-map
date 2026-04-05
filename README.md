# Intrigue Map — Foundry VTT Module

A node-based relationship map for Foundry VTT. Track connections between PCs, NPCs, Events, and Places on a freeform canvas — inspired by the intrigue map in the TTRPG core book.

![Intrigue Map preview](docs/preview.png)

## Features

- **Four node types** — PC (blue), NPC (red), Event (amber), Place (green)
- **Actor sheet linking** — double-click any PC or NPC node to bind it to a Foundry actor; click the ⊞ icon to open its sheet instantly
- **Freeform canvas** — drag nodes anywhere; edges update in real time
- **Labelled edges** — draw directed relationships with custom labels (e.g. *"wanted"*, *"performed by"*, *"haunted by"*); leave blank for a dashed PC-mesh link
- **Inline name editing** — click the node name to rename it in place
- **Persistent storage** — maps are saved as a world setting and survive reloads
- **Scene controls button** — open the map from the Notes sidebar tool

## Installation

### From the Foundry module browser
Search for **Intrigue Map** (once published to the package list).

### Manual
1. Open Foundry → **Add-on Modules** → **Install Module**
2. Paste the manifest URL:
   ```
   https://raw.githubusercontent.com/Aniond/intrigue-map/main/module.json
   ```
3. Click **Install** and enable the module in your world.

## Usage

1. Open your world and enable **Intrigue Map** in Module Settings.
2. Click the 🕷 icon in the **Notes** scene control bar (left sidebar).
3. Use the toolbar to add nodes, draw links, and configure actors.

### Toolbar reference

| Button | Action |
|--------|--------|
| **PC / NPC / Event / Place** | Add a new node of that type |
| **Link** | Enter link mode — click source node, then target; enter a label |
| **Delete** | Remove the selected node and all its edges |
| **💾 Save** | Force-save (auto-saves on drag release too) |
| **✕ Clear** | Wipe the whole map (with confirmation) |

### Linking a node to an actor
Double-click any node → pick an actor from the **Link to Actor** dropdown → OK.  
An ⊞ badge appears on the node. Click it to open the actor sheet.

## Contributing

Pull requests are welcome. Please open an issue first for larger changes.

```
git clone https://github.com/Aniond/intrigue-map.git
```

Place the cloned folder inside your Foundry `Data/modules/` directory and enable it in your world.

## Roadmap

- [ ] Multiple named maps per world
- [ ] Edge colour picker
- [ ] Export map as PNG
- [ ] Journal entry linking (not just actors)
- [ ] Zoom / pan the canvas

## License

MIT — see [LICENSE](LICENSE).
