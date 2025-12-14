// === Supabase 基本設定 ===
const SUPABASE_URL = "https://utwhtjtgwryeljgwlwzm.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0d2h0anRnd3J5ZWxqZ3dsd3ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxNTkxNDQsImV4cCI6MjA4MDczNTE0NH0.SexZh_JV9IUT5cL7o6KO-bh6D50aFkZUrhZVf4_fNbs";
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0d2h0anRnd3J5ZWxqZ3dsd3ptIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTE1OTE0NCwiZXhwIjoyMDgwNzM1MTQ0fQ.mV9Zv0rSJT8c9xr7o0ywoKZLCohNAuBvUJzz8mGrrFE";

// 前台 / 一般操作
window.supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

// 🔐 後台專用（繞過 RLS，上傳圖片一定成功）
window.supabaseAdmin = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
);

// 給 add.js 用來組 public url
window.SUPABASE_URL = SUPABASE_URL;

console.log("Supabase clients ready");
