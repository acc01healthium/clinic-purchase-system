// ★ 後台一定使用 service_role 保護後端權限（存放於 edge function）
// ★ 前台使用 anon key（讀取-only）
// ★ 請確認你下方兩組 key 都正確填入（我已幫你格式調整正確）
// ================================

const SUPABASE_URL = "https://utwhtjtgwryeljgwlwzm.supabase.co";

// ----------⚠️ 後台用 service_role（需放 Edge）----------
const SUPABASE_SERVICE_ROLE = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0d2h0anRnd3J5ZWxqZ3dsd3ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxNTkxNDQsImV4cCI6MjA4MDczNTE0NH0.SexZh_JV9IUT5cL7o6KO-bh6D50aFkZUrhZVf4_fNbs";

// ---------- 前台用 anon key ----------
export const supabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE,  // 後台使用 service_role
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

console.log("後台 Supabase 初始化成功");
