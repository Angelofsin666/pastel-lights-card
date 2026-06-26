// ============================================================================
// Pastel Lights Card — custom Lovelace card for Home Assistant / HACS
// ============================================================================

// LitElement, html, css imported directly from CDN — this is the robust,
// version-stable approach recommended for modern HACS cards (avoids relying
// on Home Assistant's internal, undocumented component structure).
const { LitElement, html, css } = await import(
  "https://unpkg.com/lit-element@2/lit-element.js?module"
);
const { unsafeHTML } = await import(
  "https://unpkg.com/lit-html@1/directives/unsafe-html.js?module"
);

// ----------------------------------------------------------------------------
// Color palette (pastel tones consistent with the rest of the dashboard)
// ----------------------------------------------------------------------------
const PALETTE = {
  amber:  { base: "#f59e0b", light: "#fde68a", bg: "#fef3c7", glow: "#fef08a", text: "#d97706" },
  blue:   { base: "#3d9cf0", light: "#b8dafc", bg: "#e8f3fe", glow: "#dbeafe", text: "#3d9cf0" },
  green:  { base: "#34c472", light: "#bdeed4", bg: "#e6f9ef", glow: "#dcfce7", text: "#1f9d5c" },
  pink:   { base: "#ec4899", light: "#fbcfe8", bg: "#fce7f3", glow: "#fdf2f8", text: "#db2777" },
  purple: { base: "#9b5de5", light: "#ddd1f7", bg: "#f3ecff", glow: "#ede9fe", text: "#8b3fd9" },
  red:    { base: "#f05252", light: "#fac9c9", bg: "#fee8e8", glow: "#fef2f2", text: "#e03c3c" },
  teal:   { base: "#20c997", light: "#a8e8d3", bg: "#e6faf4", glow: "#d1fae5", text: "#159b76" },
  orange: { base: "#f0943d", light: "#fcd9b0", bg: "#fef3e8", glow: "#fff7ed", text: "#d9762a" },
};
const PALETTE_KEYS = Object.keys(PALETTE);

function getColors(key) {
  return PALETTE[key] || PALETTE.amber;
}

// ----------------------------------------------------------------------------
// Bulb SVG (reuses the same visual language as the original button-card SVG)
// ----------------------------------------------------------------------------
function bulbSvg(colors, isOn, size = 56) {
  const fill = isOn ? colors.light : "#d8dde3";
  const stroke = isOn ? colors.base : "#b8c0cc";
  const glow = isOn ? colors.glow : "#eef0f3";
  const base1 = isOn ? colors.light : "#c7cdd6";
  const base2 = isOn ? colors.base : "#aab1bd";
  const base3 = isOn ? colors.text : "#8b93a1";
  const h = Math.round(size * 1.32);
  return `
    <svg width="${size}" height="${h}" viewBox="0 0 44 60" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 22 C8 14 14 8 22 8 C30 8 36 14 36 22 C36 29 32 33 30 37 L14 37 C12 33 8 29 8 22Z"
            fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>
      <ellipse cx="22" cy="21" rx="8" ry="7" fill="${glow}" opacity="0.65"/>
      <path d="M17 28 Q20 24 22 27 Q24 30 27 26" stroke="${stroke}" stroke-width="1.5"
            stroke-linecap="round" fill="none" opacity="0.8"/>
      <rect x="14" y="37" width="16" height="3" rx="1.5" fill="${base1}"/>
      <rect x="15" y="40" width="14" height="3" rx="1.5" fill="${base2}"/>
      <rect x="16" y="43" width="12" height="3" rx="1.5" fill="${base3}"/>
    </svg>`;
}

// ----------------------------------------------------------------------------
// Card
// ----------------------------------------------------------------------------
class PastelLightsCard extends LitElement {

  static get properties() {
    return {
      hass: {},
      config: {},
      _expandedEntity: { state: true },
    };
  }

  static getStubConfig() {
    return {
      title: "Esterni",
      subtitle: "Luci esterne",
      icon: "mdi:outdoor-lamp",
      color: "amber",
      entities: [],
    };
  }

  setConfig(config) {
    if (!config) {
      throw new Error("Configurazione non valida");
    }
    if (!Array.isArray(config.entities)) {
      throw new Error("Devi specificare almeno un'entità luce (entities: [...])");
    }
    this.config = {
      title: config.title || "Luci",
      subtitle: config.subtitle || "",
      icon: config.icon || "mdi:lightbulb-group",
      color: PALETTE_KEYS.includes(config.color) ? config.color : "amber",
      entities: config.entities,
      show_progress_bar: config.show_progress_bar !== false,
    };
  }

