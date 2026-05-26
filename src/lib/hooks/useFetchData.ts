import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase-client";

export function useFetchData<T>(table: string) {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) {
      setError("Supabase not configured");
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.from(table).select("*");
    if (error) {
      setError(error.message);
      setData(null);
    } else {
      setData((data ?? []) as T[]);
      setError(null);
    }
    setLoading(false);
  }, [table]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}
