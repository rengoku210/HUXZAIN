import { useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase-client';

export function useFetchData<T>(table: string) {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setError('Supabase not configured');
      setLoading(false);
      return;
    }
    const fetch = async () => {
      setLoading(true);
      const { data, error } = await supabase.from<T>(table).select('*');
      if (error) {
        setError(error.message);
        setData(null);
      } else {
        setData(data as T[]);
        setError(null);
      }
      setLoading(false);
    };
    fetch();
  }, [table]);

  return { data, loading, error };
}
