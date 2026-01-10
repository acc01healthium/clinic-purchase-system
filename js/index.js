// /js/index.js
// 前台：分類（categories）+ 排序 + 分頁（伺服器分頁）+ description 展開/收合
// ✅ 變數 / DOM id 完全對應你目前 index.html

(() => {
  "use strict";

  console.log("前台商品查詢初始化（穩定版）");

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

   // ✅ Mobile pager elements
const mobilePager = document.getElementById("mobilePager");
const mPrevBtn = document.getElementById("mPrevBtn");
const mNextBtn = document.getElementById("mNextBtn");
const mPageIndicator = document.getElementById("mPageIndicator");
const mTopBtn = document.getElementById("mTopBtn");

  // ===== State =====
  let currentPage = 1;
  let totalPages = 1;
  let totalCount = 0;

  // ===== SelectX (custom select) =====
  function initSelectX() {
    const wrappers = document.querySelectorAll(".selectx[data-select]");

    wrappers.forEach((wrap) => {
      const selectId = wrap.getAttribute("data-select");
      const sel = document.getElementById(selectId);
      const btn = wrap.querySelector(".selectx-btn");
      const textEl = wrap.querySelector(".selectx-text");
      const menu = wrap.querySelector(".selectx-menu");

      if (!sel || !btn || !textEl || !menu) return;

      // ✅ 防止重複綁事件（允許多次 initSelectX）
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

            menu.querySelectorAll(".selectx-item").forEach(x => x.classList.remove("is-active"));
            item.classList.add("is-active");

            wrap.classList.remove("is-open");
            btn.setAttribute("aria-expanded", "false");

            sel.dispatchEvent(new Event("change", { bubbles: true }));
          });

          menu.appendChild(item);
        });

        // 同步目前顯示文字
        const cur = options.find(o => o.value === sel.value) || options[0];
        if (cur) textEl.textContent = cur.textContent;
      };

      // ✅ 每次都重建（確保動態 options 能更新到）
      rebuild();
      wrap.__rebuildSelectX = rebuild;

      // 如果已初始化過，就不要再綁一次事件
      if (alreadyInited) return;

      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const open = wrap.classList.toggle("is-open");
        btn.setAttribute("aria-expanded", open ? "true" : "false");
      });

      sel.addEventListener("change", () => {
        const cur = Array.from(sel.options).find(o => o.value === sel.value);
        if (cur) textEl.textContent = cur.textContent;

        // active 同步
        const items = menu.querySelectorAll(".selectx-item");
        items.forEach((x, i) => {
          x.classList.toggle("is-active", sel.options[i]?.value === sel.value);
        });
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

  // 千位符號（台灣/國際通用）
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

  // ===== Category Tone (auto color) =====
const CATEGORY_TONES = [
  "tone-0","tone-1","tone-2","tone-3","tone-4","tone-5",
  "tone-6","tone-7","tone-8","tone-9","tone-10","tone-11"
];

// 穩定 hash：同一個分類字串永遠會對到同一個 tone
function hashString(str) {
  const s = String(str || "");
  let h = 2166136261; // FNV-1a seed
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function applyCategoryTone(el, categoryName) {
  if (!el || !categoryName) return;
  const idx = hashString(categoryName.trim()) % CATEGORY_TONES.length;
  el.classList.add(CATEGORY_TONES[idx]);
}
  // ===== SelectX (custom dropdown) =====
  function initSelectX() {
    const wrappers = document.querySelectorAll(".selectx");

    wrappers.forEach((wrap) => {
      const selectId = wrap.getAttribute("data-select");
      if (!selectId) return;

      const select = wrap.querySelector("select");
      const btn = wrap.querySelector(".selectx-btn");
      const textEl = wrap.querySelector(".selectx-text");
      const menu = wrap.querySelector(".selectx-menu");

      if (!select || !btn || !textEl || !menu) return;
      if (select.id !== selectId) {
        // 防呆：data-select 要對應到裡面 select 的 id
        // 不符合就不初始化，避免綁錯
        return;
      }

      // 建立 menu
      const buildMenu = () => {
        menu.innerHTML = "";
        const opts = Array.from(select.options);

        opts.forEach((opt, idx) => {
          const item = document.createElement("div");
          item.className = "selectx-item";
          item.setAttribute("role", "option");
          item.dataset.value = opt.value;
          item.textContent = opt.textContent;

          if (opt.disabled) {
            item.classList.add("is-disabled");
            item.setAttribute("aria-disabled", "true");
          }

          // 目前選到的
          if (opt.selected) {
            item.classList.add("is-active");
            item.setAttribute("aria-selected", "true");
          }

          item.addEventListener("click", () => {
            if (opt.disabled) return;

            // 更新原生 select
            select.selectedIndex = idx;

            // 更新按鈕文字
            textEl.textContent = opt.textContent;

            // 標記 active
            menu.querySelectorAll(".selectx-item").forEach((el) => {
              el.classList.remove("is-active");
              el.removeAttribute("aria-selected");
            });
            item.classList.add("is-active");
            item.setAttribute("aria-selected", "true");

            // 關閉
            closeMenu(wrap);

            // 觸發 change（你的 loadProducts() 會照常跑）
            select.dispatchEvent(new Event("change", { bubbles: true }));
          });

          menu.appendChild(item);
        });

        // 初始化按鈕文字
        const selectedOpt = select.options[select.selectedIndex];
        textEl.textContent = selectedOpt ? selectedOpt.textContent : "";
      };

      const openMenu = () => {
        wrap.classList.add("is-open");
        btn.setAttribute("aria-expanded", "true");
        menu.focus({ preventScroll: true });
      };

      const closeMenu = (w) => {
        w.classList.remove("is-open");
        const b = w.querySelector(".selectx-btn");
        if (b) b.setAttribute("aria-expanded", "false");
      };

      const toggleMenu = () => {
        const isOpen = wrap.classList.contains("is-open");
        if (isOpen) closeMenu(wrap);
        else {
          // 關掉其他開著的
          document.querySelectorAll(".selectx.is-open").forEach((w) => closeMenu(w));
          openMenu();
        }
      };

      // 初次渲染
      buildMenu();

      // click 打開
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        toggleMenu();
      });

      // select 若被程式改變，也同步更新（例如你以後 reset/filter）
      select.addEventListener("change", () => {
        const selectedOpt = select.options[select.selectedIndex];
        if (selectedOpt) textEl.textContent = selectedOpt.textContent;

        // 同步 menu active
        const val = select.value;
        menu.querySelectorAll(".selectx-item").forEach((el) => {
          el.classList.toggle("is-active", el.dataset.value === val);
          if (el.dataset.value === val) el.setAttribute("aria-selected", "true");
          else el.removeAttribute("aria-selected");
        });
      });

      // 點外面關閉
      document.addEventListener("click", (e) => {
        if (!wrap.contains(e.target)) closeMenu(wrap);
      });

      // Esc 關閉
      wrap.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeMenu(wrap);
      });
    });
  }

  // ===== Card =====
  function createProductCard(p) {
    const card = document.createElement("article");
    card.className = "card";

    // 圖片
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

    // 內容
    const body = document.createElement("div");
    body.className = "card-body";

    const title = document.createElement("h3");
    title.className = "card-title";
    title.textContent = p.name || "";

const meta = document.createElement("div");
meta.className = "card-meta";

// ✅ 分類：只用 tag，不要 meta-item 外框（避免雙層膠囊）
if (p.category) {
  const tag = document.createElement("span");
  tag.className = "tag";
  tag.textContent = p.category;

  applyCategoryTone(tag, p.category); // ✅自動配色

  meta.appendChild(tag);
}

// ✅ 單位：用 meta-item（但不要 icon）
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

// ✅ 規格：用 meta-item（但不要 icon）
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

   // 價格
const price = document.createElement("div");
price.className = "price";

price.innerHTML =
  '<div class="price-line">' +
    '<span class="price-label">參考進價：</span>' +
    '<span class="price-value">NT$ ' + escapeHtml(formatPrice(p.last_price)) + '</span>' +
  '</div>' +
  '<div class="price-line">' +
    '<span class="price-label">建議售價：</span>' +
    '<span class="price-value">NT$ ' + escapeHtml(formatPrice(p.suggested_price)) + '</span>' +
  '</div>';

    // description + 查看更多/收合
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

    // footer
    const footer = document.createElement("div");
    footer.className = "card-footer";

    const t = document.createElement("div");
    t.textContent = p.last_price_updated_at
      ? `價格更新時間：${formatDateTime(p.last_price_updated_at)}`
      : "";

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

  // ✅ mobile sync
  if (mPageIndicator) mPageIndicator.textContent = text;
  if (mPrevBtn) mPrevBtn.disabled = currentPage <= 1;
  if (mNextBtn) mNextBtn.disabled = currentPage >= totalPages;
}

  // ===== Load Categories =====
 async function loadCategories() {
  const { data, error } = await supabaseClient
   .from("products")
   .select("category")
   .eq("is_active", true)
   .not("category", "is", null)
   .neq("category", "")

  if (error) {
    console.error("❌ 載入分類失敗", error);
    return;
  }
  if (!categorySelect) return;

  const uniq = Array.from(
    new Set((data || []).map(x => (x.category || "").trim()).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, "zh-Hant"));

  categorySelect.innerHTML = `<option value="">全部分類</option>`;
    uniq.forEach((name) => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    categorySelect.appendChild(opt);
  });

     initSelectX(); // ✅分類 options 更新後，重建 SelectX menu（最穩）

  // ✅ 分類選項載入後，重建漂亮下拉選單
  rebuildSelectXById("categorySelect");
}

