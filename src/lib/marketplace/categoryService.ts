import { getSupabase } from '@/lib/supabase-client';
import type { PostgrestError } from '@supabase/supabase-js';

export type Category = {
  id: string;
  name: string;
  slug: string;
  parent_id?: string | null;
};

export const categoryService = {
  async getAll(): Promise<Category[]> {
    const supabase = getSupabase();
    const { data, error } = await supabase.from('categories').select('*');
    if (error) throw error;
    return data as Category[];
  },
  async getById(id: string): Promise<Category | null> {
    const supabase = getSupabase();
    const { data, error } = await supabase.from('categories').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data as Category | null;
  },
  async create(cat: Omit<Category, 'id'>): Promise<Category> {
    const supabase = getSupabase();
    const { data, error } = await supabase.from('categories').insert(cat).select().single();
    if (error) throw error;
    return data as Category;
  },
  async update(id: string, updates: Partial<Omit<Category, 'id'>>): Promise<Category> {
    const supabase = getSupabase();
    const { data, error } = await supabase.from('categories').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data as Category;
  },
  async delete(id: string): Promise<void> {
    const supabase = getSupabase();
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) throw error;
  },
};
