"use strict";
/* ==========================================================================
   MiniPedidos v2

   MODO LOCAL (por defecto): todo se guarda en el navegador de cada persona.
   Sirve para probar, pero los pedidos NO llegan a otros teléfonos.

   MODO EN LÍNEA (recomendado para vender de verdad) con Firebase (gratis para empezar):
   1. Entra a https://console.firebase.google.com y crea un proyecto.
   2. Agrega una "Web app" y copia sus datos en FIREBASE_CONFIG (aquí abajo).
   3. Build > Firestore Database > crear base de datos.
   4. Build > Authentication > Sign-in method > activa "Correo/contraseña", y en
      "Users" crea el usuario del vendedor (correo y contraseña).
   5. En Firestore > Reglas, pega esto y publica:

      rules_version = '2';
      service cloud.firestore {
        match /databases/{database}/documents {
          match /products/{id} { allow read: if true; allow write: if request.auth != null; }
          match /settings/{id} { allow read: if true; allow write: if request.auth != null; }
          match /orders/{id}   { allow create: if true; allow get: if true;
                                 allow list, update, delete: if request.auth != null; }
        }
      }

   6. Publica esta página en internet (por ejemplo Firebase Hosting, Netlify o GitHub Pages)
      para que los clientes puedan abrirla desde su celular.
   Con eso: los pedidos llegan al vendedor en tiempo real, los productos y precios se
   comparten, y solo el vendedor (con su correo y contraseña) puede modificarlos.
   ========================================================================== */
const FIREBASE_CONFIG = { apiKey: "", authDomain: "", projectId: "", appId: "" };
const USE_FB = !!(FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.projectId);

const LA_GUARDIA = [-17.8985, -63.3300];
const DEFAULT_SETTINGS = { name: "Mi tienda de abarrotes", phone: "59172558658", address: "La Guardia, Santa Cruz, Bolivia", contact1: "72558658", contact2: "67861272", deliveryFee: 0, payNote: "", qr: "", lat: null, lng: null };

const defaultProducts = [
 {id:1,name:"Arroz",price:12.5,category:"Abarrotes",stock:25,emoji:"🍚",unit:"Bolsa de 1 kg"},
 {id:2,name:"Azúcar",price:8,category:"Abarrotes",stock:20,emoji:"🧂",unit:"Bolsa de 1 kg"},
 {id:3,name:"Aceite",price:16.5,category:"Abarrotes",stock:15,emoji:"🫗",unit:"Botella de 1 L"},
 {id:4,name:"Fideo",price:7,category:"Abarrotes",stock:30,emoji:"🍝",unit:"Paquete"},
 {id:5,name:"Leche",price:7.5,category:"Lácteos",stock:18,emoji:"🥛",unit:"Bolsa / caja"},
 {id:6,name:"Yogur",price:9,category:"Lácteos",stock:12,emoji:"🥤",unit:"Botella"},
 {id:7,name:"Agua",price:5,category:"Bebidas",stock:24,emoji:"💧",unit:"Botella"},
 {id:8,name:"Gaseosa",price:10,category:"Bebidas",stock:16,emoji:"🥤",unit:"Botella"},
 {id:9,name:"Galletas",price:4.5,category:"Snacks",stock:35,emoji:"🍪",unit:"Paquete"},
 {id:10,name:"Papas fritas",price:6,category:"Snacks",stock:22,emoji:"🍟",unit:"Bolsa"},
 {id:11,name:"Detergente",price:13,category:"Limpieza",stock:10,emoji:"🧼",unit:"Paquete"},
 {id:12,name:"Lavandina",price:8.5,category:"Limpieza",stock:14,emoji:"🧴",unit:"Botella"},
 {id:13,name:"Tomate",price:6,category:"Verduras",stock:20,emoji:"🍅",unit:"Por kilo",byWeight:true},
 {id:14,name:"Cebolla",price:5,category:"Verduras",stock:25,emoji:"🧅",unit:"Por kilo",byWeight:true},
 {id:15,name:"Papa",price:4.5,category:"Verduras",stock:30,emoji:"🥔",unit:"Por kilo",byWeight:true},
 {id:16,name:"Zanahoria",price:5,category:"Verduras",stock:18,emoji:"🥕",unit:"Por kilo",byWeight:true},
 {id:17,name:"Lechuga",price:4,category:"Verduras",stock:12,emoji:"🥬",unit:"Por unidad"},
 {id:18,name:"Locoto",price:8,category:"Verduras",stock:10,emoji:"🌶️",unit:"Por kilo",byWeight:true},
 {id:19,name:"Pepino",price:5,category:"Verduras",stock:14,emoji:"🥒",unit:"Por kilo",byWeight:true},
 {id:20,name:"Pimentón",price:7,category:"Verduras",stock:12,emoji:"🫑",unit:"Por kilo",byWeight:true},
 {id:21,name:"Plátano",price:6,category:"Frutas",stock:24,emoji:"🍌",unit:"Por docena"},
 {id:22,name:"Manzana",price:10,category:"Frutas",stock:18,emoji:"🍎",unit:"Por kilo",byWeight:true},
 {id:23,name:"Huevo",price:24,category:"Abarrotes",stock:15,emoji:"🥚",unit:"Maple"},
 {id:24,name:"Harina",price:9,category:"Abarrotes",stock:20,emoji:"🌾",unit:"Bolsa de 1 kg"},
 {id:25,name:"Sal",price:3,category:"Abarrotes",stock:25,emoji:"🧂",unit:"Bolsa"},
 {id:26,name:"Atún en lata",price:11,category:"Abarrotes",stock:16,emoji:"🥫",unit:"Lata"},
 {id:27,name:"Pan",price:1,category:"Abarrotes",stock:40,emoji:"🍞",unit:"Por unidad"}
];

