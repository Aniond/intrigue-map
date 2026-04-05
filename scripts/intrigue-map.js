/**
 * Intrigue Map — Foundry VTT Module
 * github.com/Aniond/intrigue-map
 *
 * Compatible with Foundry VTT v12 and v13.351+.
 *
 * V13 breaking changes addressed:
 *  - Application → ApplicationV2 (HandlebarsApplicationMixin)
 *  - getData() → _prepareContext()
 *  - activateListeners(html) → _onRender(context, options)
 *  - Dialog.prompt / Dialog.confirm → DialogV2.prompt / DialogV2.confirm
 *  - getSceneControlButtons: V13 receives a Map, not an array
 *  - SceneControl button uses onChange instead of onClick
 */

const MODULE_ID = "intrigue-map";

// ── Registration ──────────────────────────────────────────────────────────────

Hooks.once("init", () => {
  console.log(`${MODULE_ID} | Init (Foundry ${game.version})`);

  game.settings.register(MODULE_ID, "mapData", {
    name:    "Intrigue Map Data",
    scope:   "world",
    config:  false,
    type:    Object,
    default: { nodes: [], edges: [] },
  });
});

// ── Scene controls ────────────────────────────────────────────────────────────
// V13: controls is a Map<string, group>; tools inside each group is also a Map.
// V12: controls is a plain Array; tools is a plain Array.
// We also register a Ctrl+Shift+I keybinding as a reliable fallback.

Hooks.on("getSceneControlButtons", (controls) => {
  const label = game.i18n.localize("INTRIGUEMAP.OpenMap");

  // V13: controls is a Map<string, group>; tools is also a Map.
  if (typeof controls.get !== "function") return;
  let group = controls.get("notes");
  if (!group) {
    for (const [, g] of controls) {
      if (g.name === "notes" || g.icon === "fa-bookmark") { group = g; break; }
    }
  }
  if (group && group.tools instanceof Map) {
    group.tools.set("intrigue-map", {
      name:     "intrigue-map",
      title:    label,
      icon:     "fas fa-spider-web",
      button:   true,
      onChange: () => IntrigueMapApp.openDefault(),
    });
  }
});

// Keybinding fallback: Ctrl+Shift+I always opens the map
Hooks.once("ready", () => {
  game.keybindings?.register(MODULE_ID, "openMap", {
    name:     game.i18n.localize("INTRIGUEMAP.OpenMap"),
    hint:     "Open the Intrigue Map window",
    editable: [{ key: "KeyI", modifiers: ["Control", "Shift"] }],
    onDown:   () => { IntrigueMapApp.openDefault(); return true; },
  });
  console.log(`${MODULE_ID} | Ready — Ctrl+Shift+I or /intrigue in chat`);
});

// ── Chat command ──────────────────────────────────────────────────────────────
// V13: ChatLog.registerCommand() must be used — unknown /commands are rejected
//      before the chatMessage hook fires.
// V12: chatMessage hook with return false is sufficient.

Hooks.once("setup", () => {
  for (const cmd of ["intrigue", "im"]) {
    ChatLog.registerCommand({
      name:        cmd,
      module:      MODULE_ID,
      description: game.i18n.localize("INTRIGUEMAP.OpenMap"),
      icon:        "fas fa-spider-web",
      callback:    () => IntrigueMapApp.openDefault(),
    });
  }
});

// ── Persistence ───────────────────────────────────────────────────────────────

function getMapData()      { return foundry.utils.deepClone(game.settings.get(MODULE_ID, "mapData")); }
async function saveMapData(data) { return game.settings.set(MODULE_ID, "mapData", data); }
function makeId()          { return foundry.utils.randomID(8); }

// ── Dialog compat shims ───────────────────────────────────────────────────────

async function imPrompt({ title, content, callback }) {
  const DV2 = foundry.applications.api.DialogV2;
  let result = null;
  await DV2.prompt({
    window:  { title },
    content,
    ok: {
      // DialogV2 passes (event, button, dialogInstance) — use .element for the DOM
      callback: (_event, _button, dialogInstance) => {
        result = callback(dialogInstance?.element ?? dialogInstance);
      },
    },
  });
  return result;
}

async function imConfirm({ title, content, yes }) {
  const DV2 = foundry.applications.api.DialogV2;
  await DV2.confirm({ window: { title }, content, yes: { callback: yes } });
}

// ── IntrigueMapApp ───────────────────────────────────────────────────────────
// Always use ApplicationV2 (available in V12+). The old Application base class
// is deprecated in V13 and removed in V16, so we no longer fall back to it.
// foundry.applications.api is available immediately at script parse time.