// ===== Load Products (server paging) =====
async function loadProducts() {
  const pageSize = Number(pageSizeSelect?.value || 10);
  const from = (currentPage - 1) * pageSize;
  const to = from + pageSize - 1;

  if (statusMessage) statusMessage.textContent = "載入中…";
  if (!productList) return;
  productList.innerHTML = "";
  setEmpty(false);

  // ===== 共同條件（先做一份 base）=====
  const cat = (categorySelect?.value || "").trim();
  const kw = (searchInput?.value || "").trim();
  const sort = sortSelect?.value || "updated_desc";

  // ① 先拿 count（最穩定）
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

  // 如果目前頁數超出（例如篩選後變少），拉回最後一頁再載一次
  if (currentPage > totalPages) {
    currentPage = totalPages;
    return loadProducts();
  }

  // ② 再抓當頁資料
  let qData = supabaseClient
    .from("products")
    .select(
      `
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
      `
    )
    .eq("is_active", true);

  if (cat) qData = qData.eq("category", cat);
  if (safeKw) qData = qData.or(`name.ilike.%${safeKw}%,spec.ilike.%${safeKw}%,category.ilike.%${safeKw}%`);

  // 排序
  if (sort === "updated_asc") {
    qData = qData.order("last_price_updated_at", { ascending: true, nullsFirst: false });
  } else if (sort === "name_asc") {
    qData = qData.order("name", { ascending: true });
  } else if (sort === "name_desc") {
    qData = qData.order("name", { ascending: false });
  } else {
    qData = qData.order("last_price_updated_at", { ascending: false, nullsFirst: false });
  }

  // 分頁
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

  if (categorySelect) {
    categorySelect.addEventListener("change", () => {
      currentPage = 1;
      loadProducts();
    });
  }

  if (sortSelect) {
    sortSelect.addEventListener("change", () => {
      currentPage = 1;
      loadProducts();
    });
  }

  if (pageSizeSelect) {
    pageSizeSelect.addEventListener("change", () => {
      currentPage = 1;
      loadProducts();
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      if (currentPage > 1) {
        currentPage--;
        loadProducts();
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      if (currentPage < totalPages) {
        currentPage++;
        loadProducts();
      }
    });
  }

// ✅ Mobile pager events
if (mPrevBtn) {
  mPrevBtn.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      loadProducts();
    }
  });
}

