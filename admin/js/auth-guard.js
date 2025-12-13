(async () => {
  const BASE = "/clinic-purchase-system/admin";

  // login 頁直接放行
  if (location.pathname.endsWith("/login.html")) return;

  const supabase = window.supabaseClient;
  if (!supabase) return;

  const { data } = await supabase.auth.getSession();

  if (!data || !data.session) {
    location.replace(`${BASE}/login.html`);
  }
})();