/* ---------- utilidades ---------- */
const $ = id => document.getElementById(id);
const money = n => "Bs " + Number(n).toFixed(2).replace(".", ",");
const safe = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const r2 = n => Math.round(n * 100) / 100;
const digits = s => String(s || "").replace(/\D/g, "");
const intl = n => { n = digits(n); return n.length <= 8 ? "591" + n : n; };
const cap = s => s[0].toUpperCase() + s.slice(1);
const stepOf = p => p.byWeight ? 0.25 : 1;
const startQty = p => p.byWeight ? 0.5 : 1;
function fmtQty(p, q) { if (p && p.byWeight) return q < 1 ? Math.round(q * 1000) + " g" : (+q.toFixed(2)) + " kg"; return String(q); }
function lsGet(key, fallback) { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; } }
function lsSet(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); return true; } catch (e) { return false; } }
let toastTimer = null;
function toast(msg) { const el = $("toast"); el.textContent = msg; el.classList.remove("hidden"); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.add("hidden"), 2800); }
function loadScript(src) { return new Promise((res, rej) => { const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = () => rej(new Error("No se pudo cargar " + src)); document.head.appendChild(s); }); }
function resizeImage(file, max, quality) {
  return new Promise((res, rej) => {
    if (!file || !file.type.startsWith("image/")) return rej(new Error("tipo"));
    const r = new FileReader();
    r.onload = () => { const img = new Image(); img.onload = () => { const s = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement("canvas"); c.width = Math.max(1, Math.round(img.width * s)); c.height = Math.max(1, Math.round(img.height * s)); c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); res(c.toDataURL("image/jpeg", quality)); }; img.onerror = () => rej(new Error("img")); img.src = r.result; };
    r.onerror = () => rej(new Error("read")); r.readAsDataURL(file);
  });
}
function normProduct(p) {
  return { ...p, id: Number(p.id), price: Number(p.price) || 0, stock: Number(p.stock) || 0,
    byWeight: p.byWeight ?? /por kilo/i.test(p.unit || ""),
    image: (p.image && !/loremflickr/.test(p.image)) ? p.image : "" };
}
function newOrderId() { return "P" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase(); }

/* ---------- estado ---------- */
let products = [], orders = [], settings = { ...DEFAULT_SETTINGS };
let cart = lsGet("mp_cart", []);
let myIds = lsGet("mp_myorders", []).map(String);
let myCache = {};
let isAdmin = false, currentPage = "shop";
let productImageData = "", qrData = "";
let backend = null;
const prod = id => products.find(p => p.id === Number(id));

/* ---------- backend LOCAL ---------- */
const LocalBackend = {
  name: "local",
  async start() {
    const saved = lsGet("mp_products", null);
    products = (saved || defaultProducts.map(x => ({ ...x }))).map(normProduct);
    orders = lsGet("mp_orders", []);
    settings = { ...DEFAULT_SETTINGS, ...lsGet("mp_settings", {}) };
    if (!settings.phone) settings.phone = DEFAULT_SETTINGS.phone;
    lsSet("mp_products", products);
    isAdmin = sessionStorage.getItem("mp_admin") === "1";
  },
  async saveProduct(p) {
    const old = products;
    products = products.some(x => x.id === p.id) ? products.map(x => x.id === p.id ? p : x) : [...products, p];
    if (!lsSet("mp_products", products)) { products = old; throw new Error("storage"); }
  },
  async deleteProduct(id) { products = products.filter(x => x.id !== id); lsSet("mp_products", products); },
  async saveSettings(s) { if (!lsSet("mp_settings", s)) throw new Error("storage"); settings = s; },
  async addOrder(o) { orders = [o, ...orders]; lsSet("mp_orders", orders); },
  async updateOrder(id, patch) { orders = orders.map(o => String(o.id) === String(id) ? { ...o, ...patch } : o); lsSet("mp_orders", orders); },
  async deleteOrder(id) { orders = orders.filter(o => String(o.id) !== String(id)); lsSet("mp_orders", orders); },
  async clearOrders() { orders = []; lsSet("mp_orders", orders); },
  async seed() { products = defaultProducts.map(x => normProduct({ ...x })); lsSet("mp_products", products); },
  getMyOrders() { return orders.filter(o => myIds.includes(String(o.id))); },
  watchMine() {},
  async login() {}, async logout() { sessionStorage.removeItem("mp_admin"); }
};

/* ---------- backend FIREBASE ---------- */
const FBBackend = {
  name: "firebase", db: null, auth: null, unsubOrders: null, watching: {}, firstOrders: true,
  async start() {
    const v = "10.12.2", base = "https://www.gstatic.com/firebasejs/" + v + "/";
    await loadScript(base + "firebase-app-compat.js");
    await loadScript(base + "firebase-firestore-compat.js");
    await loadScript(base + "firebase-auth-compat.js");
    firebase.initializeApp(FIREBASE_CONFIG);
    this.db = firebase.firestore(); this.auth = firebase.auth();
    this.db.collection("products").onSnapshot(s => { products = s.docs.map(d => normProduct(d.data())).sort((a, b) => a.id - b.id); refreshAll(); }, () => toast("No se pudieron leer los productos"));
    this.db.collection("settings").doc("main").onSnapshot(d => { settings = { ...DEFAULT_SETTINGS, ...(d.exists ? d.data() : {}) }; refreshAll(); }, () => {});
    this.auth.onAuthStateChanged(u => {
      isAdmin = !!u;
      if (this.unsubOrders) { this.unsubOrders(); this.unsubOrders = null; }
      if (u) {
        this.firstOrders = true;
        this.unsubOrders = this.db.collection("orders").orderBy("ts", "desc").limit(200).onSnapshot(snap => {
          if (!this.firstOrders) snap.docChanges().forEach(c => { if (c.type === "added") toast("🔔 Nuevo pedido de " + (c.doc.data().name || "cliente")); });
          this.firstOrders = false;
          orders = snap.docs.map(d => ({ ...d.data(), id: d.id }));
          refreshAll();
        }, () => toast("No se pudieron leer los pedidos"));
      } else { orders = []; if (currentPage === "admin") showPage("shop"); }
      refreshAll();
    });
    this.watchMine();
  },
  async saveProduct(p) { await this.db.collection("products").doc(String(p.id)).set(p); },
  async deleteProduct(id) { await this.db.collection("products").doc(String(id)).delete(); },
  async saveSettings(s) { await this.db.collection("settings").doc("main").set(s); settings = s; },
  async addOrder(o) { await this.db.collection("orders").doc(o.id).set(o); this.watchMine(); },
  async updateOrder(id, patch) { await this.db.collection("orders").doc(String(id)).update(patch); },
  async deleteOrder(id) { await this.db.collection("orders").doc(String(id)).delete(); },
  async clearOrders() { const snap = await this.db.collection("orders").limit(400).get(); const b = this.db.batch(); snap.docs.forEach(d => b.delete(d.ref)); await b.commit(); },
  async seed() { const b = this.db.batch(); defaultProducts.forEach(p => b.set(this.db.collection("products").doc(String(p.id)), normProduct({ ...p }))); await b.commit(); },
  getMyOrders() { return myIds.map(id => myCache[id]).filter(Boolean); },
  watchMine() {
    myIds.forEach(id => {
      if (this.watching[id]) return;
      this.watching[id] = this.db.collection("orders").doc(id).onSnapshot(d => { if (d.exists) myCache[id] = { ...d.data(), id: d.id }; renderMyOrders(); }, () => {});
    });
  },
  async login(email, pass) { await this.auth.signInWithEmailAndPassword(email, pass); },
  async logout() { await this.auth.signOut(); }
};

