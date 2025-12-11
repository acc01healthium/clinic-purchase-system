// 後台使用 service_role key（僅後台可用，不可放前台）
const SUPABASE_URL = "https://utwhtjtgwryeljgwlwzm.supabase.co";

// ⚠️ service_role 只有後台使用，請勿公開
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0d2h0anRnd3J5ZWxqZ3dsd3ptIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTE1OTE0NCwiZXhwIjoyMDgwNzM1MTQ0fQ.mV9Zv0rSJT8c9xr7o0ywoKZLCohNAuBvUJzz8mGrrFE";

// 建立後台 Supabase client（擁有完整權限）
window.supabaseAdmin = supabase.createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
