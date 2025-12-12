// /js/index.js
// 前台：分類（接 categories 表）+ 排序 + 分頁（server-side）+ 搜尋 + description 展開收合 + 效能優化

console.log("前台商品查詢初始化（穩定版）");

// 取得 Supabase client（在 /js/supabase.js 建立）
const supabaseClient = window.supabaseClient;

// DOM
const gridEl = document.getElementById("grid");
const metaTextEl = document.getElementById("metaText");
const pageIndicatorEl = document.getElementById("pageIndicator");
const prevPageBtn = document.getElementById("prevPageBtn");
const nextPageBtn = document.getElementById("nextPageBtn");

const searchInputEl = document.getElementById("searchInput");
const clearBtnEl = document.getElementById("clearBtn");
const allBtnEl = document.getElementById("allBtn");

const categorySelectEl = document.getElementById("categorySelect");
const sortSelectEl = document.getElementById("sortSelect");
const pageSizeSelectEl = document.getElementById("pageSizeSelect");

const emptyStateEl = document.getElementById("emptyState");
const emptyResetBtn = document.getElementById("emptyResetBtn");

// ---- 安全檢查：必要容器 ----
function ensureContainer() {
  if (!gridEl) {
    console.error("找不到商品容器 #grid");
    return false;
  }
  return true;
}

// ---- UI state ----
let state = {
  keyword: "",
  category: "",              // 以 categories.name 為值（也會套用到 products.category 篩選）
  sort: "updated_desc",
  pageSize: 10,
  page: 1,
  total: 0,
  totalPages: 1,
  loading: false,
};

// ---- utils ----
function formatPrice(value) {
  if (value === null || value === undefined || value === "") return "—";
  const num = Number(value);
  if (Number.isNaN(num)) return "—";
  return `NT$ ${num}`;
}

