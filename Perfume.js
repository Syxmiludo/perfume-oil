// ===== 1. SETTINGS: edit these first =====
// ✏️ Change this to your WhatsApp number (country code, no + or spaces)
const WA_NUMBER = "233000000000";
// Currency symbol used in the popup (card prices are typed in index.html)
const CUR = "GH₵";
// Bottle sizes and their price multiplier (12ml = 1.8 x the 6ml price)
const SIZES = [
  { l: "6ml", m: 1 },
  { l: "12ml", m: 1.8 },
  { l: "30ml", m: 3.8 },
];
const PER = 8; // products shown per page

// ===== 2. HELPERS: shortcuts, price format, drawn bottle =====
const $ = (s, e = document) => e.querySelector(s);
const $$ = (s, e = document) => [...e.querySelectorAll(s)];
const money = (n) => CUR + Math.round(n).toLocaleString();
// Draws a simple bottle. Only used when a photo file is missing
const bottle = (col, shape = 0, cap = "#c9a24a") => {
  const bodies = [
    `<rect x="50" y="110" width="100" height="150" rx="6" fill="${col}" opacity=".9"/>`,
    `<path d="M60 130Q100 100 140 130L150 250Q100 268 50 250Z" fill="${col}" opacity=".9"/>`,
    `<rect x="58" y="105" width="84" height="158" rx="3" fill="${col}" opacity=".9"/><rect x="66" y="120" width="68" height="60" fill="#fff" opacity=".35"/>`,
    `<circle cx="100" cy="190" r="66" fill="${col}" opacity=".9"/>`,
  ];
  return `<svg viewBox="0 0 200 290" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><ellipse cx="100" cy="272" rx="62" ry="8" fill="#000" opacity=".12"/>${bodies[shape]}<rect x="84" y="86" width="32" height="24" fill="${cap}"/><rect x="76" y="50" width="48" height="40" rx="4" fill="${cap}"/><rect x="76" y="50" width="12" height="40" fill="#fff" opacity=".25"/></svg>`;
};

// ===== 3. MISSING PHOTOS: show a drawn bottle instead of a broken image =====
function fallback(img) {
  if (img.dataset.fallback === "none") {
    img.remove();
    return;
  } // e.g. banner: just remove
  const ph = document.createElement("span");
  ph.className = "ph";
  ph.setAttribute("role", "img");
  ph.setAttribute("aria-label", img.alt);
  ph.innerHTML = bottle(
    img.dataset.col || "#d8b56a",
    +img.dataset.shape || 0,
    img.dataset.cap || undefined,
  );
  img.replaceWith(ph);
}
$$("img[data-col],img[data-fallback]").forEach((img) => {
  if (img.complete && !img.naturalWidth) fallback(img);
  else img.addEventListener("error", () => fallback(img), { once: true });
});

// ===== 4. TABS, PRODUCT GRID AND PAGINATION (reads the cards in index.html) =====
let cat = "All Oils",
  page = 1;
const items = $$(".item");

