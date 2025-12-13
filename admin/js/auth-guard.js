// auth-guard.js
(async () => {
  const supabase = window.supabaseClient;

  if (!supabase) {
    console.error("Supabase client not found");
    return;
  }

  // ⭐ 等待 session 真正恢復
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    location.replace("/clinic-purchase-system/admin/login.html");
  }
})();
