// /js/index.js
console.log("前台 商品列表 初始化");

const supabaseClient = window.supabaseClient;
if (!supabaseClient) {
  console.error("supabaseClient 不存在，請確認 js/supabase.js 是否正確載入。");
}

const els = {
  grid: document.getElementById("grid"),
  empty: document.getElementById("emptyState"),
  emptyResetBtn: document.getElementById("emptyResetBtn"),
  metaText: document.getElementById("metaText"),

  searchInput: document.getElementById("searchInput"),
  clearBtn: document.getElementById("clearBtn"),
  allBtn: document.getElementById("allBtn"),

  categorySelect: document.getElementById("categorySelect"),
  sortSelect: document.getElementById("sortSelect"),
  pageSizeSelect: document.getElementById("pageSizeSelect"),

  prevPageBtn: document.getElementById("prevPageBtn"),
  nextPageBtn: document.getElementById("nextPageBtn"),
  pageIndicator: document.getElementById("pageIndicator"),
};

const state = {
  categories: [],
  products: [],
  filtered: [],

  q: "",
  category: "",
  sort: "updated_desc",

  page: 1,
  pageSize: 10,
  total: 0,
  totalPages: 1,
};

function formatPrice(n) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return "—";
  const num = Number(n);
  return `NT$ ${num.toLocaleString("zh-Hant")}`;
}

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}/${m}/${day} ${hh}:${mm}`;
}

function normalize(s) {
  return (s || "").toString().trim().toLowerCase();
}

function applyFilters() {
  const q = normalize(state.q);
  const cat = normalize(state.category);

  let arr = state.products.slice();

  // ✅ 只顯示啟用
  arr = arr.filter(p => p.is_active === true);

  // 搜尋
  if (q) {
    arr = arr.filter(p => {
      const name = normalize(p.name);
      const spec = normalize(p.spec);
      const category = normalize(p.category);
      const unit = normalize(p.unit);
      return (
        name.includes(q) ||
        spec.includes(q) ||
        category.includes(q) ||
        unit.includes(q)
      );
    });
  }

  // 分類
  if (cat) {
    arr = arr.filter(p => normalize(p.category) === cat);
  }

  // 排序
  const sort = state.sort;
  const getUpdated = (p) => new Date(p.last_price_updated_at || p.updated_at || p.created_at || 0).getTime();
  const getPrice = (p) => (p.last_price === null || p.last_price === undefined) ? -Infinity : Number(p.last_price);
  const getName = (p) => (p.name || "").toString();

  arr.sort((a, b) => {
    if (sort === "updated_desc") return getUpdated(b) - getUpdated(a);
    if (sort === "updated_asc") return getUpdated(a) - getUpdated(b);
    if (sort === "price_asc") return getPrice(a) - getPrice(b);
    if (sort === "price_desc") return getPrice(b) - getPrice(a);
    if (sort === "name_asc") return getName(a).localeCompare(getName(b), "zh-Hant");
    if (sort === "name_desc") return getName(b).localeCompare(getName(a), "zh-Hant");
    return 0;
  });

  state.filtered = arr;
  state.total = arr.length;
  state.totalPages = Math.max(1, Math.ceil(state.total / state.pageSize));
  if (state.page > state.totalPages) state.page = state.totalPages;
  if (state.page < 1) state.page = 1;
}

function render() {
  applyFilters();

  // meta + pager
  const start = (state.page - 1) * state.pageSize + 1;
  const end = Math.min(state.total, state.page * state.pageSize);

  els.metaText.textContent = state.total === 0
    ? "目前沒有資料"
    : `顯示第 ${start}–${end} 筆（共 ${state.total} 筆）`;

  els.pageIndicator.textContent = `第 ${state.page} / ${state.totalPages} 頁`;
  els.prevPageBtn.disabled = state.page <= 1;
  els.nextPageBtn.disabled = state.page >= state.totalPages;

  // empty
  if (state.total === 0) {
    els.grid.innerHTML = "";
    els.empty.style.display = "block";
    return;
  } else {
    els.empty.style.display = "none";
  }

  // page slice
  const sliceStart = (state.page - 1) * state.pageSize;
  const sliceEnd = sliceStart + state.pageSize;
  const pageItems = state.filtered.slice(sliceStart, sliceEnd);

  els.grid.innerHTML = pageItems.map((p) => {
    const img = p.image_url || "";
    const category = p.category || "未分類";
    const spec = p.spec || "—";
    const unit = p.unit || "—";
    const lastPrice = formatPrice(p.last_price);
    const suggested = formatPrice(p.suggested_price);
    const updated = formatDate(p.last_price_updated_at || p.updated_at || p.created_at);

    const desc = (p.description || "").toString().trim();
    const hasDesc = !!desc;

    // ✅ 兩行預覽 + 展開/收合（A 方案）
    const descHtml = hasDesc
      ? `
        <div class="desc clamp" data-desc="${encodeURIComponent(desc)}">${escapeHtml(desc)}</div>
        <div class="desc-actions">
          <button class="link-btn" type="button" data-action="toggleDesc">查看更多</button>
        </div>
      `
      : `<div class="desc clamp">（無描述）</div>`;

    return `
      <article class="card" data-id="${p.id}">
        <div class="card-img">
          ${img ? `<img src="${img}" alt="${escapeHtml(p.name || "")}" loading="lazy" />` : ""}
        </div>

        <div class="card-body">
          <h3 class="card-title">${escapeHtml(p.name || "")}</h3>

          <div class="card-sub">
            <span>${escapeHtml(spec)}</span>
            <span class="tag">${escapeHtml(category)}</span>
          </div>

          <div class="price">
            <div class="price-line">
              <span class="price-label">單位</span>
              <span class="price-value">${escapeHtml(unit)}</span>
            </div>
            <div class="price-line">
              <span class="price-label">進價</span>
              <span class="price-value">${lastPrice}</span>
            </div>
            <div class="price-line">
              <span class="price-label">建議售價</span>
              <span class="price-value">${suggested}</span>
            </div>
          </div>

          ${descHtml}
        </div>

        <div class="card-footer">
          <span>價格更新時間：${updated}</span>
        </div>
      </article>
    `;
  }).join("");
}

// XSS-safe
function escapeHtml(str) {
  const s = (str || "").toString();
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// categories：優先用 categories 表；若抓不到就 fallback 用 products distinct
async function loadCategories() {
  try {
    const { data, error } = await supabaseClient
      .from("categories")
      .select("name")
      .order("name", { ascending: true });

    if (error) throw error;

    const names = Array.from(
      new Set((data || []).map(x => (x.name || "").toString().trim()).filter(Boolean))
    );

    state.categories = names;
    renderCategoryOptions();
  } catch (e) {
    console.warn("categories 表讀取失敗，改用 products.category fallback：", e?.message || e);
    const names = Array.from(
      new Set(state.products.map(p => (p.category || "").toString().trim()).filter(Boolean))
    ).sort((a,b)=>a.localeCompare(b, "zh-Hant"));
    state.categories = names;
    renderCategoryOptions();
  }
}

function renderCategoryOptions() {
  const sel = els.categorySelect;
  const current = sel.value;
  sel.innerHTML = `<option value="">全部分類</option>` + state.categories.map(n => {
    return `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`;
  }).join("");

  // 盡量保留原本選取
  if (current) sel.value = current;
}

async function loadProducts() {
  const { data, error } = await supabaseClient
    .from("products")
    .select("id,name,category,spec,unit,last_price,suggested_price,description,is_active,image_url,last_price_updated_at,updated_at,created_at");

  if (error) {
    console.error("讀取 products 失敗：", error);
    els.metaText.textContent = "讀取資料失敗，請稍後再試。";
    return;
  }

  state.products = data || [];
}

function resetFilters() {
  state.q = "";
  state.category = "";
  state.sort = "updated_desc";
  state.page = 1;
  state.pageSize = Number(els.pageSizeSelect.value) || 10;

  els.searchInput.value = "";
  els.categorySelect.value = "";
  els.sortSelect.value = "updated_desc";
  els.pageSizeSelect.value = String(state.pageSize);

  render();
}

// events
function bindEvents() {
  // ✅ 全部商品按鈕（你之前說沒反應，這版會重置）
  els.allBtn.addEventListener("click", () => resetFilters());

  els.emptyResetBtn.addEventListener("click", () => resetFilters());

  els.clearBtn.addEventListener("click", () => {
    els.searchInput.value = "";
    state.q = "";
    state.page = 1;
    render();
  });

  els.searchInput.addEventListener("input", () => {
    state.q = els.searchInput.value;
    state.page = 1;
    render();
  });

  els.categorySelect.addEventListener("change", () => {
    state.category = els.categorySelect.value;
    state.page = 1;
    render();
  });

  els.sortSelect.addEventListener("change", () => {
    state.sort = els.sortSelect.value;
    state.page = 1;
    render();
  });

  els.pageSizeSelect.addEventListener("change", () => {
    state.pageSize = Number(els.pageSizeSelect.value) || 10;
    state.page = 1;
    render();
  });

  els.prevPageBtn.addEventListener("click", () => {
    if (state.page > 1) {
      state.page -= 1;
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  });

  els.nextPageBtn.addEventListener("click", () => {
    if (state.page < state.totalPages) {
      state.page += 1;
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  });

  // description 展開/收合（事件委派）
  els.grid.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action='toggleDesc']");
    if (!btn) return;

    const card = e.target.closest(".card");
    if (!card) return;

    const descEl = card.querySelector(".desc");
    if (!descEl) return;

    const isClamped = descEl.classList.contains("clamp");
    if (isClamped) {
      descEl.classList.remove("clamp");
      btn.textContent = "收合";
    } else {
      descEl.classList.add("clamp");
      btn.textContent = "查看更多";
    }
  });
}

async function init() {
  if (!supabaseClient) return;

  bindEvents();

  await loadProducts();
  await loadCategories(); // 需要 products 先載好，fallback 才有值

  resetFilters();
}

document.addEventListener("DOMContentLoaded", init);
