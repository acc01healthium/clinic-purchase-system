(async () => {
  const { data, error } = await window.supabaseClient.auth.getSession();

  if (error || !data.session) {
    location.replace("/clinic-purchase-system/admin/login.html");
    return;
  }

  // 顯示畫面（解除 hidden）
  document.body.classList.remove("hidden");
})();
