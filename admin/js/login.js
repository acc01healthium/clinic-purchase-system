const supabase = window.supabaseClient;

document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.querySelector("#email").value.trim();
    const password = document.querySelector("#password").value;

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert("登入失敗：" + error.message);
      return;
    }

    // ✅ 成功 → 只在這裡導向一次
    location.replace("index.html");
  });
});
