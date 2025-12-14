// /js/supabase.js （前台專用）
// 使用 B 專案（你提供的那組）

const SUPABASE_URL = "https://utwhtjtgwryeljgwlwzm.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0d2h0anRnd3J5ZWxqZ3dsd3ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxNTkxNDQsImV4cCI6MjA4MDczNTE0NH0.SexZh_JV9IUT5cL7o6KO-bh6D50aFkZUrhZVf4_fNbs";

// 讓全站可以用 window.supabaseClient
if (!window.supabase) {
  console.error("Supabase SDK 尚未載入，請確認 <script src='...supabase-js@2'> 順序。");
} else {
  window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false },
  });
  console.log("✅ 前台 Supabase 初始化成功");
}

// 後台專用（service role）
window.supabaseAdmin = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
);
