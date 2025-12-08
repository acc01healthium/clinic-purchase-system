// ---- Supabase config ----
const SUPABASE_URL = "https://utwhtjtgwryeljgwlwzm.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0d2h0anRnd3J5ZWxqZ3dsd3ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxNTkxNDQsImV4cCI6MjA4MDczNTE0NH0.SexZh_JV9IUT5cL7o6KO-bh6D50aFkZUrhZVf4_fNbs";

// ---- 正確初始化（使用 window.supabase）----
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 全域輸出（可給其他檔案使用）
window.supabaseClient = supabase;