if (mNextBtn) {
  mNextBtn.addEventListener("click", () => {
    if (currentPage < totalPages) {
      currentPage++;
      loadProducts();
    }
  });
}

if (mTopBtn) {
  mTopBtn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

  if (topBtn) {
  topBtn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

// ✅ 滑動自動隱藏/顯示（像原生 App）
let lastY = window.scrollY;
let ticking = false;

function handleScroll() {
  const y = window.scrollY;
  const goingDown = y > lastY;

  if (mobilePager) {
    // 往下滑且離頂部有一段距離才隱藏；往上滑就顯示
    if (goingDown && y > 120) mobilePager.classList.add("is-hidden");
    else mobilePager.classList.remove("is-hidden");
  }

  lastY = y;
  ticking = false;
}

window.addEventListener("scroll", () => {
  // ✅只在手機才做「滑動自動隱藏」
  if (window.matchMedia("(max-width: 640px)").matches) {
    if (!ticking) {
      window.requestAnimationFrame(handleScroll);
      ticking = true;
    }
  }
}, { passive: true });

  // ===== Init =====
     document.addEventListener("DOMContentLoaded", async () => {
    initSelectX();          // ✅先建立三個下拉的 menu（排序/每頁先有固定選項）
    await loadCategories(); // ✅分類 options 載入後會 rebuild categorySelect
    await loadProducts();
  });
})();