function formatDateTime(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}/${m}/${day} ${hh}:${mm}`;
}

function setMeta(text) {
  if (metaTextEl) metaTextEl.textContent = text || "";
}

function setPager() {
  const p = Math.min(Math.max(1, state.page), state.totalPages || 1);
  if (pageIndicatorEl) pageIndicatorEl.textContent = `第 ${p} / ${state.totalPages || 1} 頁`;

  if (prevPageBtn) prevPageBtn.disabled = state.loading || p <= 1;
  if (nextPageBtn) nextPageBtn.disabled = state.loading || p >= (state.totalPages || 1);
}

function showEmpty(show) {
  if (emptyStateEl) emptyStateEl.style.display = show ? "" : "none";
}

function clearGrid() {
  if (!gridEl) return;
  gridEl.innerHTML = "";
}

// ---- Card ----
function createCard(p) {
  const card = document.createElement("article");
  card.className = "card";

  const imgWrap = document.createElement("div");
  imgWrap.className = "card-img";

  if (p.image_url) {
    const img = document.createElement("img");
    img.src = p.image_url;
    img.alt = p.name || "商品圖片";
    img.loading = "lazy";
    imgWrap.appendChild(img);
  } else {
    const ph = document.createElement("div");
    ph.style.color = "rgba(0,0,0,0.45)";
    ph.style.fontWeight = "800";
    ph.textContent = "尚未上傳圖片";
    imgWrap.appendChild(ph);
  }

  const body = document.createElement("div");
  body.className = "card-body";

  const title = document.createElement("h3");
  title.className = "card-title";
  title.textContent = p.name || "";

  const sub = document.createElement("div");
  sub.className = "card-sub";

  const left = document.createElement("div");
  left.style.display = "flex";
  left.style.gap = "8px";
  left.style.flexWrap = "wrap";
  left.style.alignItems = "center";

  if (p.category) {
    const tag = document.createElement("span");
    tag.className = "tag";
    tag.textContent = p.category;
    left.appendChild(tag);
  }

  if (p.unit) {
    const unit = document.createElement("span");
    unit.textContent = `單位：${p.unit}`;
    left.appendChild(unit);
  }

  sub.appendChild(left);

  const spec = document.createElement("div");
  spec.textContent = p.spec || "";
  sub.appendChild(spec);

  const price = document.createElement("div");
  price.className = "price";

  const line1 = document.createElement("div");
  line1.className = "price-line";
  line1.innerHTML = `
    <span class="price-label">進　　價：</span>
    <span class="price-value">${formatPrice(p.last_price)}</span>
  `;

  const line2 = document.createElement("div");
  line2.className = "price-line";
  line2.innerHTML = `
    <span class="price-label">建議售價：</span>
    <span class="price-value">${formatPrice(p.suggested_price)}</span>
  `;

  price.appendChild(line1);
  price.appendChild(line2);

  // description（可展開/收合）
  let descWrap = null;
  if (p.description && String(p.description).trim()) {
    const desc = document.createElement("div");
    desc.className = "desc clamp";
    desc.textContent = String(p.description).trim();

    const actions = document.createElement("div");
    actions.className = "desc-actions";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "link-btn";
    btn.textContent = "查看更多";

    let expanded = false;
    btn.addEventListener("click", () => {
      expanded = !expanded;
      if (expanded) {
        desc.classList.remove("clamp");
        btn.textContent = "收合";
      } else {
        desc.classList.add("clamp");
        btn.textContent = "查看更多";
      }
    });

    // 只有在「內容較長」或「有換行」才顯示按鈕（避免每張卡都出現）
    const descText = String(p.description);
    const shouldShowToggle = descText.length > 40 || descText.includes("\n");
    if (shouldShowToggle) {
      actions.appendChild(btn);
    }

    descWrap = document.createElement("div");
    descWrap.appendChild(desc);
    if (shouldShowToggle) descWrap.appendChild(actions);
  }

  const footer = document.createElement("div");
  footer.className = "card-footer";

  const time = document.createElement("div");
  time.textContent = p.last_price_updated_at ? `價格更新時間：${formatDateTime(p.last_price_updated_at)}` : "";

  const active = document.createElement("div");
  active.textContent = p.is_active ? "啟用" : "停用";

  footer.appendChild(time);
  footer.appendChild(active);

  body.appendChild(title);
  body.appendChild(sub);
  body.appendChild(price);
  if (descWrap) body.appendChild(descWrap);
  body.appendChild(footer);

  card.appendChild(imgWrap);
  card.appendChild(body);

  return card;
}

// ---- categories：從 categories 表載入（只負責下拉選項來源） ----
async function loadCategories() {
  if (!supabaseClient || !categorySelectEl) return;

  const { data, error } = await supabaseClient
    .from("categories")
    .select("name")
    .order("name", { ascending: true });

  if (error) {
    console.warn("讀取 categories 失敗，將改用 products.category 做下拉：", error);
    return;
  }

  // 重新建 option
  const keep = `<option value="">全部分類</option>`;
  categorySelectEl.innerHTML = keep;

  const names = (data || [])
    .map((x) => (x?.name ? String(x.name).trim() : ""))
    .filter(Boolean);

  const uniq = Array.from(new Set(names));
  uniq.forEach((name) => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    categorySelectEl.appendChild(opt);
  });
}

// ---- products：server-side 分頁 + 排序 + 搜尋 + 篩選 ----
function applySort(q) {
  // sortSelect value 對應 index.html
  switch (state.sort) {
    case "updated_asc":
      return q.order("last_price_updated_at", { ascending: true, nullsFirst: false });
    case "price_asc":
      return q.order("last_price", { ascending: true, nullsFirst: false });
    case "price_desc":
      return q.order("last_price", { ascending: false, nullsFirst: false });
    case "name_desc":
      return q.order("name", { ascending: false });
    case "name_asc":
      return q.order("name", { ascending: true });
    case "updated_desc":
    default:
      return q.order("last_price_updated_at", { ascending: false, nullsFirst: false });
  }
}

async function fetchProducts() {
  if (!supabaseClient || !ensureContainer()) return;

  state.loading = true;
  setMeta("載入中…");
  setPager();
  showEmpty(false);

  const from = (state.page - 1) * state.pageSize;
  const to = from + state.pageSize - 1;

  let q = supabaseClient
    .from("products")
    .select(
      "id,name,category,spec,unit,last_price,suggested_price,last_price_updated_at,image_url,is_active,description",
      { count: "exact" }
    )
    .eq("is_active", true);

  // category 篩選：下拉來源是 categories 表，但實際比對 products.category
  if (state.category) {
    q = q.eq("category", state.category);
  }

  // keyword：name / spec / category 模糊
  if (state.keyword) {
    const kw = state.keyword.replace(/%/g, "\\%"); // 防止使用者輸入 %
    q = q.or(`name.ilike.%${kw}%,spec.ilike.%${kw}%,category.ilike.%${kw}%`);
  }

  q = applySort(q).range(from, to);

  const { data, error, count } = await q;

  if (error) {
    console.error("前台載入商品錯誤：", error);
    clearGrid();
    setMeta("讀取資料發生錯誤，請稍後再試。");
    state.total = 0;
    state.totalPages = 1;
    setPager();
    state.loading = false;
    return;
  }

  const rows = data || [];
  state.total = typeof count === "number" ? count : rows.length;
  state.totalPages = Math.max(1, Math.ceil(state.total / state.pageSize));

  // 若篩選後頁數縮水，確保頁碼合法
  if (state.page > state.totalPages) {
    state.page = state.totalPages;
    state.loading = false;
    return fetchProducts();
  }

  clearGrid();

  if (!rows.length) {
    setMeta("目前沒有符合條件的商品");
    showEmpty(true);
  } else {
    setMeta(`共 ${state.total} 筆｜每頁 ${state.pageSize} 筆`);
    showEmpty(false);
    rows.forEach((p) => gridEl.appendChild(createCard(p)));
  }

  state.loading = false;
  setPager();
}

// ---- debounce ----
function debounce(fn, wait = 300) {
  let t = null;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

// ---- events ----
if (searchInputEl) {
  searchInputEl.addEventListener(
    "input",
    debounce(() => {
      state.keyword = (searchInputEl.value || "").trim();
      state.page = 1;
      fetchProducts();
    }, 250)
  );
}

if (clearBtnEl) {
  clearBtnEl.addEventListener("click", () => {
    if (searchInputEl) searchInputEl.value = "";
    state.keyword = "";
    state.page = 1;
    fetchProducts();
  });
}

if (allBtnEl) {
  allBtnEl.addEventListener("click", () => {
    state.category = "";
    if (categorySelectEl) categorySelectEl.value = "";
    state.keyword = "";
    if (searchInputEl) searchInputEl.value = "";
    state.page = 1;
    fetchProducts();
  });
}

if (categorySelectEl) {
  categorySelectEl.addEventListener("change", () => {
    state.category = categorySelectEl.value || "";
    state.page = 1;
    fetchProducts();
  });
}

if (sortSelectEl) {
  sortSelectEl.addEventListener("change", () => {
    state.sort = sortSelectEl.value || "updated_desc";
    state.page = 1;
    fetchProducts();
  });
}

if (pageSizeSelectEl) {
  pageSizeSelectEl.addEventListener("change", () => {
    const n = Number(pageSizeSelectEl.value);
    state.pageSize = Number.isFinite(n) && n > 0 ? n : 10;
    state.page = 1;
    fetchProducts();
  });
}

if (prevPageBtn) {
  prevPageBtn.addEventListener("click", () => {
    if (state.page <= 1) return;
    state.page -= 1;
    fetchProducts();
  });
}

if (nextPageBtn) {
  nextPageBtn.addEventListener("click", () => {
    if (state.page >= state.totalPages) return;
    state.page += 1;
    fetchProducts();
  });
}

if (emptyResetBtn) {
  emptyResetBtn.addEventListener("click", () => {
    state.keyword = "";
    state.category = "";
    state.sort = "updated_desc";
    state.page = 1;

    if (searchInputEl) searchInputEl.value = "";
    if (categorySelectEl) categorySelectEl.value = "";
    if (sortSelectEl) sortSelectEl.value = "updated_desc";

    fetchProducts();
  });
}

// ---- init ----
document.addEventListener("DOMContentLoaded", async () => {
  if (!supabaseClient) {
    console.error("前台 supabaseClient 不存在，請確認 /js/supabase.js 是否正確載入。");
    setMeta("系統設定錯誤，請聯絡管理者。");
    return;
  }

  // 先載 categories（下拉選單來源），再載商品
  await loadCategories();

  // 初始化 state 從 UI
  state.sort = sortSelectEl?.value || "updated_desc";
  state.pageSize = Number(pageSizeSelectEl?.value || 10) || 10;

  await fetchProducts();
});
