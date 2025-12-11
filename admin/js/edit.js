// ---------------------------
// 刪除商品（完全正確可運作版）
// ---------------------------
document.getElementById("deleteBtn").addEventListener("click", async () => {
  if (!confirm("確定要刪除此商品嗎？此動作無法復原！")) return;

  if (!productId) {
    alert("商品 ID 無效");
    return;
  }

  // 呼叫 Supabase 刪除
  const { error } = await supabaseClient
    .from("products")
    .delete()
    .eq("id", productId);

  if (error) {
    console.error("刪除商品錯誤：", error);
    alert("刪除失敗，請稍後再試");
    return;
  }

  alert("商品已成功刪除！");
  window.location.href = "index.html";
});