function buildApp() {

  const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;
  const Base = HandlebarsApplicationMixin(ApplicationV2);

  class IntrigueMapApp extends Base {

    constructor(options = {}) {
      super(options);
      this.mapData     = getMapData();
      this._dragging   = null;
      this._linkMode   = false;
      this._linkSource = null;
      this._selected   = null;
    }

    // ── V13 static config ───────────────────────────────────────────────────

    static DEFAULT_OPTIONS = {
      id:       "intrigue-map-app",
      classes:  ["intrigue-map-window"],
      window:   { title: "INTRIGUEMAP.Title", resizable: true, minimizable: true },
      position: { width: 900, height: 620 },
    };

    static PARTS = {
      main: { template: `modules/${MODULE_ID}/templates/intrigue-map.html` },
    };

    // ── Singleton opener ────────────────────────────────────────────────────

    static openDefault() {
      if (!IntrigueMapApp._instance) IntrigueMapApp._instance = new IntrigueMapApp();
      IntrigueMapApp._instance.render({ force: true });
    }

    // ── Data ─────────────────────────────────────────────────────────────────

    async _prepareContext() {
      return {
        nodes:  this.mapData.nodes ?? [],
        edges:  this.mapData.edges ?? [],
        actors: game.actors.map((a) => ({ id: a.id, name: a.name, type: a.type })),
      };
    }

    // ── Listener binding ────────────────────────────────────────────────────

    _onRender() {
      this._bindListeners(this.element);
    }

    _bindListeners(root) {
      this._root   = root;
      this._canvas = root.querySelector("#im-canvas");
      this._svg    = root.querySelector("#im-edges");

      const on = (sel, fn) => root.querySelector(sel)?.addEventListener("click", fn);
      on(".im-btn[data-action='add-pc']",    () => this._addNode("pc"));
      on(".im-btn[data-action='add-npc']",   () => this._addNode("npc"));
      on(".im-btn[data-action='add-event']", () => this._addNode("event"));
      on(".im-btn[data-action='add-place']", () => this._addNode("place"));
      on(".im-btn[data-action='link']",      () => this._toggleLink());
      on(".im-btn[data-action='delete']",    () => this._deleteSelected());
      on(".im-btn[data-action='save']",      () => this._save());
      on(".im-btn[data-action='clear']",     () => this._clearMap());

      (this.mapData.nodes ?? []).forEach((n) => this._renderNode(n));
      this._renderEdges();

      this._mmHandler = this._onMouseMove.bind(this);
      this._muHandler = this._onMouseUp.bind(this);
      document.addEventListener("mousemove", this._mmHandler);
      document.addEventListener("mouseup",   this._muHandler);
    }

    // ── Close ───────────────────────────────────────────────────────────────

    async close(options) {
      document.removeEventListener("mousemove", this._mmHandler);
      document.removeEventListener("mouseup",   this._muHandler);
      IntrigueMapApp._instance = null;
      return super.close(options);
    }

    // ── Node management ─────────────────────────────────────────────────────

    _addNode(type) {
      const node = {
        id:      makeId(),
        type,
        name:    game.i18n.localize(`INTRIGUEMAP.NewNode.${type}`),
        sub:     "",
        actorId: null,
        x:       160 + Math.random() * 350,
        y:       120 + Math.random() * 220,
      };
      this.mapData.nodes.push(node);
      this._renderNode(node);
      this._renderEdges();
      this._save();
    }

    _renderNode(node) {
      this._canvas.querySelector(`#im-node-${node.id}`)?.remove();

      const el = document.createElement("div");
      el.className  = `im-node im-node-${node.type}`;
      el.id         = `im-node-${node.id}`;
      el.dataset.id = node.id;
      el.style.left = node.x + "px";
      el.style.top  = node.y + "px";

      const typeLabel = { pc:"PC", npc:"NPC", event:"Event", place:"Place" }[node.type] ?? node.type;
      const badge = node.actorId
        ? `<span class="im-actor-link" title="${game.i18n.localize("INTRIGUEMAP.OpenActor")}">⊞</span>`
        : "";

      el.innerHTML = `
        <div class="im-node-inner">
          <div class="im-node-header">
            <span class="im-node-type">${typeLabel}</span>${badge}
          </div>
          <div class="im-node-name" contenteditable="true" spellcheck="false">${node.name}</div>
          ${node.sub ? `<div class="im-node-sub">${node.sub}</div>` : ""}
        </div>`;

      el.addEventListener("mousedown", (e) => this._startDrag(e, node));
      el.querySelector(".im-node-name").addEventListener("mousedown", (e) => e.stopPropagation());
      el.querySelector(".im-node-name").addEventListener("blur", () => {
        node.name = el.querySelector(".im-node-name").textContent.trim();
        this._save();
      });
      el.addEventListener("click",    (e) => this._nodeClick(e, node));
      el.addEventListener("dblclick", ()  => this._configureNode(node));
      el.querySelector(".im-actor-link")?.addEventListener("click", (e) => {
        e.stopPropagation();
        this._openActor(node.actorId);
      });

      this._canvas.appendChild(el);
    }

    _nodeClick(e, node) {
      if (this._linkMode) {
        if (!this._linkSource) {
          this._linkSource = node.id;
          this._canvas.querySelector(`#im-node-${node.id}`)?.classList.add("im-selected");
        } else if (this._linkSource !== node.id) {
          this._promptEdge(this._linkSource, node.id);
          this._canvas.querySelector(`#im-node-${this._linkSource}`)?.classList.remove("im-selected");
          this._linkSource = null;
        }
        return;
      }
      if (this._selected) this._canvas.querySelector(`#im-node-${this._selected}`)?.classList.remove("im-selected");
      this._selected = node.id;
      this._canvas.querySelector(`#im-node-${node.id}`)?.classList.add("im-selected");
    }

    async _configureNode(node) {
      // Build actor lookup map as JSON so the inline onchange handler can resolve names
      const actorMap = Object.fromEntries(game.actors.map((a) => [a.id, a.name]));
      const actorMapJSON = JSON.stringify(actorMap).replace(/"/g, "&quot;");

      const opts = `<option value="">— None —</option>` +
        game.actors.map((a) =>
          `<option value="${a.id}"${a.id===node.actorId?" selected":""}>${a.name} (${a.type})</option>`
        ).join("");

      // Attach the actor→name listener after the dialog renders via a small script tag.
      // We pass the map via a hidden input to avoid quoting issues in HTML attributes.
      const result = await imPrompt({
        title:   game.i18n.localize("INTRIGUEMAP.Config.Title"),
        content: `<div class="im-config-dialog">
          <input type="hidden" name="actorMapData" value="${actorMapJSON}"/>
          <label>${game.i18n.localize("INTRIGUEMAP.Config.Name")}<input type="text" name="name" value="${node.name}"/></label>
          <label>${game.i18n.localize("INTRIGUEMAP.Config.Sub")}<input type="text" name="sub" value="${node.sub ?? ""}"/></label>
          <label>${game.i18n.localize("INTRIGUEMAP.Config.Actor")}
            <select name="actorId">${opts}</select>
          </label>
        </div>
        <script>
          (function() {
            // Wait one tick for the dialog DOM to be fully inserted
            setTimeout(function() {
              const dlg   = document.querySelector(".im-config-dialog");
              if (!dlg) return;
              const sel   = dlg.querySelector("[name='actorId']");
              const nameI = dlg.querySelector("[name='name']");
              const raw   = dlg.querySelector("[name='actorMapData']")?.value ?? "{}";
              const map   = JSON.parse(raw.replace(/&quot;/g, '"'));
              if (!sel || !nameI) return;
              sel.addEventListener("change", function() {
                if (this.value && map[this.value]) {
                  nameI.value = map[this.value];
                }
              });
            }, 50);
          })();
        <\/script>`,
        callback: (el) => ({
          name:    el.querySelector("[name='name']")?.value ?? node.name,
          sub:     el.querySelector("[name='sub']")?.value ?? "",
          actorId: el.querySelector("[name='actorId']")?.value || null,
        }),
      });

      if (!result) return;
      Object.assign(node, result);
      this._renderNode(node);
      this._renderEdges();
      this._save();
    }

    _openActor(actorId) {
      const actor = game.actors.get(actorId);
      if (actor) actor.sheet.render(true);
      else ui.notifications.warn(game.i18n.localize("INTRIGUEMAP.NoActor"));
    }

    _deleteSelected() {
      if (!this._selected) return;
      const id = this._selected;
      this.mapData.edges = this.mapData.edges.filter((e) => e.from !== id && e.to !== id);
      this.mapData.nodes = this.mapData.nodes.filter((n) => n.id !== id);
      this._canvas.querySelector(`#im-node-${id}`)?.remove();
      this._selected = null;
      this._renderEdges();
      this._save();
    }

    _clearMap() {
      imConfirm({
        title:   game.i18n.localize("INTRIGUEMAP.Clear.Title"),
        content: `<p>${game.i18n.localize("INTRIGUEMAP.Clear.Confirm")}</p>`,
        yes: () => {
          this.mapData = { nodes: [], edges: [] };
          this._canvas.innerHTML = "";
          this._renderEdges();
          this._save();
        },
      });
    }

    // ── Edges ───────────────────────────────────────────────────────────────

    _promptEdge(from, to) {
      imPrompt({
        title:   game.i18n.localize("INTRIGUEMAP.Edge.Title"),
        content: `<label>${game.i18n.localize("INTRIGUEMAP.Edge.Label")}<input type="text" name="label" style="width:100%"/></label>`,
        callback: (el) => {
          const label = (el.querySelector("[name='label']")?.value ?? "").trim();
          const fn = this.mapData.nodes.find((n) => n.id === from);
          const tn = this.mapData.nodes.find((n) => n.id === to);
          const pcLink = !label && ["pc","npc"].includes(fn?.type) && ["pc","npc"].includes(tn?.type);
          this.mapData.edges.push({ from, to, label, pcLink });
          this._renderEdges();
          this._save();
          return true;
        },
      });
    }

    _renderEdges() {
      while (this._svg.firstChild) this._svg.removeChild(this._svg.firstChild);

      const defs = document.createElementNS("http://www.w3.org/2000/svg","defs");
      defs.innerHTML = `<marker id="im-arr" viewBox="0 0 10 10" refX="8" refY="5"
          markerWidth="5" markerHeight="5" orient="auto-start-reverse">
        <path d="M2 1L8 5L2 9" fill="none" stroke="rgba(80,50,20,0.55)"
              stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </marker>`;
      this._svg.appendChild(defs);

      (this.mapData.edges ?? []).forEach((e) => {
        const fn = this.mapData.nodes.find((n) => n.id === e.from);
        const tn = this.mapData.nodes.find((n) => n.id === e.to);
        if (!fn || !tn) return;

        const line = document.createElementNS("http://www.w3.org/2000/svg","line");
        line.setAttribute("x1", fn.x); line.setAttribute("y1", fn.y);
        line.setAttribute("x2", tn.x); line.setAttribute("y2", tn.y);
        line.classList.add("im-edge");
        if (e.pcLink) line.classList.add("im-edge-pc");
        line.setAttribute("marker-end","url(#im-arr)");
        this._svg.appendChild(line);

        if (e.label) {
          const mx=(fn.x+tn.x)/2, my=(fn.y+tn.y)/2;
          const dx=tn.x-fn.x, dy=tn.y-fn.y;
          const len=Math.sqrt(dx*dx+dy*dy)||1;
          const t = document.createElementNS("http://www.w3.org/2000/svg","text");
          t.setAttribute("x", mx - dy/len*14);
          t.setAttribute("y", my + dx/len*14);
          t.setAttribute("class","im-edge-label");
          t.setAttribute("text-anchor","middle");
          t.setAttribute("dominant-baseline","central");
          t.textContent = e.label;
          this._svg.appendChild(t);
        }
      });
    }

    // ── Drag ────────────────────────────────────────────────────────────────

    _startDrag(e, node) {
      if (this._linkMode) return;
      const rect = this._canvas.getBoundingClientRect();
      this._dragging = { node, ox: e.clientX - rect.left - node.x, oy: e.clientY - rect.top - node.y };
      e.preventDefault();
    }

    _onMouseMove(e) {
      if (!this._dragging) return;
      const rect = this._canvas.getBoundingClientRect();
      const { node, ox, oy } = this._dragging;
      node.x = e.clientX - rect.left - ox;
      node.y = e.clientY - rect.top  - oy;
      const el = this._canvas.querySelector(`#im-node-${node.id}`);
      if (el) { el.style.left = node.x + "px"; el.style.top = node.y + "px"; }
      this._renderEdges();
    }

    _onMouseUp() {
      if (this._dragging) { this._dragging = null; this._save(); }
    }

    // ── Link mode ────────────────────────────────────────────────────────────

    _toggleLink() {
      this._linkMode = !this._linkMode;
      this._linkSource = null;
      this._root?.querySelector(".im-btn[data-action='link']")
        ?.classList.toggle("im-btn-active", this._linkMode);
      if (this._canvas) this._canvas.style.cursor = this._linkMode ? "crosshair" : "";
    }

    // ── Save ─────────────────────────────────────────────────────────────────

    async _save() {
      await saveMapData(this.mapData);
    }
  }

  return IntrigueMapApp;
}

// Build and expose globally
const IntrigueMapApp = buildApp();
globalThis.IntrigueMapApp = IntrigueMapApp;
