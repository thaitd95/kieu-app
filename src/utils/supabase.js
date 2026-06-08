import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Thiếu VITE_SUPABASE_URL hoặc VITE_SUPABASE_PUBLISHABLE_KEY trong file .env.",
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);

export function getAuthDisplayName(user) {
  return (
    user?.user_metadata?.full_name?.trim() ||
    user?.user_metadata?.name?.trim() ||
    user?.email?.split("@")[0] ||
    "Người dùng"
  );
}

export async function signInWithPassword(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) throw error;
  return data;
}

export async function signUpWithPassword({ email, fullName, password }) {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: {
        full_name: fullName.trim(),
      },
      emailRedirectTo: window.location.origin,
    },
  });

  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function ensureUserWorkspace(user) {
  const { data: existingWorkspace, error: selectError } = await supabase
    .from("workspaces")
    .select("id, name, data_initialized")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (selectError) throw selectError;
  if (existingWorkspace) return existingWorkspace;

  const { data: workspace, error: insertError } = await supabase
    .from("workspaces")
    .insert({
      name: "KieuAssistant",
      owner_user_id: user.id,
    })
    .select("id, name, data_initialized")
    .single();

  if (insertError) throw insertError;
  return workspace;
}
