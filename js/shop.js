import { getJSON, initChrome, esc, money } from "/js/common.js";
import { mountViewer } from "/js/viewer.js";

const site = await initChrome();
const shop = await getJSON("/content/shop.json");
const cur = shop.currency || "USD";
const items = (shop.items || []).filter((i) => i.available !== false);
const $ = (id) => document.getElementById(id);

// ---------- Intro ----------
if (shop.title) $("shop-title").textContent = shop.title;
$("shop-intro").textContent = shop.intro || "";
if (shop.order_note) $("order-note").textContent = shop.order_note;

// ---------- Catalog ----------
const state = { item: items[0]?.id, color: items[0]?.colors?.[0]?.name };

$("shop-grid").innerHTML = items.length ? items.map((it) => `
  <article class="item" id="${esc(it.id)}" data-id="${esc(it.id)}">
    <div class="card-media" data-media>
      ${it.image ? `<img src="${esc(it.image)}" alt="${esc(it.name)}" loading="lazy">` : ""}
      ${it.model?.file ? `<div class="card-badges"><span class="badge cad">3D model</span></div>` : ""}
    </div>
    <div class="item-body">
      <div class="item-top"><h3>${esc(it.name)}</h3><span class="price">${it.price ? money(it.price, cur) : "Quote"}</span></div>
      <p class="muted" style="font-size:.95rem">${esc(it.description || "")}</p>
      <div class="item-specs">
        ${it.material ? `<span>${esc(it.material)}</span>` : ""}
        ${it.size ? `<span>${esc(it.size)}</span>` : ""}
        ${it.lead_time ? `<span>Ships in ${esc(it.lead_time)}</span>` : ""}
      </div>
      <div class="swatches" role="radiogroup" aria-label="${esc(it.name)} colors">
        ${(it.colors || []).map((c) => `<button type="button" class="swatch" role="radio" aria-checked="false" title="${esc(c.name)}" aria-label="${esc(c.name)}" data-color="${esc(c.name)}" style="background:${esc(c.hex)}"></button>`).join("")}
      </div>
      <div class="item-actions">
        <button type="button" class="btn primary small" data-order>Order this</button>
        ${it.model?.file ? `<button type="button" class="btn small" data-3d>View in 3D</button>` : ""}
      </div>
    </div>
  </article>`).join("") : `<div class="empty">Nothing listed right now. Custom prints are still open below.</div>`;

$("shop-grid").addEventListener("click", (e) => {
  const card = e.target.closest(".item"); if (!card) return;
  const it = items.find((i) => i.id === card.dataset.id);
  const sw = e.target.closest(".swatch");
  if (sw) { select(it.id, sw.dataset.color); return; }
  if (e.target.closest("[data-order]")) {
    select(it.id, state.item === it.id ? state.color : it.colors?.[0]?.name);
    $("order").scrollIntoView({ behavior: "smooth" });
    return;
  }
  const b3d = e.target.closest("[data-3d]");
  if (b3d) {
    const media = card.querySelector("[data-media]");
    if (media.dataset.mode === "3d") {
      media.dataset.mode = "";
      media.className = "card-media";
      media.innerHTML = it.image ? `<img src="${esc(it.image)}" alt="${esc(it.name)}">` : "";
      b3d.textContent = "View in 3D";
    } else {
      media.dataset.mode = "3d";
      media.innerHTML = "";
      mountViewer(media, { src: it.model.file, units: it.model.units, up: it.model.up, color: currentHex(it) });
      b3d.textContent = "Show photo";
    }
  }
});

function currentHex(it) {
  const c = (it.colors || []).find((c) => c.name === (state.item === it.id ? state.color : null));
  return c?.hex || it.colors?.[0]?.hex || "#b9c3cf";
}

// ---------- Form ----------
const form = $("order-form");
const fItem = $("f-item"), fColor = $("f-color"), fQty = $("f-qty");

fItem.innerHTML = items.map((i) => `<option value="${esc(i.name)}" data-id="${esc(i.id)}">${esc(i.name)}${i.price ? " — " + money(i.price, cur) : ""}</option>`).join("");
$("f-mat").innerHTML = (shop.materials || ["PLA", "PETG"]).map((m) => `<option>${esc(m)}</option>`).join("") + `<option>Not sure — recommend one</option>`;

if (shop.custom_enabled === false) $("t-custom-wrap").hidden = true;
if (!shop.pickup_enabled) $("d-pickup-wrap").hidden = true;
$("pickup-note").textContent = shop.pickup_note || "I'll email you to arrange a pickup time.";
if (!items.length) { $("t-custom").checked = true; $("t-shop").parentElement.hidden = true; }

function select(id, color) {
  const it = items.find((i) => i.id === id); if (!it) return;
  state.item = id;
  state.color = color || it.colors?.[0]?.name;
  $("t-shop").checked = true;
  fItem.selectedIndex = items.indexOf(it);
  fColor.innerHTML = (it.colors || []).map((c) => `<option ${c.name === state.color ? "selected" : ""}>${esc(c.name)}</option>`).join("");
  $("f-swatches").innerHTML = (it.colors || []).map((c) =>
    `<button type="button" class="swatch" role="radio" aria-checked="${c.name === state.color}" title="${esc(c.name)}" aria-label="${esc(c.name)}" data-color="${esc(c.name)}" style="background:${esc(c.hex)}"></button>`).join("");
  document.querySelectorAll(".item").forEach((card) => {
    card.classList.toggle("selected", card.dataset.id === id);
    card.querySelectorAll(".swatch").forEach((s) => s.setAttribute("aria-checked", card.dataset.id === id && s.dataset.color === state.color));
  });
  update();
}

