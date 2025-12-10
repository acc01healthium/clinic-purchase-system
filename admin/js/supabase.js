// /admin/js/supabase.js

// ==============================
// ⚠️ Supabase 前端用 anon public key
// ==============================
const SUPABASE_URL = "https://utwhtjtgwryeljgwlwzm.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0d2h0anRnd3J5ZWxqZ3dsd3ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxNTkxNDQsImV4cCI6MjA4MDczNTE0NH0.SexZh_JV9IUT5cL7o6KO-bh6D50aFkZUrhZVf4_fNbs";

// ==============================
// 建立全域 Supabase Client
// ==============================
const supabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false,  // 後台避免 Session 上鎖
      autoRefreshToken: true
    }
  }
);

// 全域可用
window.supabaseClient = supabase;

console.log("%cSupabase 初始化成功", "color: #00b894; font-weight:bold;");
