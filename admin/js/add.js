// /admin/js/add.js
// 後台「新增商品」頁

console.log("後台新增商品初始化");

// 取得 Supabase client（由 admin/js/supabase.js 建立）
const supabaseClient = window.supabaseClient;

const form = document.getElementById("productForm");
const saveBtn = document.getElementById("saveBtn");
const statusEl = document.getElementById("statusMessage");
const fileInput = document.getElementById("imageFile");

// 登出按鈕
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    // 之後若有 auth，再加上 signOut()
    // await supabaseClient.auth.signOut();
    location.href = "login.html";
  });
}

if (!supabaseClient) {
  console.error("supabaseClient 不存在，請確認 admin/js/supabase.js 是否正確載入。");
}

/** 將字串價格轉成數字，空字串回傳 null */
function parsePrice(value) {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  const num = Number(trimmed);
  if (Number.isNaN(num)) return null;
  return num;
}

/** 產生一個簡單 SKU（name + spec + timestamp） */
function generateSku(name, spec) {
  const base =
    (name || "").toString().trim() + "-" + (spec || "").toString().trim();
  const clean = base.replace(/\s+/g, "").toUpperCase();
  const head = clean || "SKU";
  const tail = Date.now().toString().slice(-4);
  return head.slice(0, 6) + "-" + tail;
}

/** 上傳圖片到 Supabase Storage，回傳 public URL */
async function uploadImage(file, productId) {
  if (!file) return null;

  // TODO：若你的 bucket 名稱不是 "product-images"，請在這裡改掉
  const bucketName = "product-images";

  const ext = file.name.split(".").pop() || "jpg";
  const filePath = `products/${productId}-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabaseClient.storage
    .from(bucketName)
    .upload(filePath, file, {
      upsert: true,
      contentType: file.type || "image/jpeg",
    });

  if (uploadError) {
    console.error("圖片上傳失敗：", uploadError);
    throw uploadError;
  }

  const { data } = supabaseClient.storage
    .from(bucketName)
    .getPublicUrl(filePath);

  const publicUrl = data?.publicUrl || null;
  return publicUrl;
}

/** 顯示狀態訊息 */
function setStatus(msg, isError = false) {
  if (!statusEl) return;
  statusEl.textContent = msg || "";
  statusEl.style.color = isError ? "#b3261e" : "#0b7a34";
}

/** 切換儲存按鈕 disable 狀態 */
function setSaving(isSaving) {
  if (!saveBtn) return;
  saveBtn.disabled = isSaving;
  saveBtn.textContent = isSaving ? "儲存中，請稍候…" : "儲存新增";
}

// 表單送出
if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!supabaseClient) return;

    setStatus("");
    setSaving(true);

    try {
      const name = document.getElementById("nameInput").value.trim();
      const category = document.getElementById("categoryInput").value.trim();
      const spec = document.getElementById("specInput").value.trim();
      const unit = document.getElementById("unitInput").value.trim();
      const lastPrice = parsePrice(
        document.getElementById("lastPriceInput").value
      );
      const suggestedPrice = parsePrice(
        document.getElementById("suggestedPriceInput").value
      );
      const isActiveValue = document.getElementById("isActiveSelect").value;
      const isActive = isActiveValue === "1";
      const description = document
        .getElementById("descriptionInput")
        .value.trim();
      const imageFile = fileInput?.files?.[0] || null;

      if (!name) {
        setStatus("請輸入商品名稱。", true);
        setSaving(false);
        return;
      }
      if (lastPrice === null) {
        setStatus("請輸入正確的進價（數字）。", true);
        setSaving(false);
        return;
      }

      const nowIso = new Date().toISOString();
      const sku = generateSku(name, spec);

      // 先新增商品主檔（先不含 image_url）
      const { data: insertData, error: insertError } = await supabaseClient
        .from("products")
        .insert([
          {
            name,
            sku,
            category,
            description,
            currency: "TWD",
            unit,
            stock_qty: 0,
            last_price: lastPrice,
            suggested_price: suggestedPrice,
            last_price_updated_at: nowIso,
            is_active: isActive,
            created_at: nowIso,
            spec,
            image_url: null,
          },
        ])
        .select("id")
        .single();

      if (insertError) {
        console.error("新增商品失敗：", insertError);
        setStatus("新增商品失敗，請稍後再試。", true);
        setSaving(false);
        return;
      }

      const productId = insertData.id;

      // 如有圖片，接著上傳並更新 image_url
      if (imageFile && productId) {
        try {
          const publicUrl = await uploadImage(imageFile, productId);
          if (publicUrl) {
            const { error: updateError } = await supabaseClient
              .from("products")
              .update({ image_url: publicUrl })
              .eq("id", productId);

            if (updateError) {
              console.error("更新 image_url 失敗：", updateError);
              // 不阻擋整體流程，只在 console 提示
            }
          }
        } catch (imgErr) {
          console.error("圖片流程發生錯誤：", imgErr);
          // 同樣不阻擋整體流程
        }
      }

      setStatus("商品已成功新增！");
      form.reset();
      // 回到預設啟用
      const isActiveSelect = document.getElementById("isActiveSelect");
      if (isActiveSelect) isActiveSelect.value = "1";
    } catch (err) {
      console.error("新增商品流程發生錯誤：", err);
      setStatus("系統發生錯誤，請稍後再試。", true);
    } finally {
      setSaving(false);
    }
  });
}
