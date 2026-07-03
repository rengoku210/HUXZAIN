import { getSupabase } from "@/lib/supabase-client";
import { useState, useEffect } from "react";

export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'email'
  | 'password'
  | 'url'
  | 'select'
  | 'multiselect'
  | 'checkbox'
  | 'radio'
  | 'tags'
  | 'file'
  | 'image'
  | 'date'
  | 'datetime'
  | 'boolean';

export interface FieldValidation {
  min?: number;
  max?: number;
  min_length?: number;
  max_length?: number;
  regex?: string;
  allowed_values?: string[];
  custom_error?: string;
  pricing_hint?: string;
  depends_on?: { field: string; value: any };
  group?: string;
}

export interface CategoryField {
  id: string;
  category_slug: string;
  field_key: string;
  label: string;
  field_type: FieldType;
  is_required: boolean;
  validation_rules: FieldValidation;
  placeholder: string | null;
  help_text: string | null;
  sort_order: number;
}

export interface CategoryEngine {
  category_slug: string;
  delivery_type: 'instant' | 'manual' | 'hybrid';
  delivery_engine: 'Instant' | 'Credentials' | 'Manual' | 'Session' | 'Booking' | 'Hybrid' | 'Custom';
}

// Caching layer to avoid duplicate database requests
let fieldsCache: Record<string, CategoryField[]> = {};
let engineCache: Record<string, CategoryEngine | null> = {};

export async function getCategoryFields(categorySlug: string): Promise<CategoryField[]> {
  const slug = categorySlug.toLowerCase();
  if (fieldsCache[slug]) return fieldsCache[slug];

  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("category_field_config")
    .select("*")
    .eq("category_slug", slug)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[CategoryEngine] Error loading field config:", error);
    return [];
  }

  fieldsCache[slug] = data || [];
  return fieldsCache[slug];
}

export async function getCategoryEngine(categorySlug: string): Promise<CategoryEngine | null> {
  const slug = categorySlug.toLowerCase();
  if (slug in engineCache) return engineCache[slug];

  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("category_engine_config")
    .select("*")
    .eq("category_slug", slug)
    .maybeSingle();

  if (error) {
    console.error("[CategoryEngine] Error loading engine config:", error);
    return null;
  }

  engineCache[slug] = data || null;
  return engineCache[slug];
}

export function invalidateCategoryCache() {
  fieldsCache = {};
  engineCache = {};
}

export function useCategoryConfig(categorySlug: string | null | undefined) {
  const [fields, setFields] = useState<CategoryField[]>([]);
  const [engine, setEngine] = useState<CategoryEngine | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!categorySlug) {
      setFields([]);
      setEngine(null);
      return;
    }

    let active = true;
    setLoading(true);

    Promise.all([
      getCategoryFields(categorySlug),
      getCategoryEngine(categorySlug)
    ]).then(([f, e]) => {
      if (!active) return;
      setFields(f);
      setEngine(e);
      setLoading(false);
    }).catch(err => {
      console.error("[useCategoryConfig] Load error:", err);
      if (active) setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [categorySlug]);

  return { fields, engine, loading };
}

export function validateDynamicAttributes(
  fields: CategoryField[],
  attributes: Record<string, any>
): string | null {
  for (const f of fields) {
    const value = attributes[f.field_key];
    const rules = f.validation_rules || {};

    // 1. Required Check
    if (f.is_required) {
      if (
        value === undefined ||
        value === null ||
        (typeof value === "string" && !value.trim()) ||
        (Array.isArray(value) && value.length === 0)
      ) {
        return rules.custom_error || `${f.label} is required.`;
      }
    }

    // Skip validation for empty/optional fields if they have no input value
    if (value === undefined || value === null || value === "") {
      continue;
    }

    // 2. Text / String Validation
    if (typeof value === "string") {
      const valStr = value.trim();

      // Minimum Length
      if (rules.min_length !== undefined && valStr.length < rules.min_length) {
        return rules.custom_error || `${f.label} must be at least ${rules.min_length} characters.`;
      }

      // Maximum Length
      if (rules.max_length !== undefined && valStr.length > rules.max_length) {
        return rules.custom_error || `${f.label} must be at most ${rules.max_length} characters.`;
      }

      // Regex validation
      if (rules.regex) {
        try {
          const re = new RegExp(rules.regex);
          if (!re.test(valStr)) {
            return rules.custom_error || `${f.label} is formatted incorrectly.`;
          }
        } catch (e) {
          console.warn("[CategoryEngine] Invalid regex validation expression:", rules.regex);
        }
      }

      // Dropdown Allowed values check
      if (f.field_type === "select" && rules.allowed_values) {
        if (!rules.allowed_values.includes(valStr)) {
          return rules.custom_error || `${f.label} must be one of the pre-configured choices.`;
        }
      }
    }

    // 3. Numeric range validations
    if (f.field_type === "number") {
      const num = Number(value);
      if (isNaN(num)) {
        return `${f.label} must be a valid number.`;
      }

      if (rules.min !== undefined && num < rules.min) {
        return rules.custom_error || `${f.label} must be at least ${rules.min}.`;
      }

      if (rules.max !== undefined && num > rules.max) {
        return rules.custom_error || `${f.label} must be at most ${rules.max}.`;
      }
    }
  }

  return null;
}
