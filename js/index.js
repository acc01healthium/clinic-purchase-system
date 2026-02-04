// /js/index.js
// 前台：分類 + 排序 + 分頁（伺服器分頁）+ description 展開/收合
(() => {
  "use strict";

  console.log("前台商品查詢初始化（final）");

  // ===== Supabase =====
  const supabaseClient = window.supabaseClient;
  if (!supabaseClient) {
    console.error("❌ supabaseClient 不存在，請確認 /js/supabase.js 是否正確載入。");
    return;
  }

  // ===== DOM =====
  const productList = document.getElementById("productList");
  const searchInput = document.getElementById("searchInput");
  const clearBtn = document.getElementById("clearBtn");
  const statusMessage = document.getElementById("statusMessage");
  const emptyState = document.getElementById("emptyState");
  const emptyResetBtn = document.getElementById("emptyResetBtn");

  const categorySelect = document.getElementById("categorySelect");
  const sortSelect = document.getElementById("sortSelect");
  const pageSizeSelect = document.getElementById("pageSizeSelect");

  const prevBtn = document.getElementById("prevPageBtn");
  const nextBtn = document.getElementById("nextPageBtn");
  const pageInfo = document.getElementById("pageInfo");
  const topBtn = document.getElementById("topBtn");
  const allBtn = document.getElementById("btnAllProducts");

  // Mobile pager
  const mobilePager = document.getElementById("mobilePager");
  const mPrevBtn = document.getElementById("mPrevBtn");
  const mNextBtn = document.getElementById("mNextBtn");
  const mPageIndicator = document.getElementById("mPageIndicator");
  const mTopBtn = document.getElementById("mTopBtn");

  // ===== State =====
  let currentPage = 1;
  let totalPages = 1;
  let totalCount = 0;

  // ===== SelectX =====
  function initSelectX() {
    const wrappers = document.querySelectorAll(".selectx[data-select]");

    wrappers.forEach((wrap) => {
      const selectId = wrap.getAttribute("data-select");
      const sel = document.getElementById(selectId);
      const btn = wrap.querySelector(".selectx-btn");
      const textEl = wrap.querySelector(".selectx-text");
      const menu = wrap.querySelector(".selectx-menu");

      if (!sel || !btn || !textEl || !menu) return;

      const alreadyInited = wrap.dataset.inited === "1";

      const rebuild = () => {
        menu.innerHTML = "";
        const options = Array.from(sel.options);

        options.forEach((opt) => {
          const item = document.createElement("div");
          item.className = "selectx-item";
          item.textContent = opt.textContent;

          if (opt.value === sel.value) item.classList.add("is-active");

          item.addEventListener("click", () => {
            sel.value = opt.value;
            textEl.textContent = opt.textContent;

            menu.querySelectorAll(".selectx-item").forEach((x) => x.classList.remove("is-active"));
            item.classList.add("is-active");

            wrap.classList.remove("is-open");
            btn.setAttribute("aria-expanded", "false");

            sel.dispatchEvent(new Event("change", { bubbles: true }));
          });

          menu.appendChild(item);
        });

        const cur = options.find((o) => o.value === sel.value) || options[0];
        if (cur) textEl.textContent = cur.textContent;
      };

      rebuild();
      wrap.__rebuildSelectX = rebuild;

      if (alreadyInited) return;

      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const open = wrap.classList.toggle("is-open");
        btn.setAttribute("aria-expanded", open ? "true" : "false");
      });

      sel.addEventListener("change", () => {
        const cur = Array.from(sel.options).find((o) => o.value === sel.value);
        if (cur) textEl.textContent = cur.textContent;

        const items = menu.querySelectorAll(".selectx-item");
        items.forEach((x, i) => x.classList.toggle("is-active", sel.options[i]?.value === sel.value));
      });

      document.addEventListener("click", (e) => {
        if (!wrap.contains(e.target)) {
          wrap.classList.remove("is-open");
          btn.setAttribute("aria-expanded", "false");
        }
      });

      wrap.dataset.inited = "1";
    });
  }

  // ===== Utils =====
  function escapeHtml(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function formatPrice(value) {
    if (value === null || value === undefined || value === "") return "—";
    const num = Number(value);
    if (Number.isNaN(num)) return "—";
    return num.toLocaleString("zh-TW");
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

  // ===== Category tone (✅改成 DB tone，跨瀏覽器一致) =====
  let categoryToneMap = new Map();

  function normalizeCategoryName(name) {
    return String(name || "").trim();
  }

  function toneToClass(tone) {
    const n = Number(tone);
    if (Number.isFinite(n) && n >= 0 && n <= 11) return `tone-${n}`;
    return "tone-0";
  }

  function applyCategoryTone(el, categoryName) {
    if (!el || !categoryName) return;
    const key = normalizeCategoryName(categoryName);
    const toneClass = categoryToneMap.get(key) || "tone-0";
    el.classList.add(toneClass);
  }

  // ===== Card =====
  function createProductCard(p) {
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
      ph.style.color = "#6b7280";
      ph.style.fontWeight = "800";
      ph.textContent = "尚未上傳圖片";
      imgWrap.appendChild(ph);
    }

    const body = document.createElement("div");
    body.className = "card-body";

    const title = document.createElement("h3");
    title.className = "card-title";
    title.textContent = p.name || "";

    const meta = document.createElement("div");
    meta.className = "card-meta";

    if (p.category) {
      const tag = document.createElement("span");
      tag.className = "tag";
      tag.textContent = p.category;
      applyCategoryTone(tag, p.category);
      meta.appendChild(tag);
    }

    if (p.unit) {
      const item = document.createElement("div");
      item.className = "meta-item";

      const label = document.createElement("span");
      label.className = "meta-label";
      label.textContent = "單位：";

      const val = document.createElement("span");
      val.textContent = p.unit;

      item.appendChild(label);
      item.appendChild(val);
      meta.appendChild(item);
    }

    if (p.spec) {
      const item = document.createElement("div");
      item.className = "meta-item";

      const label = document.createElement("span");
      label.className = "meta-label";
      label.textContent = "規格：";

      const val = document.createElement("span");
      val.textContent = p.spec;

      item.appendChild(label);
      item.appendChild(val);
      meta.appendChild(item);
    }

    const price = document.createElement("div");
    price.className = "price";
    price.innerHTML =
      '<div class="price-line">' +
        '<span class="price-label">參考進價：</span>' +
        '<span class="price-value">NT$ ' + escapeHtml(formatPrice(p.last_price)) + '</span>' +
      "</div>" +
      '<div class="price-line">' +
        '<span class="price-label">建議售價：</span>' +
        '<span class="price-value">NT$ ' + escapeHtml(formatPrice(p.suggested_price)) + "</span>" +
      "</div>";

    const descText = (p.description || "").trim();
    let descBlock = null;

    if (descText) {
      const desc = document.createElement("div");
      desc.className = "desc clamp";
      desc.textContent = descText;

      const actions = document.createElement("div");
      actions.className = "desc-actions";

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "link-btn";
      btn.textContent = "查看更多";

      btn.addEventListener("click", () => {
        const isClamped = desc.classList.contains("clamp");
        if (isClamped) {
          desc.classList.remove("clamp");
          btn.textContent = "收合";
        } else {
          desc.classList.add("clamp");
          btn.textContent = "查看更多";
        }
      });

      actions.appendChild(btn);

      descBlock = document.createElement("div");
      descBlock.appendChild(desc);
      descBlock.appendChild(actions);
    }

    const footer = document.createElement("div");
    footer.className = "card-footer";
    const t = document.createElement("div");
    t.textContent = p.last_price_updated_at ? `價格更新時間：${formatDateTime(p.last_price_updated_at)}` : "";
    footer.appendChild(t);

    body.appendChild(title);
    if (meta.children.length > 0) body.appendChild(meta);
    body.appendChild(price);
    if (descBlock) body.appendChild(descBlock);
    body.appendChild(footer);

    card.appendChild(imgWrap);
    card.appendChild(body);

    return card;
  }

  // ===== UI Helpers =====
  function setEmpty(isEmpty) {
    if (emptyState) emptyState.style.display = isEmpty ? "block" : "none";
  }

  function updatePager() {
    const text = `第 ${currentPage} / ${totalPages} 頁`;

    if (pageInfo) pageInfo.textContent = text;
    if (prevBtn) prevBtn.disabled = currentPage <= 1;
    if (nextBtn) nextBtn.disabled = currentPage >= totalPages;

    if (mPageIndicator) mPageIndicator.textContent = text;
    if (mPrevBtn) mPrevBtn.disabled = currentPage <= 1;
    if (mNextBtn) mNextBtn.disabled = currentPage >= totalPages;
  }

  // ===== Load Categories (✅改查 categories) =====
  async function loadCategories() {
    if (!categorySelect) return;

    const { data, error } = await supabaseClient
      .from("categories")
      .select("name,tone,is_active")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) {
      console.error("❌ 載入分類失敗（categories）", error);
      return;
    }

    const rows = (data || [])
      .map((r) => ({ name: normalizeCategoryName(r.name), tone: r.tone }))
      .filter((r) => !!r.name);

    // 建 tone map（跨瀏覽器一致：用 DB tone）
    categoryToneMap = new Map(rows.map((r) => [r.name, toneToClass(r.tone)]));

    // 填入 select options
    categorySelect.innerHTML = `<option value="">全部分類</option>`;
    rows.forEach((r) => {
      const opt = document.createElement("option");
      opt.value = r.name;
      opt.textContent = r.name;
      categorySelect.appendChild(opt);
    });

    // 重建 SelectX menu
    initSelectX();
  }

  // ===== Load Products (你原本的查詢邏輯保留) =====
  async function loadProducts() {
    const pageSize = Number(pageSizeSelect?.value || 10);
    const from = (currentPage - 1) * pageSize;
    const to = from + pageSize - 1;

    if (statusMessage) statusMessage.textContent = "載入中…";
    if (!productList) return;
    productList.innerHTML = "";
    setEmpty(false);

    const cat = (categorySelect?.value || "").trim();
    const kw = (searchInput?.value || "").trim();
    const sort = sortSelect?.value || "updated_desc";

    // ① count
    let qCount = supabaseClient
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true);

    if (cat) qCount = qCount.eq("category", cat);

    const safeKw = kw.replaceAll(",", " ").trim();
    if (safeKw) qCount = qCount.or(`name.ilike.%${safeKw}%,spec.ilike.%${safeKw}%,category.ilike.%${safeKw}%`);

    const { count: exactCount, error: countError } = await qCount;

    if (countError) {
      console.error("❌ 取得筆數失敗", countError);
      if (statusMessage) statusMessage.textContent = "資料讀取失敗，請稍後再試";
      return;
    }

    totalCount = exactCount ?? 0;
    totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    if (currentPage > totalPages) {
      currentPage = totalPages;
      return loadProducts();
    }

    // ② data
    let qData = supabaseClient
      .from("products")
      .select(`
        id,
        name,
        category,
        spec,
        unit,
        last_price,
        suggested_price,
        description,
        image_url,
        is_active,
        last_price_updated_at
      `)
      .eq("is_active", true);

    if (cat) qData = qData.eq("category", cat);
    if (safeKw) qData = qData.or(`name.ilike.%${safeKw}%,spec.ilike.%${safeKw}%,category.ilike.%${safeKw}%`);

    if (sort === "updated_asc") {
      qData = qData.order("last_price_updated_at", { ascending: true, nullsFirst: false });
    } else if (sort === "name_asc") {
      qData = qData.order("name", { ascending: true });
    } else if (sort === "name_desc") {
      qData = qData.order("name", { ascending: false });
    } else {
      qData = qData.order("last_price_updated_at", { ascending: false, nullsFirst: false });
    }

    qData = qData.range(from, to);

    const { data, error } = await qData;

    if (error) {
      console.error("❌ 載入商品失敗", error);
      if (statusMessage) statusMessage.textContent = "資料讀取失敗，請稍後再試";
      return;
    }

    updatePager();

    if (!data || data.length === 0) {
      if (statusMessage) statusMessage.textContent = "找不到符合條件的商品";
      setEmpty(true);
      return;
    }

    if (statusMessage) statusMessage.textContent = `共 ${totalCount} 筆商品`;
    data.forEach((p) => productList.appendChild(createProductCard(p)));
  }

  // ===== Events =====
  if (allBtn) {
    allBtn.addEventListener("click", () => {
      if (searchInput) searchInput.value = "";
      if (categorySelect) categorySelect.value = "";
      currentPage = 1;

      initSelectX();
      loadProducts();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      currentPage = 1;
      loadProducts();
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      if (searchInput) searchInput.value = "";
      if (categorySelect) categorySelect.value = "";
      currentPage = 1;
      loadProducts();
    });
  }

  if (emptyResetBtn) {
    emptyResetBtn.addEventListener("click", () => {
      if (searchInput) searchInput.value = "";
      if (categorySelect) categorySelect.value = "";
      currentPage = 1;
      loadProducts();
    });
  }

  if (categorySelect) categorySelect.addEventListener("change", () => { currentPage = 1; loadProducts(); });
  if (sortSelect) sortSelect.addEventListener("change", () => { currentPage = 1; loadProducts(); });
  if (pageSizeSelect) pageSizeSelect.addEventListener("change", () => { currentPage = 1; loadProducts(); });

  if (prevBtn) prevBtn.addEventListener("click", () => { if (currentPage > 1) { currentPage--; loadProducts(); } });
  if (nextBtn) nextBtn.addEventListener("click", () => { if (currentPage < totalPages) { currentPage++; loadProducts(); } });

  if (mPrevBtn) mPrevBtn.addEventListener("click", () => { if (currentPage > 1) { currentPage--; loadProducts(); } });
  if (mNextBtn) mNextBtn.addEventListener("click", () => { if (currentPage < totalPages) { currentPage++; loadProducts(); } });

  if (mTopBtn) mTopBtn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  if (topBtn) topBtn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

  // 滑動隱藏 mobilePager
  let lastY = window.scrollY;
  let ticking = false;

  function handleScroll() {
    const y = window.scrollY;
    const goingDown = y > lastY;

    if (mobilePager) {
      if (goingDown && y > 120) mobilePager.classList.add("is-hidden");
      else mobilePager.classList.remove("is-hidden");
    }

    lastY = y;
    ticking = false;
  }

  window.addEventListener("scroll", () => {
    if (window.matchMedia("(max-width: 640px)").matches) {
      if (!ticking) {
        window.requestAnimationFrame(handleScroll);
        ticking = true;
      }
    }
  }, { passive: true });

  // ===== Init（✅只留一個） =====
  document.addEventListener("DOMContentLoaded", async () => {
    // 先初始化 SelectX：確保下拉立刻可點
    initSelectX();

    try {
      await loadCategories();
    } catch (e) {
      console.error("loadCategories failed:", e);
    }

    try {
      await loadProducts();
    } catch (e) {
      console.error("loadProducts failed:", e);
      if (statusMessage) statusMessage.textContent = "商品載入失敗，請看 Console 錯誤訊息";
    }
  });
})();