/* ---------- selector de mapa reutilizable ---------- */
function MapPicker(mapId, infoId, emptyText) {
  let map = null, marker = null, coords = null;
  const api = {
    get coords() { return coords; },
    init(center, zoom) {
      const el = $(mapId); if (!el || !window.L) return;
      if (!map) {
        map = L.map(el).setView(center || LA_GUARDIA, zoom || 15);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "&copy; OpenStreetMap" }).addTo(map);
        map.on("click", e => api.set(e.latlng.lat, e.latlng.lng));
      }
      setTimeout(() => map.invalidateSize(), 150);
    },
    set(lat, lng) {
      lat = Number(lat); lng = Number(lng); coords = { lat, lng };
      if (!map) api.init();
      if (map) { if (marker) marker.setLatLng([lat, lng]); else marker = L.marker([lat, lng]).addTo(map); map.setView([lat, lng], 16); }
      $(infoId).innerHTML = `Ubicación marcada: ${lat.toFixed(6)}, ${lng.toFixed(6)} · <a href="https://www.google.com/maps?q=${lat},${lng}" target="_blank" rel="noopener">📍 Abrir en Google Maps</a>`;
    },
    clear() { coords = null; if (marker && map) { map.removeLayer(marker); marker = null; } $(infoId).textContent = emptyText; },
    locate() {
      if (!navigator.geolocation) return toast("Tu navegador no permite ubicación automática");
      navigator.geolocation.getCurrentPosition(pos => { api.init(); api.set(pos.coords.latitude, pos.coords.longitude); }, () => toast("No se pudo obtener tu ubicación. Toca el mapa para marcarla."), { enableHighAccuracy: true, timeout: 10000 });
    }
  };
  return api;
}
const deliveryPicker = MapPicker("deliveryMap", "mapSelection", "Todavía no elegiste una ubicación.");
const sellerPicker = MapPicker("sellerMap", "sellerMapSelection", "Ubicación de tienda no marcada.");

