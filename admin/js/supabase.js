// /admin/js/supabase.js （後台專用）
// 使用同一個 B 專案

const SUPABASE_URL = "https://utwhtjtgwryeljgwlwzm.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0d2h0anRnd3J5ZWxqZ3dsd3ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxNTkxNDQsImV4cCI6MjA4MDczNTE0NH0.SexZh_JV9IUT5cL7o6KO-bh6D50aFkZUrhZVf4_fNbs";

if (!window.supabase) {
  console.error("❌ Supabase SDK 尚未載入");
} else {
  window.supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY,
    {
      auth: {
        persistSession: true,        // ✅ 必須
        autoRefreshToken: true,      // ✅ 必須
        detectSessionInUrl: true,    // ✅ 建議
      },
    }
  );

  console.log("✅ Supabase 後台 client 初始化完成（session 可持久）");
}