// Show the right cards for the current category and page, then draw page buttons
function renderGrid() {
  let list =
    cat === "All Oils"
      ? items
      : cat === "Top 10"
        ? items
            .filter((i) => +i.dataset.top)
            .sort((a, b) => a.dataset.top - b.dataset.top)
        : items.filter((i) => i.dataset.cat === cat);
  const pages = Math.max(1, Math.ceil(list.length / PER));
  page = Math.min(page, pages);
  items.forEach((i) => {
    i.hidden = true;
    i.style.order = 0;
    const b = $(".badge", i);
    if (b) b.remove();
  });
  list.slice((page - 1) * PER, page * PER).forEach((i, k) => {
    i.hidden = false;
    i.style.order = k;
    if (cat === "Top 10")
      $(".img", i).insertAdjacentHTML(
        "afterbegin",
        `<i class="badge">#${i.dataset.top}</i>`,
      );
  });
  $("#pager").innerHTML =
    pages < 2
      ? ""
      : `<button data-p="${page - 1}" ${page === 1 ? "disabled" : ""} aria-label="Previous page">←</button>${Array.from(
          { length: pages },
          (_, k) => k + 1,
        )
          .map(
            (n) =>
              `<button data-p="${n}" class="${n === page ? "on" : ""}" ${n === page ? 'aria-current="page"' : ""}>${n}</button>`,
          )
          .join(
            "",
          )}<button data-p="${page + 1}" ${page === pages ? "disabled" : ""} aria-label="Next page">Next →</button>`;
}
// Switch category, highlight its tab and go back to page 1
function setCat(c) {
  cat = c;
  page = 1;
  $$("#tabs button").forEach((t) =>
    t.setAttribute("aria-pressed", t.dataset.c === c),
  );
  renderGrid();
}
$("#tabs").onclick = (e) => {
  const b = e.target.closest("button");
  if (b) setCat(b.dataset.c);
};
$$("[data-go]").forEach(
  (b) =>
    (b.onclick = () => {
      setCat(b.dataset.go);
      $("#shop").scrollIntoView();
    }),
);
$("#pager").onclick = (e) => {
  const b = e.target.closest("button");
  if (!b || b.disabled) return;
  page = +b.dataset.p;
  renderGrid();
  $("#tabs").scrollIntoView({ behavior: "smooth", block: "start" });
};

// ===== 5. PRODUCT POPUP AND WHATSAPP ORDER LINK =====
let cur = null,
  size = 0,
  qty = 1;
// Refresh price, quantity, size buttons and the WhatsApp message
function update() {
  const s = SIZES[size],
    total = cur.p * s.m * qty;
  $("#mPrice").textContent =
    money(cur.p * s.m) + (qty > 1 ? `  ×${qty} = ${money(total)}` : "");
  $("#qty").textContent = qty;
  $("#mSize").innerHTML = SIZES.map(
    (z, i) =>
      `<button aria-pressed="${i === size}" data-s="${i}">${z.l}</button>`,
  ).join("");
  const msg = `Hello PARFS, I'd like to order:\n${qty} × ${cur.n} (${s.l}) – ${money(total)}\nPlease confirm availability and delivery.`;
  $("#buy").href = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`;
}
// Open the popup using the data and photo of the tapped card
function openItem(card) {
  cur = {
    n: card.dataset.name,
    p: +card.dataset.price,
    notes: card.dataset.notes,
  };
  size = 0;
  qty = 1;
  $("#mImg").replaceChildren($("img,.ph", card).cloneNode(true));
  $("#mName").textContent = cur.n;
  $("#mNotes").textContent = cur.notes;
  update();
  $("#modal").classList.add("open");
  document.body.style.overflow = "hidden";
  $("#close").focus();
}
function closeM() {
  $("#modal").classList.remove("open");
  document.body.style.overflow = "";
}
$("#grid").onclick = (e) => {
  const c = e.target.closest(".item");
  if (c) openItem(c);
};
$("#mSize").onclick = (e) => {
  const b = e.target.closest("button");
  if (b) {
    size = +b.dataset.s;
    update();
  }
};
$("#plus").onclick = () => {
  qty = Math.min(qty + 1, 20);
  update();
};
$("#minus").onclick = () => {
  qty = Math.max(qty - 1, 1);
  update();
};
$("#close").onclick = closeM;
$("#modal").onclick = (e) => {
  if (e.target.id === "modal") closeM();
};
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeM();
});
// WhatsApp links for the floating button and the footer button
$("#fab").href =
  `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent("Hello PARFS, I need help choosing a perfume oil.")}`;
$("#waFoot").href =
  `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent("Hello PARFS, I'd like to order a perfume oil.")}`;

// ===== 6. LIGHT/DARK TOGGLE AND FIRST DRAW =====
$("#theme").onclick = () => {
  const r = document.documentElement,
    d = r.dataset.theme
      ? r.dataset.theme === "dark"
      : matchMedia("(prefers-color-scheme:dark)").matches;
  r.dataset.theme = d ? "light" : "dark";
};
renderGrid();