  getCardSize() {
    const n = (this.config && this.config.entities) ? this.config.entities.length : 1;
    return 2 + Math.ceil(n / 2);
  }

  static getConfigElement() {
    return document.createElement("pastel-lights-card-editor");
  }

  // -- helpers ---------------------------------------------------------------

  _entityIds() {
    return (this.config.entities || []).map((e) =>
      typeof e === "string" ? e : e.entity
    );
  }

  _entityLabel(entConf) {
    const id = typeof entConf === "string" ? entConf : entConf.entity;
    if (typeof entConf === "object" && entConf.name) return entConf.name;
    const stateObj = this.hass.states[id];
    return stateObj ? (stateObj.attributes.friendly_name || id) : id;
  }

  _entityIcon(entConf, isOn) {
    const id = typeof entConf === "string" ? entConf : entConf.entity;
    if (typeof entConf === "object" && entConf.icon) return entConf.icon;
    const stateObj = this.hass.states[id];
    const customIcon = stateObj && stateObj.attributes.icon;
    if (customIcon) return customIcon;
    return isOn ? "mdi:lightbulb" : "mdi:lightbulb-outline";
  }

  _isDimmable(id) {
    const stateObj = this.hass.states[id];
    if (!stateObj) return false;
    const modes = stateObj.attributes.supported_color_modes || [];
    return modes.some((m) =>
      ["brightness", "color_temp", "hs", "rgb", "rgbw", "rgbww", "xy"].includes(m)
    );
  }

  _brightnessPct(id) {
    const stateObj = this.hass.states[id];
    if (!stateObj || stateObj.state !== "on") return 0;
    const b = stateObj.attributes.brightness;
    if (b === undefined || b === null) return 100;
    return Math.round((b / 255) * 100);
  }

  // -- actions -----------------------------------------------------------

  _toggleEntity(id, ev) {
    if (ev) ev.stopPropagation();
    this.hass.callService("homeassistant", "toggle", { entity_id: id });
  }

  _toggleAll() {
    const ids = this._entityIds();
    const anyOn = ids.some((id) => this.hass.states[id] && this.hass.states[id].state === "on");
    this.hass.callService("homeassistant", anyOn ? "turn_off" : "turn_on", { entity_id: ids });
  }

  _showMoreInfo(id, ev) {
    if (ev) ev.stopPropagation();
    const event = new Event("hass-more-info", { bubbles: true, composed: true });
    event.detail = { entityId: id };
    this.dispatchEvent(event);
  }

  _setBrightness(id, pct) {
    this.hass.callService("light", "turn_on", {
      entity_id: id,
      brightness_pct: Math.round(pct),
    });
  }

  // -- long press handling ----------------------------------------------

  _onPointerDown(id, ev) {
    this._pressTimer = setTimeout(() => {
      this._longPressed = true;
      this._showMoreInfo(id, ev);
    }, 500);
    this._longPressed = false;
  }

  _onPointerUp(id, ev) {
    clearTimeout(this._pressTimer);
    if (!this._longPressed) {
      this._toggleEntity(id, ev);
    }
  }

  _onPointerLeave() {
    clearTimeout(this._pressTimer);
  }

  // -- slider drag ---------------------------------------------------------

