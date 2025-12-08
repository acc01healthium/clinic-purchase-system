// js/supabase.js
// ===============================
// Supabase 初始化（全域只有這一份）
// ===============================

// ⚠️ 這裡請用「Project Settings -> API」裡的 Project URL / anon public key
const SUPABASE_URL = "https://utwhtjtgwryeljgwlwzm.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0d2h0anRnd3J5ZWxqZ3dsd3ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxNTkxNDQsImV4cCI6MjA4MDczNTE0NH0.SexZh_JV9IUT5cL7o6KO-bh6D50aFkZUrhZVf4_fNbs";

// 透過 CDN 載入的 supabase-js v2 會掛在 window.supabase
// 我們統一建立一個全域客戶端：window.supabaseClient
window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

console.log("Supabase client 已建立");
