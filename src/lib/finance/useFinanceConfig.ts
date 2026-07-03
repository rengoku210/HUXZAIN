/**
 * HX-007 — useFinanceConfig(): React hook wrapper around getFinanceConfig().
 *
 * Returns the documented defaults synchronously on first render (so the
 * Transaction Summary panel always has something correct to show), then swaps
 * in the DB-overlaid config once it resolves. Never throws, never suspends.
 */

import { useEffect, useState } from "react";
import { getFinanceConfig } from "./config.functions";
import { DOCUMENTED_FINANCE_CONFIG, type FinanceConfig } from "./finance-config";

export function useFinanceConfig(): { config: FinanceConfig; loading: boolean } {
  const [config, setConfig] = useState<FinanceConfig>(DOCUMENTED_FINANCE_CONFIG);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getFinanceConfig()
      .then((c) => {
        if (active) setConfig(c);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return { config, loading };
}