/* ---------- navegación ---------- */
function showPage(page) {
  if (page === "admin" && !isAdmin) { openLogin(); return; }
  ["shop", "cart", "orders", "admin"].forEach(p => { $("page" + cap(p)).classList.toggle("hidden", p !== page); $("nav" + cap(p)).classList.toggle("active", p === page); });
  currentPage = page;
  if (page === "cart") { renderCart(); if (getVal("deliv") === "delivery") deliveryPicker.init(); }
  if (page === "orders") renderMyOrders();
  if (page === "admin") { fillSettingsForm(); renderAdmin(); }
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function refreshAll() {
  renderStorefront(); renderProducts(); updateCount(); renderMyOrders(); updatePending();
  if (currentPage === "cart") renderCart();
  if (currentPage === "admin" && isAdmin) renderAdmin();
}

/* ---------- tienda ---------- */
function renderStorefront() {
  $("storefrontName").textContent = settings.name || "Mi tienda de abarrotes";
  $("storefrontAddress").textContent = settings.address || "Dirección del vendedor no indicada";
  const contacts = [settings.contact1, settings.contact2].map(digits).filter(Boolean);
  $("storefrontPhone").textContent = contacts.length ? "Consultas: " + contacts.join(" · ") : "";
  const map = $("sellerMapLink"), wa = $("sellerWhatsAppLink");
  if (settings.lat != null && settings.lng != null) { map.href = `https://www.google.com/maps?q=${settings.lat},${settings.lng}`; map.classList.remove("hidden"); } else map.classList.add("hidden");
  if (settings.phone) { wa.href = `https://wa.me/${intl(settings.phone)}`; wa.classList.remove("hidden"); } else wa.classList.add("hidden");
  $("contactCards").innerHTML = contacts.map(n => `<div style="border:1px solid var(--line);border-radius:12px;padding:12px"><b style="font-size:17px">${safe(n)}</b><div class="seller-profile-actions" style="margin-top:8px"><a class="btn secondary small" href="tel:+${intl(n)}">📞 Llamar</a><a class="btn primary small" href="https://wa.me/${intl(n)}?text=${encodeURIComponent("Hola, quiero hacer una consulta")}" target="_blank" rel="noopener">💬 WhatsApp</a></div></div>`).join("") || `<span class="muted" style="font-size:13px">El vendedor aún no configuró teléfonos de consulta.</span>`;
  $("footContacts").innerHTML = contacts.length ? "Consultas: " + contacts.map(n => `<a href="tel:+${intl(n)}">${safe(n)}</a>`).join(" · ") : "";
}
function renderProducts() {
  const q = $("search").value.toLowerCase(), cat = $("categoryFilter").value;
  const list = products.filter(p => (p.name + " " + p.category + " " + (p.unit || "")).toLowerCase().includes(q) && (!cat || p.category === cat));
  $("productCount").textContent = list.length + " productos";
  $("products").innerHTML = list.length ? list.map(p => {
    const low = p.stock > 0 && p.stock <= 5;
    return `<article class="product"><div class="pic">${p.image ? `<img src="${safe(p.image)}" alt="${safe(p.name)}" loading="lazy">` : safe(p.emoji || "🛒")}</div><div class="pbody"><span class="category">${safe(p.category)}</span><h3>${safe(p.name)}</h3><span class="muted" style="font-size:13px">${safe(p.unit || "")}</span><div class="price-row"><div><div class="price">${money(p.price)}${p.byWeight ? '<span style="font-size:12px;font-weight:600"> /kg</span>' : ""}</div><div class="stock ${low ? "low" : ""}">${p.stock <= 0 ? "Agotado" : (low ? "¡Últimas unidades! " : "Disponible: ") + fmtQty(p, p.stock).replace(/ g$/, " g") + (p.byWeight && p.stock >= 1 ? "" : "")}</div></div><button class="btn primary small" onclick="addToCart(${p.id})" ${p.stock <= 0 ? "disabled" : ""}>+ Agregar</button></div></div></article>`;
  }).join("") : `<div class="empty" style="grid-column:1/-1"><div class="big">🔎</div>No encontramos productos.</div>`;
}

/* ---------- carrito ---------- */
function persistCart() { lsSet("mp_cart", cart); }
function addToCart(id) {
  const p = prod(id); if (!p || p.stock <= 0) return;
  const item = cart.find(x => x.id === p.id), st = stepOf(p);
  if (item) { if (r2(item.qty + st) > p.stock) return toast("No hay más disponible"); item.qty = r2(item.qty + st); }
  else cart.push({ id: p.id, qty: Math.min(startQty(p), p.stock) });
  persistCart(); updateCount(); toast("Agregado: " + fmtQty(p, cart.find(x => x.id === p.id).qty) + (p.byWeight ? " de " : " × ") + p.name);
}
function changeQty(id, dir) {
  const item = cart.find(x => x.id === id), p = prod(id); if (!item || !p) return;
  let q = r2(item.qty + dir * stepOf(p));
  if (q <= 0) cart = cart.filter(x => x.id !== id);
  else if (q > p.stock) { item.qty = r2(p.stock); toast("Cantidad ajustada al stock disponible"); }
  else item.qty = q;
  persistCart(); renderCart(); updateCount();
}
function removeItem(id) { cart = cart.filter(i => i.id !== id); persistCart(); renderCart(); updateCount(); }
function updateCount() { const n = cart.length; $("cartCount").textContent = n; }
function getVal(name) { const el = document.querySelector(`input[name="${name}"]:checked`); return el ? el.value : ""; }
function calcTotals() {
  const sub = r2(cart.reduce((s, i) => { const p = prod(i.id); return s + (p ? p.price * i.qty : 0); }, 0));
  const fee = getVal("deliv") === "delivery" ? Number(settings.deliveryFee || 0) : 0;
  return { sub, fee, total: r2(sub + fee) };
}
function renderCart() {
  cart = cart.filter(i => prod(i.id));
  $("cartItems").innerHTML = cart.length ? cart.map(i => {
    const p = prod(i.id);
    return `<div class="cart-item"><div><b>${safe(p.name)}</b><div class="muted" style="font-size:12px">${money(p.price)} ${p.byWeight ? "por kilo" : "c/u"}</div><div class="qty"><button type="button" onclick="changeQty(${p.id},-1)">−</button><b>${fmtQty(p, i.qty)}</b><button type="button" onclick="changeQty(${p.id},1)">+</button><button class="btn danger small" type="button" onclick="removeItem(${p.id})">Quitar</button></div></div><b>${money(p.price * i.qty)}</b></div>`;
  }).join("") : `<div class="empty"><div class="big">🛒</div>Tu carrito está vacío.<br>Agrega productos desde el catálogo.</div>`;
  renderCartSummary(); persistCart();
}
function renderCartSummary() {
  const deliv = getVal("deliv"), pay = getVal("pay"), t = calcTotals();
  document.querySelectorAll(".choice label").forEach(l => { const i = l.querySelector("input"); l.classList.toggle("sel", i.checked); });
  const wasHidden = $("deliveryBlock").classList.contains("hidden");
  $("deliveryBlock").classList.toggle("hidden", deliv !== "delivery");
  if (deliv === "delivery" && wasHidden && currentPage === "cart") deliveryPicker.init();
  $("sumSub").textContent = money(t.sub);
  $("sumFee").textContent = deliv === "delivery" ? (t.fee > 0 ? money(t.fee) : "Gratis") : "Recojo en tienda (Bs 0,00)";
  $("cartTotal").textContent = money(t.total);
  let info = "";
  if (pay === "Efectivo") info = "Pagas en efectivo al recibir o recoger tu pedido.";
  else if (pay === "QR") info = settings.qr ? "Escanea este QR para pagar y envía tu comprobante por WhatsApp:" : "El vendedor te enviará el QR por WhatsApp.";
  else info = settings.payNote ? "Datos para la transferencia:\n" + settings.payNote : "El vendedor te enviará los datos de la cuenta por WhatsApp.";
  $("payInfo").innerHTML = safe(info) + (pay === "QR" && settings.qr ? `<img src="${safe(settings.qr)}" alt="QR de pago">` : "");
}

/* ---------- enviar pedido ---------- */
function submitOrder(e) {
  e.preventDefault();
  if (!cart.length) return toast("Agrega al menos un producto");
  const name = $("customerName").value.trim(), phone = $("customerPhone").value.trim(), notes = $("customerNotes").value.trim();
  const deliv = getVal("deliv"), pay = getVal("pay");
  const address = $("customerAddress").value.trim();
  const mapUrl = deliv === "delivery" && deliveryPicker.coords ? `https://www.google.com/maps?q=${deliveryPicker.coords.lat},${deliveryPicker.coords.lng}` : "";
  if (digits(phone).length < 7 || digits(phone).length > 12) return toast("Escribe un teléfono válido");
  if (deliv === "delivery" && !address && !mapUrl) return toast("Para delivery escribe tu dirección o marca el mapa");
  for (const i of cart) { const p = prod(i.id); if (!p || i.qty > p.stock) return toast("“" + (p ? p.name : "Un producto") + "” ya no tiene stock suficiente. Revisa tu pedido."); }
  const items = cart.map(i => { const p = prod(i.id); return { id: p.id, name: p.name, qty: i.qty, qtyLabel: fmtQty(p, i.qty), byWeight: !!p.byWeight, price: p.price, subtotal: r2(p.price * i.qty) }; });
  const t = calcTotals();
  const order = { id: newOrderId(), ts: Date.now(), date: new Date().toLocaleString("es-BO"), name, phone, delivery: deliv, pay, address: deliv === "delivery" ? address : "", notes, mapUrl, items, subtotal: t.sub, fee: t.fee, total: t.total, status: "Pendiente", stockApplied: false };
  const lines = items.map(i => `• ${i.name} — ${i.qtyLabel} — ${money(i.subtotal)}`).join("\n");
  const message = `Hola, quiero hacer este pedido en MiniPedidos (N° ${order.id.slice(-6)}):\n\n${lines}\n\nSubtotal: ${money(t.sub)}\nEnvío: ${deliv === "delivery" ? money(t.fee) : "Recojo en tienda"}\nTOTAL ESTIMADO: ${money(t.total)}\n\nCliente: ${name}\nTeléfono: ${phone}\nEntrega: ${deliv === "delivery" ? "Delivery" : "Recojo en tienda"}\nDirección: ${order.address || "No indicada"}\nUbicación en mapa: ${mapUrl || "No marcada"}\nPago: ${pay}\nNota: ${notes || "Ninguna"}\n\nPor favor, confirmar disponibilidad.`;
  window.open("https://wa.me/" + intl(settings.phone) + "?text=" + encodeURIComponent(message), "_blank");
  myIds = [order.id, ...myIds].slice(0, 20); lsSet("mp_myorders", myIds);
  if ($("rememberMe").checked) lsSet("mp_customer", { name, phone, address }); else localStorage.removeItem("mp_customer");
  backend.addOrder(order).then(() => { refreshAll(); }).catch(() => toast("⚠ No se pudo guardar el pedido en el sistema. Confirma por WhatsApp."));
  cart = []; persistCart(); updateCount();
  $("customerNotes").value = ""; deliveryPicker.clear();
  showPage("orders"); toast("Pedido enviado. Aquí puedes ver su estado.");
}

/* ---------- mis pedidos (cliente) ---------- */
const STATUS_TEXT = { "Pendiente": "Esperando que el vendedor lo confirme.", "Aceptado": "El vendedor confirmó tu pedido y lo está preparando.", "En camino": "Tu pedido va en camino. 🛵", "Entregado": "Pedido entregado. ¡Gracias por tu compra!", "Rechazado": "El vendedor no pudo atender este pedido. Contáctalo para más información." };
function statusClass(s) { return s === "Entregado" || s === "Aceptado" ? "done" : s === "En camino" ? "ship" : s === "Rechazado" ? "bad" : ""; }
function orderItemsHTML(o) { return (o.items || []).map(i => `${safe(i.name)} × ${safe(i.qtyLabel || i.qty)} (${money(i.subtotal)})`).join("<br>"); }
function renderMyOrders() {
  const list = backend ? backend.getMyOrders().slice().sort((a, b) => (b.ts || 0) - (a.ts || 0)) : [];
  $("myOrdersList").innerHTML = list.length ? list.map(o => {
    const steps = o.delivery === "delivery" ? ["Pendiente", "Aceptado", "En camino", "Entregado"] : ["Pendiente", "Aceptado", "Entregado"];
    const idx = steps.indexOf(o.status);
    const track = o.status === "Rechazado" ? "" : `<div class="track">${steps.map((s, i) => `<span class="${i <= idx ? "on" : ""} ${i === idx ? "cur" : ""}">${s}</span>`).join("")}</div>`;
    const wa = `https://wa.me/${intl(settings.phone)}?text=${encodeURIComponent("Hola, consulto por mi pedido N° " + String(o.id).slice(-6))}`;
    return `<div class="order-card"><div class="order-head"><div><b>Pedido #${safe(String(o.id).slice(-6))}</b><div class="muted" style="font-size:12px;margin-top:4px">${safe(o.date)} · ${o.delivery === "delivery" ? "Delivery" : "Recojo en tienda"} · Pago: ${safe(o.pay || "Efectivo")}</div></div><span class="status ${statusClass(o.status)}">${safe(o.status)}</span></div>${track}<p style="font-size:14px;margin:6px 0">${safe(STATUS_TEXT[o.status] || "")}</p><p style="font-size:13px;line-height:1.6;margin:8px 0">${orderItemsHTML(o)}</p><div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap"><b>Total: ${money(o.total)}</b><a class="btn secondary small" href="${wa}" target="_blank" rel="noopener">💬 Consultar este pedido</a></div></div>`;
  }).join("") : `<div class="panel empty"><div class="big">📋</div>Aún no has hecho pedidos desde este dispositivo.</div>`;
}

/* ---------- acceso del vendedor ---------- */
function openModal(html) { $("modalHost").innerHTML = `<div class="modal-back" onclick="if(event.target===this)closeModal()"><div class="modal">${html}</div></div>`; const i = $("modalHost").querySelector("input"); if (i) setTimeout(() => i.focus(), 50); }
function closeModal() { $("modalHost").innerHTML = ""; }
const hashPin = s => {
  if (window.crypto && crypto.subtle) return crypto.subtle.digest("SHA-256", new TextEncoder().encode("mp:" + s)).then(b => Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, "0")).join(""));
  let h = 5381; for (const c of "mp:" + s) h = ((h << 5) + h + c.charCodeAt(0)) | 0; return Promise.resolve("d" + h);
};
function openLogin() {
  if (backend.name === "firebase") {
    openModal(`<h3>🏪 Acceso del vendedor</h3><p class="muted" style="font-size:13px;margin:0 0 12px">Ingresa con tu correo y contraseña.</p><form onsubmit="doLogin(event)"><div class="field"><input id="lgEmail" type="email" placeholder="Correo" required autocomplete="username"></div><div class="field"><input id="lgPass" type="password" placeholder="Contraseña" required autocomplete="current-password"></div><button class="btn primary" style="width:100%" type="submit">Entrar</button> <button class="btn secondary" style="width:100%;margin-top:8px" type="button" onclick="closeModal()">Cancelar</button></form>`);
  } else if (!localStorage.getItem("mp_pin")) {
    openModal(`<h3>🔑 Crea tu PIN de vendedor</h3><p class="muted" style="font-size:13px;margin:0 0 12px">Será necesario para entrar al panel. Usa de 4 a 8 números.</p><form onsubmit="doLogin(event)"><div class="field"><input id="lgPin" type="password" inputmode="numeric" placeholder="Nuevo PIN" required></div><div class="field"><input id="lgPin2" type="password" inputmode="numeric" placeholder="Repite el PIN" required></div><button class="btn primary" style="width:100%" type="submit">Guardar y entrar</button> <button class="btn secondary" style="width:100%;margin-top:8px" type="button" onclick="closeModal()">Cancelar</button></form>`);
  } else {
    openModal(`<h3>🏪 Acceso del vendedor</h3><p class="muted" style="font-size:13px;margin:0 0 12px">Ingresa tu PIN.</p><form onsubmit="doLogin(event)"><div class="field"><input id="lgPin" type="password" inputmode="numeric" placeholder="PIN" required></div><button class="btn primary" style="width:100%" type="submit">Entrar</button> <button class="btn secondary" style="width:100%;margin-top:8px" type="button" onclick="closeModal()">Cancelar</button></form>`);
  }
}
async function doLogin(e) {
  e.preventDefault();
  try {
    if (backend.name === "firebase") {
      await backend.login($("lgEmail").value.trim(), $("lgPass").value);
      isAdmin = true;
    } else {
      const pin = $("lgPin").value.trim(), stored = localStorage.getItem("mp_pin");
      if (!stored) {
        if (!/^\d{4,8}$/.test(pin)) return toast("El PIN debe tener de 4 a 8 números");
        if (pin !== $("lgPin2").value.trim()) return toast("Los PIN no coinciden");
        localStorage.setItem("mp_pin", await hashPin(pin));
      } else if ((await hashPin(pin)) !== stored) return toast("PIN incorrecto");
      sessionStorage.setItem("mp_admin", "1"); isAdmin = true;
    }
    closeModal(); showPage("admin");
  } catch (err) { toast("No se pudo entrar. Revisa tus datos."); }
}
function openChangePin() {
  if (backend.name === "firebase") return toast("Tu contraseña se cambia desde la consola de Firebase");
  openModal(`<h3>🔑 Cambiar PIN</h3><form onsubmit="doChangePin(event)"><div class="field"><input id="cpOld" type="password" inputmode="numeric" placeholder="PIN actual" required></div><div class="field"><input id="cpNew" type="password" inputmode="numeric" placeholder="Nuevo PIN (4 a 8 números)" required></div><button class="btn primary" style="width:100%" type="submit">Cambiar</button> <button class="btn secondary" style="width:100%;margin-top:8px" type="button" onclick="closeModal()">Cancelar</button></form>`);
}
async function doChangePin(e) {
  e.preventDefault();
  if ((await hashPin($("cpOld").value.trim())) !== localStorage.getItem("mp_pin")) return toast("El PIN actual no es correcto");
  const n = $("cpNew").value.trim(); if (!/^\d{4,8}$/.test(n)) return toast("El PIN debe tener de 4 a 8 números");
  localStorage.setItem("mp_pin", await hashPin(n)); closeModal(); toast("PIN actualizado");
}
async function logoutAdmin() { try { await backend.logout(); } catch (e) {} isAdmin = false; if (backend.name === "local") sessionStorage.removeItem("mp_admin"); showPage("shop"); refreshAll(); }

