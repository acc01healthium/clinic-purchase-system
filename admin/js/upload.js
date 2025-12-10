document.getElementById("csvForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const file = document.getElementById("csvFile").files[0];
  if (!file) return alert("請選擇 CSV");

  const text = await file.text();
  const rows = text.split("\n").map((r) => r.trim());
  const headers = rows.shift().split(",");

  let insertCount = 0;
  let updateCount = 0;

  for (let row of rows) {
    if (!row) continue;

    const cols = row.split(",");
    const item = {};

    headers.forEach((h, i) => (item[h] = cols[i] ?? null));

    // 數字轉型
    item.last_price = Number(item.last_price);
    item.suggested_price = Number(item.suggested_price) || null;

    // 啟用狀態
    item.is_active =
      ["1", "true", "啟用"].includes(String(item.is_active).trim());

    // ▼ 判斷是否存在：name + spec
    const { data: exists } = await supabaseClient
      .from("products")
      .select("id")
      .eq("name", item.name)
      .eq("spec", item.spec)
      .maybeSingle();

    if (exists) {
      await supabaseClient.from("products").update(item).eq("id", exists.id);
      updateCount++;
    } else {
      await supabaseClient.from("products").insert([item]);
      insertCount++;
    }
  }

  alert(`匯入完成\n新增：${insertCount} 筆\n更新：${updateCount} 筆`);
  location.href = "index.html";
});