fItem.addEventListener("change", () => select(fItem.selectedOptions[0].dataset.id));
fColor.addEventListener("change", () => select(state.item, fColor.value));
$("f-swatches").addEventListener("click", (e) => { const s = e.target.closest(".swatch"); if (s) select(state.item, s.dataset.color); });
form.addEventListener("input", update);
form.addEventListener("change", update);

function isCustom() { return $("t-custom").checked; }
function isPickup() { return $("d-pickup").checked; }

function update() {
  const custom = isCustom(), pickup = isPickup();
  $("shop-fields").hidden = custom;
  $("custom-fields").hidden = !custom;
  $("addr").hidden = pickup;
  $("pickup-note").hidden = !pickup;

  const it = items.find((i) => i.id === state.item);
  const qty = Math.max(1, parseInt(fQty.value) || 1);
  const ship = pickup ? 0 : Number(shop.shipping_flat || 0);
  const rows = [];
  let total = null;
  if (custom) {
    rows.push(["Type", "Custom print"], ["Material", $("f-mat").value], ["Qty", qty]);
    $("sum-note").textContent = "Custom work is quoted by email after I review your request.";
  } else if (it) {
    const hex = it.colors?.find((c) => c.name === state.color)?.hex;
    rows.push(["Item", esc(it.name)], ["Color", `${hex ? `<span class="dot" style="background:${esc(hex)}"></span>` : ""}${esc(state.color || "—")}`],
      ["Unit", it.price ? money(it.price, cur) : "Quote"], ["Qty", qty]);
    if (it.price) total = it.price * qty + ship;
    $("sum-note").textContent = shop.summary_note || "Estimate only. Final price confirmed by email before you pay.";
  }
  rows.push(["Delivery", pickup ? "Local pickup" : ship ? `Ship · ${money(ship, cur)}` : "Ship · quoted"]);
  $("sum").innerHTML = rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("");
  $("sum-total").textContent = total == null ? "Quote" : money(total, cur);
  $("f-unit").value = !custom && it?.price ? it.price : "";
  $("f-total").value = total == null ? "Quote" : total.toFixed(2);
}

// ---------- Validation + submit ----------
function setError(input, msg) {
  const field = input.closest(".field");
  field.querySelector(".error")?.remove();
  input.removeAttribute("aria-invalid");
  if (msg) {
    input.setAttribute("aria-invalid", "true");
    const e = document.createElement("span");
    e.className = "error"; e.textContent = msg;
    field.appendChild(e);
  }
}

function validate() {
  const checks = [
    [$("f-name"), (v) => v.trim() ? "" : "Enter your name."],
    [$("f-email"), (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? "" : "Enter a valid email so I can confirm the order."],
    [fQty, (v) => parseInt(v) >= 1 ? "" : "Quantity must be at least 1."],
  ];
  if (isCustom()) {
    checks.push([$("f-desc"), (v) => v.trim().length >= 10 ? "" : "Describe the part in a sentence or two."]);
    checks.push([$("f-file"), () => { const f = $("f-file").files[0]; return f && f.size > 8 * 1024 * 1024 ? "File is over 8 MB. Put a download link in the notes instead." : ""; }]);
  }
  if (!isPickup()) {
    for (const id of ["f-a1", "f-city", "f-state", "f-zip"]) checks.push([$(id), (v) => v.trim() ? "" : "Required for shipping."]);
  }
  let first = null;
  for (const [el, fn] of checks) { const m = fn(el.value); setError(el, m); if (m && !first) first = el; }
  // clear stale errors on hidden fields
  form.querySelectorAll("[hidden] [aria-invalid]").forEach((el) => setError(el, ""));
  return first;
}

function reference() {
  const d = new Date();
  const ymd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `ORD-${ymd}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const msg = $("form-msg");
  msg.innerHTML = "";
  const bad = validate();
  if (bad) { bad.focus(); msg.innerHTML = `<div class="notice err">Check the highlighted fields.</div>`; return; }

  const ref = reference();
  $("f-reference").value = ref;
  const data = new FormData(form);
  // Don't send fields for the section that isn't in use.
  if (isCustom()) { data.delete("item"); data.delete("color"); }
  else { ["custom-description", "custom-material", "custom-color", "attachment"].forEach((k) => data.delete(k)); }
  if (isPickup()) ["address-line-1", "address-line-2", "city", "state", "zip"].forEach((k) => data.delete(k));

  const btn = $("submit");
  btn.disabled = true; btn.textContent = "Sending…";
  try {
    const local = ["localhost", "127.0.0.1"].includes(location.hostname);
    if (!local) {
      const res = await fetch("/", { method: "POST", body: data });
      if (!res.ok) throw new Error(res.status);
    }
    const email = $("f-email").value.trim();
    form.querySelectorAll("fieldset, .field, #submit").forEach((el) => (el.hidden = true));
    msg.innerHTML = `<div class="notice ok"><strong>Order request received.</strong><br>
      Reference <span class="mono">${ref}</span>. I'll email <span class="mono">${esc(email)}</span> within ${esc(shop.response_time || "2 business days")} to confirm details and send an invoice.
      ${local ? "<br><em>(Local preview: nothing was actually sent.)</em>" : ""}</div>`;
    msg.scrollIntoView({ behavior: "smooth", block: "center" });
  } catch (err) {
    msg.innerHTML = `<div class="notice err">The order didn't go through. Check your connection and try again, or email ${esc(site.email || "me")} directly.</div>`;
    btn.disabled = false; btn.textContent = "Submit order request";
  }
});

// ---------- Start ----------
const hashId = decodeURIComponent(location.hash.slice(1));
if (items.find((i) => i.id === hashId)) { select(hashId); document.getElementById(hashId)?.scrollIntoView(); }
else if (items.length) select(items[0].id);
update();
