import { createClient } from "@supabase/supabase-js";
import { investigations as local, type Investigation } from "@/data/investigations";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;

/** Loads investigations from Supabase, falling back to the bundled dataset. */
export async function getInvestigations(): Promise<{ data: Investigation[]; source: "supabase" | "local" }> {
  if (!supabase) return { data: local, source: "local" };
  try {
    const { data, error } = await supabase.from("investigations").select("data").order("directness", { ascending: false });
    if (error || !data?.length) throw error ?? new Error("empty");
    return { data: data.map((r) => r.data as Investigation), source: "supabase" };
  } catch {
    return { data: local, source: "local" };
  }
}
