document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("logoutBtn");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    await window.supabaseClient.auth.signOut();

    location.replace("/clinic-purchase-system/admin/login.html");
  });
});