/* ---------- panel del vendedor ---------- */
function updatePending() {
  const n = isAdmin ? orders.filter(o => o.status === "Pendiente").length : 0;
  const b = $("pendingBadge"); b.textContent = n; b.classList.toggle("hidden", n === 0);
}
function fillSettingsForm() {
  $("businessName").value = settings.name || ""; $("businessPhone").value = settings.phone || "";
  $("businessAddress").value = settings.address || ""; $("contact1").value = settings.contact1 || ""; $("contact2").value = settings.contact2 || "";
  $("deliveryFee").value = settings.deliveryFee || ""; $("payNote").value = settings.payNote || "";
  qrData = settings.qr || ""; renderQrPreview();
  sellerPicker.init(settings.lat != null ? [settings.lat, settings.lng] : LA_GUARDIA, settings.lat != null ? 16 : 15);
  if (settings.lat != null && settings.lng != null) sellerPicker.set(settings.lat, settings.lng); else sellerPicker.clear();
  $("modeNotice").className = "notice" + (backend.name === "local" ? " warn" : "");
  $("modeNotice").innerHTML = backend.name === "local"
    ? "<b>Modo local:</b> los productos y pedidos se guardan solo en este navegador, así que los pedidos de otros teléfonos <b>no llegarán aquí</b> (solo el mensaje de WhatsApp). Para recibirlos en tiempo real conecta Firebase: las instrucciones están al inicio del código (FIREBASE_CONFIG)."
    : "<b>Conectado a Firebase:</b> los pedidos llegan en tiempo real y los cambios se comparten con todos los clientes.";
  $("changePinBtn").classList.toggle("hidden", backend.name !== "local");
}
function renderQrPreview() { $("qrPreview").innerHTML = qrData ? `<img src="${safe(qrData)}" alt="QR de pago">` : "Sin QR"; }
async function handleQrImage(ev) { try { qrData = await resizeImage(ev.target.files[0], 700, 0.8); renderQrPreview(); } catch (e) { toast("Elige una imagen válida"); } ev.target.value = ""; }
function removeQr() { qrData = ""; renderQrPreview(); }
async function saveSettings() {
  const phone = digits($("businessPhone").value);
  if (phone.length < 8) return toast("Escribe el WhatsApp del negocio (con código de país)");
  const c = sellerPicker.coords;
  const s = { ...settings, name: $("businessName").value.trim() || "Mi tienda de abarrotes", phone, address: $("businessAddress").value.trim(), contact1: digits($("contact1").value), contact2: digits($("contact2").value), deliveryFee: Math.max(0, Number($("deliveryFee").value) || 0), payNote: $("payNote").value.trim(), qr: qrData, lat: c ? c.lat : null, lng: c ? c.lng : null };
  try { await backend.saveSettings(s); refreshAll(); toast("Perfil del vendedor guardado"); } catch (e) { toast("No se pudo guardar (la imagen puede ser muy grande)"); }
}
async function handleProductImage(ev) {
  try { productImageData = await resizeImage(ev.target.files[0], 600, 0.7); $("productImagePreview").innerHTML = `<img src="${productImageData}" alt="Vista previa del producto">`; }
  catch (e) { toast("Elige una imagen válida"); }
  $("prodImageGallery").value = ""; $("prodImageCamera").value = "";
}
function removeProductImage() { productImageData = ""; $("productImagePreview").textContent = "Vista previa de la foto"; $("prodImageGallery").value = ""; $("prodImageCamera").value = ""; }
async function saveProduct(e) {
  e.preventDefault();
  const editId = Number($("editProductId").value) || 0;
  const byWeight = $("prodWeight").checked;
  const p = { id: editId || Date.now(), name: $("prodName").value.trim(), price: Number($("prodPrice").value), category: $("prodCategory").value, stock: r2(Number($("prodStock").value || 0)), emoji: $("prodEmoji").value.trim() || "🛒", unit: $("prodUnit").value.trim() || (byWeight ? "Por kilo" : ""), byWeight, image: productImageData || "" };
  try { await backend.saveProduct(p); } catch (err) { return toast("No se pudo guardar. Si agregaste foto, prueba con una más pequeña."); }
  resetProductForm(); refreshAll(); toast(editId ? "Producto actualizado" : "Producto agregado");
}
function editProduct(id) {
  const p = prod(id); if (!p) return;
  $("editProductId").value = p.id; $("prodName").value = p.name; $("prodPrice").value = p.price; $("prodCategory").value = p.category; $("prodStock").value = p.stock; $("prodEmoji").value = p.emoji || ""; $("prodUnit").value = p.unit || ""; $("prodWeight").checked = !!p.byWeight;
  productImageData = p.image || ""; $("productImagePreview").innerHTML = productImageData ? `<img src="${safe(productImageData)}" alt="Vista previa del producto">` : "Vista previa de la foto";
  $("productFormTitle").textContent = "Editar producto"; $("cancelEdit").classList.remove("hidden"); $("prodName").focus(); window.scrollTo({ top: 0, behavior: "smooth" });
}
async function deleteProduct(id) {
  if (!confirm("¿Eliminar este producto del catálogo?")) return;
  try { await backend.deleteProduct(id); cart = cart.filter(i => i.id !== id); persistCart(); refreshAll(); toast("Producto eliminado"); } catch (e) { toast("No se pudo eliminar"); }
}
function resetProductForm() { $("productForm").reset(); $("editProductId").value = ""; $("prodStock").value = 20; $("productFormTitle").textContent = "Agregar producto"; $("cancelEdit").classList.add("hidden"); removeProductImage(); }
async function seedProducts() { try { await backend.seed(); refreshAll(); toast("Productos de ejemplo cargados"); } catch (e) { toast("No se pudieron cargar"); } }
function renderAdmin() {
  $("adminProducts").textContent = products.length;
  $("adminPending").textContent = orders.filter(o => o.status === "Pendiente").length;
  $("adminOrders").textContent = orders.length ? "(" + orders.length + ")" : "";
  $("adminProductList").innerHTML = products.length ? products.map(p => `<div style="display:flex;gap:8px;align-items:center;justify-content:space-between;border-bottom:1px solid var(--line);padding:10px 0"><div style="display:flex;align-items:center;gap:10px">${p.image ? `<img src="${safe(p.image)}" alt="" style="width:42px;height:42px;border-radius:8px;object-fit:cover">` : `<span style="font-size:28px">${safe(p.emoji)}</span>`}<div><b>${safe(p.name)}</b>${p.byWeight ? ' <span class="muted" style="font-size:11px">(por peso)</span>' : ""}<div class="muted" style="font-size:12px">${money(p.price)} · stock ${fmtQty(p, p.stock)}${p.stock <= 5 ? ' <span style="color:#b26a00;font-weight:700">⚠ stock bajo</span>' : ""}</div></div></div><div style="display:flex;gap:5px"><button class="btn secondary small" onclick="editProduct(${p.id})">Editar</button><button class="btn danger small" onclick="deleteProduct(${p.id})">×</button></div></div>`).join("") : `<p class="muted">No hay productos.</p><button class="btn primary small" onclick="seedProducts()">Cargar productos de ejemplo</button>`;
  $("ordersList").innerHTML = orders.length ? orders.map(o => {
    const id = safe(o.id), st = o.status, doneStock = ["Aceptado", "En camino", "Entregado"].includes(st);
    return `<div class="order-card"><div class="order-head"><div><b>Pedido #${safe(String(o.id).slice(-6))} · ${safe(o.name)}</b><div class="muted" style="font-size:12px;margin-top:4px">${safe(o.date)} · Tel. ${safe(o.phone)} · ${o.delivery === "delivery" ? "🛵 Delivery" : "🏪 Recojo"} · Pago: ${safe(o.pay || "Efectivo")}</div></div><span class="status ${statusClass(st)}">${safe(st)}</span></div><p style="font-size:13px;line-height:1.6">${orderItemsHTML(o)}</p><div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap"><div><b>Total: ${money(o.total)}</b>${o.fee ? `<div class="muted" style="font-size:12px">Incluye envío ${money(o.fee)}</div>` : ""}</div><div class="seller-profile-actions"><button class="btn primary small" onclick="setOrderStatus('${id}','Aceptado')" ${doneStock ? "disabled" : ""}>Aceptar</button>${o.delivery === "delivery" ? `<button class="btn secondary small" onclick="setOrderStatus('${id}','En camino')" ${st === "En camino" || st === "Entregado" ? "disabled" : ""}>En camino</button>` : ""}<button class="btn secondary small" onclick="setOrderStatus('${id}','Entregado')" ${st === "Entregado" ? "disabled" : ""}>Entregado</button><button class="btn danger small" onclick="setOrderStatus('${id}','Rechazado')" ${st === "Rechazado" ? "disabled" : ""}>Rechazar</button><button class="btn secondary small" onclick="deleteOrder('${id}')">Eliminar</button></div></div>${o.address ? `<div class="muted" style="font-size:12px;margin-top:8px">Dirección: ${safe(o.address)}</div>` : ""}${o.mapUrl ? `<div class="muted" style="font-size:12px;margin-top:4px"><a href="${safe(o.mapUrl)}" target="_blank" rel="noopener">📍 Ver ubicación en Google Maps</a></div>` : ""}${o.notes ? `<div class="muted" style="font-size:12px;margin-top:4px">Nota: ${safe(o.notes)}</div>` : ""}<div style="margin-top:8px"><a class="btn secondary small" href="https://wa.me/${intl(o.phone)}?text=${encodeURIComponent("Hola " + o.name + ", sobre tu pedido N° " + String(o.id).slice(-6) + ": ")}" target="_blank" rel="noopener">💬 Escribir al cliente</a></div></div>`;
  }).join("") : `<div class="empty"><div class="big">📋</div>Aún no hay pedidos registrados.</div>`;
  updatePending();
}
async function adjustStock(o, sign) {
  for (const it of o.items || []) { const p = prod(it.id); if (!p) continue; await backend.saveProduct({ ...p, stock: Math.max(0, r2(p.stock + sign * it.qty)) }); }
}
async function setOrderStatus(id, status) {
  const o = orders.find(x => String(x.id) === String(id)); if (!o) return;
  const patch = { status };
  try {
    if (["Aceptado", "En camino", "Entregado"].includes(status) && !o.stockApplied) { await adjustStock(o, -1); patch.stockApplied = true; }
    else if (status === "Rechazado" && o.stockApplied) { await adjustStock(o, 1); patch.stockApplied = false; }
    await backend.updateOrder(id, patch); refreshAll(); toast("Pedido actualizado: " + status);
  } catch (e) { toast("No se pudo actualizar el pedido"); }
}
async function deleteOrder(id) { if (!confirm("¿Eliminar este pedido?")) return; try { await backend.deleteOrder(id); refreshAll(); } catch (e) { toast("No se pudo eliminar"); } }
async function clearOrders() { if (!orders.length) return; if (!confirm("¿Seguro que quieres borrar todo el historial?")) return; try { await backend.clearOrders(); refreshAll(); toast("Historial borrado"); } catch (e) { toast("No se pudo borrar"); } }

