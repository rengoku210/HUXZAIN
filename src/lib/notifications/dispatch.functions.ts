/**
 * HX-006 — Server-fn boundary for the notification engine.
 *
 * notify() is server-only (it uses the service-role admin client). Most live
 * transitions, however, run in client components with the anon client. This
 * createServerFn wraps notify() so ANY flow — client or server — can trigger the
 * engine: on the client it becomes an RPC that executes notify() on the server;
 * on the server it runs directly. The hooks in ./hooks.ts call this, so callers
 * never import notify.ts (server-only code) into a client bundle.
 */

"use server";

import { createServerFn } from "@tanstack/react-start";
import { notify, type NotifyContext, type NotifyResult } from "./notify";

export const dispatchEvent = createServerFn({ method: "POST" })
  .inputValidator((d: { eventKey: string; ctx?: NotifyContext }) => d)
  .handler(async ({ data }): Promise<NotifyResult> => {
    return notify(data.eventKey, data.ctx ?? {});
  });