  _onSliderPointerDown(id, ev) {
    ev.stopPropagation();
    const track = ev.currentTarget;
    const update = (clientX) => {
      const rect = track.getBoundingClientRect();
      const pct = Math.min(100, Math.max(1, ((clientX - rect.left) / rect.width) * 100));
      this._setBrightness(id, pct);
    };
    update(ev.clientX !== undefined ? ev.clientX : ev.touches[0].clientX);

    const move = (mv) => {
      update(mv.clientX !== undefined ? mv.clientX : mv.touches[0].clientX);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  // -- render --------------------------------------------------------------

  render() {
    if (!this.config || !this.hass) return html``;

    const colors = getColors(this.config.color);
    const ids = this._entityIds();
    const validIds = ids.filter((id) => this.hass.states[id]);
    const onCount = validIds.filter((id) => this.hass.states[id].state === "on").length;
    const total = validIds.length;
    const pct = total ? Math.round((onCount / total) * 100) : 0;
    const anyOn = onCount > 0;

    return html`
      <ha-card style="--c-base:${colors.base}; --c-light:${colors.light}; --c-bg:${colors.bg}; --c-glow:${colors.glow}; --c-text:${colors.text};">

        <div class="header" @click=${() => this._toggleAll()}>
          <ha-icon icon=${this.config.icon} style="color:${colors.base}"></ha-icon>
          <div class="header-text">
            <div class="title">${this.config.title}</div>
            <div class="subtitle">${this.config.subtitle || (anyOn ? "Tocca per spegnere tutto" : "Tocca per accendere tutto")}</div>
          </div>
        </div>

        <div class="panel summary">
          <div class="summary-row">
            ${unsafeHTML(bulbSvg(colors, anyOn, 56))}
            <div class="count-block">
              <div class="count">${onCount}<span class="count-total">/${total}</span></div>
              <div class="count-label">luci accese</div>
            </div>
          </div>
          ${this.config.show_progress_bar ? html`
            <div class="progress-track">
              <div class="progress-fill" style="width:${pct}%"></div>
            </div>
          ` : ""}
        </div>

        <div class="panel rows">
          ${this.config.entities.map((entConf, idx) => {
            const id = typeof entConf === "string" ? entConf : entConf.entity;
            const stateObj = this.hass.states[id];
            if (!stateObj) {
              return html`<div class="row missing">Entità non trovata: ${id}</div>`;
            }
            const isOn = stateObj.state === "on";
            const dimmable = isOn && this._isDimmable(id);
            const label = this._entityLabel(entConf);
            const icon = this._entityIcon(entConf, isOn);
            const briPct = this._brightnessPct(id);

            return html`
              <div>
                <div
                  class="row ${dimmable ? "expanded" : ""}"
                  @pointerdown=${(e) => this._onPointerDown(id, e)}
                  @pointerup=${(e) => this._onPointerUp(id, e)}
                  @pointerleave=${() => this._onPointerLeave()}
                >
                  <ha-icon icon=${icon} style="color:${isOn ? colors.text : "var(--secondary-text-color)"}"></ha-icon>
                  <span class="row-label ${isOn ? "" : "row-label-off"}">${label}</span>
                  <span class="row-status" style="color:${isOn ? colors.text : "var(--secondary-text-color)"}">
                    ${dimmable ? html`${briPct}%` : (isOn ? "Acceso" : "Spento")}
                  </span>
                </div>
                ${dimmable ? html`
                  <div class="slider-wrap">
                    <div class="slider-track" @pointerdown=${(e) => this._onSliderPointerDown(id, e)}>
                      <div class="slider-fill" style="width:${briPct}%"></div>
                      <div class="slider-thumb" style="left:${briPct}%"></div>
                    </div>
                  </div>
                ` : ""}
              </div>
              ${idx < this.config.entities.length - 1 ? html`<div class="divider"></div>` : ""}
            `;
          })}
        </div>

      </ha-card>
    `;
  }

  static get styles() {
    return css`
      :host {
        display: block;
      }
      ha-card {
        border-radius: 28px;
        background: var(--ha-card-background, #ffffff);
        box-shadow: 0 2px 8px rgba(0,0,0,0.06), 0 12px 40px rgba(0,0,0,0.08);
        padding: 4px;
        overflow: hidden;
      }
      .header {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px 14px 6px;
        cursor: pointer;
        user-select: none;
      }
      .header ha-icon {
        --mdc-icon-size: 22px;
      }
      .title {
        font-size: 18px;
        font-weight: 600;
        color: var(--primary-text-color);
      }
      .subtitle {
        font-size: 12px;
        color: var(--c-text);
        margin-top: 1px;
      }
      .panel {
        background: var(--c-bg);
        border-radius: 20px;
        margin: 4px;
      }
      .summary {
        padding: 12px 16px;
      }
      .summary-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .count-block {
        flex: 1;
        text-align: right;
        min-width: 0;
      }
      .count {
        font-size: 48px;
        font-weight: 300;
        color: var(--c-base);
        line-height: 1;
        letter-spacing: -1px;
      }
      .count-total {
        font-size: 22px;
      }
      .count-label {
        font-size: 12px;
        color: var(--secondary-text-color);
        margin-top: 4px;
      }
      .progress-track {
        margin-top: 12px;
        height: 6px;
        border-radius: 3px;
        background: var(--c-light);
        overflow: hidden;
      }
      .progress-fill {
        height: 100%;
        background: var(--c-base);
        transition: width 0.3s ease;
      }
      .rows {
        padding: 6px;
      }
      .row {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 13px 12px;
        border-radius: 16px;
        cursor: pointer;
        user-select: none;
        -webkit-tap-highlight-color: transparent;
      }
      .row.expanded {
        padding-bottom: 14px;
      }
      .row:active {
        background: rgba(0,0,0,0.04);
      }
      .row ha-icon {
        --mdc-icon-size: 22px;
        flex-shrink: 0;
      }
      .row-label {
        font-size: 14px;
        font-weight: 500;
        color: var(--primary-text-color);
        flex: 1;
      }
      .row-label-off {
        opacity: 0.65;
      }
      .row-status {
        font-size: 13px;
        font-weight: 600;
      }
      .row.missing {
        color: var(--error-color, red);
        font-size: 12px;
        padding: 10px 14px;
      }
      .divider {
        height: 0.5px;
        background: rgba(0,0,0,0.08);
        margin: 0 14px;
      }
      .slider-wrap {
        padding: 0 14px 4px 48px;
      }
      .slider-track {
        position: relative;
        height: 8px;
        border-radius: 4px;
        background: var(--c-light);
        cursor: pointer;
        touch-action: none;
      }
      .slider-fill {
        position: absolute;
        top: 0; left: 0; bottom: 0;
        border-radius: 4px;
        background: linear-gradient(90deg, var(--c-light), var(--c-base));
      }
      .slider-thumb {
        position: absolute;
        top: 50%;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: #fff;
        border: 2px solid var(--c-base);
        box-shadow: 0 1px 4px rgba(0,0,0,0.25);
        transform: translate(-50%, -50%);
        pointer-events: none;
      }
    `;
  }
}

customElements.define("pastel-lights-card", PastelLightsCard);

// ============================================================================
// Visual editor
// ============================================================================
class PastelLightsCardEditor extends LitElement {

  static get properties() {
    return {
      hass: {},
      _config: { state: true },
    };
  }

  setConfig(config) {
    this._config = { ...config };
  }

  _valueChanged(field, value) {
    this._config = { ...this._config, [field]: value };
    this._fireChanged();
  }

  _entitiesChanged(ev) {
    const value = ev.detail.value || [];
    this._config = { ...this._config, entities: value };
    this._fireChanged();
  }

  _fireChanged() {
    const event = new CustomEvent("config-changed", {
      detail: { config: this._config },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
  }

  render() {
    if (!this._config || !this.hass) return html``;

    const schema = [
      { name: "title", selector: { text: {} } },
      { name: "subtitle", selector: { text: {} } },
      { name: "icon", selector: { icon: {} } },
      {
        name: "entities",
        selector: { entity: { multiple: true, domain: "light" } },
      },
      { name: "show_progress_bar", selector: { boolean: {} } },
    ];

    const data = {
      title: this._config.title || "",
      subtitle: this._config.subtitle || "",
      icon: this._config.icon || "mdi:lightbulb-group",
      entities: this._config.entities || [],
      show_progress_bar: this._config.show_progress_bar !== false,
    };

    return html`
      <div class="editor">

        <ha-form
          .hass=${this.hass}
          .data=${data}
          .schema=${schema}
          .computeLabel=${(s) => this._labelFor(s.name)}
          @value-changed=${(ev) => {
            this._config = { ...this._config, ...ev.detail.value };
            this._fireChanged();
          }}
        ></ha-form>

        <div class="color-section">
          <div class="color-label">Colore della card</div>
          <div class="color-row">
            ${PALETTE_KEYS.map((key) => html`
              <button
                class="swatch ${this._config.color === key ? "selected" : ""}"
                style="background:${PALETTE[key].base}"
                title=${key}
                @click=${() => this._valueChanged("color", key)}
              ></button>
            `)}
          </div>
        </div>

      </div>
    `;
  }

  _labelFor(name) {
    const labels = {
      title: "Titolo",
      subtitle: "Sottotitolo (opzionale)",
      icon: "Icona",
      entities: "Luci",
      show_progress_bar: "Mostra barra di progresso",
    };
    return labels[name] || name;
  }

  static get styles() {
    return css`
      .editor {
        display: flex;
        flex-direction: column;
        gap: 16px;
        padding: 8px 0;
      }
      .color-label {
        font-size: 14px;
        color: var(--primary-text-color);
        margin-bottom: 8px;
        font-weight: 500;
      }
      .color-row {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
      }
      .swatch {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        border: 2px solid transparent;
        cursor: pointer;
        padding: 0;
        transition: transform 0.15s ease, border-color 0.15s ease;
      }
      .swatch:hover {
        transform: scale(1.1);
      }
      .swatch.selected {
        border-color: var(--primary-text-color);
        box-shadow: 0 0 0 2px var(--card-background-color, #fff);
      }
    `;
  }
}

customElements.define("pastel-lights-card-editor", PastelLightsCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "pastel-lights-card",
  name: "Pastel Lights Card",
  description: "Card per il controllo luci con stile pastello, conteggio SVG e slider luminosità.",
  preview: true,
});
