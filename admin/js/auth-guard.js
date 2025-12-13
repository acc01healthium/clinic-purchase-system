// auth-guard.js（最終封版）
(() => {
  const supabase = window.supabaseClient;
  if (!supabase) return;

  let checked = false;

  supabase.auth.onAuthStateChange((_event, session) => {
    if (checked) return;
    checked = true;

    if (!session) {
      location.replace("/clinic-purchase-system/admin/login.html");
    }
  });
})();
