import { getSupabase } from "@/lib/supabase-client";

export type Category = {
  id: string;
  name: string;
  slug: string;
  parent_id?: string | null;
  icon?: string | null;
  sort?: number;
};

function client() {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase not configured");
  return supabase;
}

export const categoryService = {
  async getAll(): Promise<Category[]> {
    const { data, error } = await client()
      .from("categories")
      .select("*")
      .order("sort_order")
      .order("name");
    if (error) throw error;
    return (data ?? []) as Category[];
  },
  async getById(id: string): Promise<Category | null> {
    const { data, error } = await client()
      .from("categories")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data as Category | null;
  },
  async getBySlug(slug: string): Promise<Category | null> {
    const { data, error } = await client()
      .from("categories")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw error;
    return data as Category | null;
  },
  async create(cat: Omit<Category, "id">): Promise<Category> {
    const { data, error } = await client().from("categories").insert(cat).select().single();
    if (error) throw error;
    return data as Category;
  },
  async update(id: string, updates: Partial<Omit<Category, "id">>): Promise<Category> {
    const { data, error } = await client()
      .from("categories")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as Category;
  },
  async delete(id: string): Promise<void> {
    const { error } = await client().from("categories").delete().eq("id", id);
    if (error) throw error;
  },
};
