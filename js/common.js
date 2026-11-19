// Shared helpers: content loading, header/footer, escaping.
export async function getJSON(path) {
  const res = await fetch(path, { cache: "no-cache" });
  if (!res.ok) throw new Error(`Couldn't load ${path} (${res.status})`);
  return res.json();
}

export const esc = (s = "") =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export const money = (n, cur = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: cur }).format(Number(n) || 0);

export async function initChrome() {
  const site = await getJSON("/content/site.json");
  document.querySelectorAll("[data-site-name]").forEach((el) => (el.textContent = site.name));
  document.querySelectorAll("[data-site-role]").forEach((el) => (el.textContent = site.role));
  const foot = document.querySelector("[data-foot]");
  if (foot) {
    foot.innerHTML = `
      <span>© ${new Date().getFullYear()} ${esc(site.name)}</span>
      <span class="mono">${esc(site.email || "")}</span>`;
  }
  if (!site.shop_enabled) document.querySelectorAll('[data-nav="shop"]').forEach((a) => (a.hidden = true));
  return site;
}