/* ---------- instalar como app (PWA) ---------- */
let deferredInstall = null;
function setupPWA() {
  try {
    const icon = n => { const c = document.createElement("canvas"); c.width = c.height = n; const x = c.getContext("2d"); x.fillStyle = "#16845b"; x.fillRect(0, 0, n, n); x.fillStyle = "#fff"; x.font = "bold " + Math.round(n * .55) + "px sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("✓", n / 2, n / 2); return c.toDataURL("image/png"); };
    const m = { name: "MiniPedidos", short_name: "MiniPedidos", start_url: location.href.split("#")[0], display: "standalone", background_color: "#f4f6f8", theme_color: "#16845b", icons: [{ src: icon(192), sizes: "192x192", type: "image/png" }, { src: icon(512), sizes: "512x512", type: "image/png" }] };
    const l = document.createElement("link"); l.rel = "manifest"; l.href = URL.createObjectURL(new Blob([JSON.stringify(m)], { type: "application/manifest+json" })); document.head.appendChild(l);
  } catch (e) {}
  window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); deferredInstall = e; $("installBtn").classList.remove("hidden"); });
}
function installApp() { if (deferredInstall) { deferredInstall.prompt(); deferredInstall = null; $("installBtn").classList.add("hidden"); } }

/* ---------- inicio ---------- */
(async function init() {
  const me = lsGet("mp_customer", null);
  if (me) { $("customerName").value = me.name || ""; $("customerPhone").value = me.phone || ""; $("customerAddress").value = me.address || ""; }
  setupPWA();
  backend = USE_FB ? FBBackend : LocalBackend;
  try { await backend.start(); }
  catch (e) {
    if (USE_FB) { toast("Sin conexión con la base de datos. Usando modo local."); backend = LocalBackend; await backend.start(); }
  }
  refreshAll();
})();
