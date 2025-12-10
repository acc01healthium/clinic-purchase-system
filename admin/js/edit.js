const id = new URLSearchParams(location.search).get("id");
const form = document.getElementById("editForm");

async function loadData() {
  const { data, error } = await supabaseClient
    .from("products")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    alert("讀取資料錯誤");
    return;
  }

  form.name.value = data.name;
  form.category.value = data.category;
  form.spec.value = data.spec;
  form.unit.value = data.unit;
  form.last_price.value = data.last_price;
  form.suggested_price.value = data.suggested_price ?? "";
  form.description.value = data.description ?? "";
  form.is_active.value = data.is_active ? "1" : "0";
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(form);

  const payload = {
    name: fd.get("name"),
    category: fd.get("category"),
    spec: fd.get("spec"),
    unit: fd.get("unit"),
    last_price: Number(fd.get("last_price")),
    suggested_price: Number(fd.get("suggested_price")) || null,
    description: fd.get("description"),
    is_active: fd.get("is_active") === "1",
  };

  const { error } = await supabaseClient
    .from("products")
    .update(payload)
    .eq("id", id);

  if (error) {
    alert("更新失敗：" + error.message);
    return;
  }

  alert("更新成功！");
  location.href = "index.html";
});

loadData();
