document.addEventListener("DOMContentLoaded", async () => {
  const supabase = window.supabaseClient;
  const body = document.body;

  if (!supabase) return;

  body.classList.add("hidden");

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    location.replace("/clinic-purchase-system/admin/login.html");
    return;
  }

  body.classList.remove("hidden");

  supabase.auth.onAuthStateChange((event, newSession) => {
    if (!newSession) {
      location.replace("/clinic-purchase-system/admin/login.html");
    }
  });
});
