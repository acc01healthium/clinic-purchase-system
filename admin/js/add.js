const form = document.getElementById("addForm");

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

  const { data, error } = await supabaseClient
    .from("products")
    .insert([payload])
    .select();

  if (error) {
    alert("新增失敗：" + error.message);
    return;
  }

  alert("新增成功！");
  location.href = "index.html";
});
