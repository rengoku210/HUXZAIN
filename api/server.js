import { toNodeHandler } from "srvx/node";
import server from "../dist/server/server.js";

const fetchHandler = server.fetch;

export default toNodeHandler((req, env, ctx) => {
  const url = new URL(req.url);
  const originalPath = url.searchParams.get("__original_path");
  
  if (originalPath !== null) {
    url.pathname = "/" + originalPath;
    url.searchParams.delete("__original_path");
    req = new Request(url.href, req);
  }
  
  return fetchHandler(req, env, ctx);
});
