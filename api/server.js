import { toNodeHandler } from "srvx/node";
import server from "../dist/server/server.js";

const fetchHandler = server.fetch;

export default toNodeHandler((req, env, ctx) => {
  const url = new URL(req.url);
  const originalPath = url.searchParams.get("__original_path");
  
  if (originalPath !== null) {
    url.pathname = "/" + originalPath;
    url.searchParams.delete("__original_path");
    Object.defineProperty(req, "url", {
      value: url.href,
      configurable: true,
      enumerable: true
    });
  }
  
  return fetchHandler(req, env, ctx);
});
