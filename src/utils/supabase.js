import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabaseConfigError =
  !supabaseUrl || !supabaseKey
    ? "Thiếu VITE_SUPABASE_URL hoặc VITE_SUPABASE_PUBLISHABLE_KEY. Hãy khai báo hai biến này trong Vercel Project Settings > Environment Variables rồi redeploy."
    : "";

export const supabase = supabaseConfigError ? null : createClient(supabaseUrl, supabaseKey);

function getSupabaseClient() {
  if (!supabase) throw new Error(supabaseConfigError);
  return supabase;
}

export function getAuthDisplayName(user) {
  return (
    user?.user_metadata?.full_name?.trim() ||
    user?.user_metadata?.name?.trim() ||
    user?.email?.split("@")[0] ||
    "Người dùng"
  );
}

export async function signInWithPassword(email, password) {
  const { data, error } = await getSupabaseClient().auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await getSupabaseClient().auth.signOut();
  if (error) throw error;
}

export async function ensureAppUser(user) {
  const client = getSupabaseClient();
  const { error } = await client.rpc("ensure_app_user", {
    requested_display_name: getAuthDisplayName(user),
  });

  if (error) throw error;
}
