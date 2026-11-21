import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { connect, type AddressInfo, type Socket } from "node:net";
import { shopeeFetch } from "./client.ts";

const listen = (s: Server) => new Promise<number>((ok) => s.listen(0, "127.0.0.1", () => ok((s.address() as AddressInfo).port)));

test("with SHOPEE_PROXY_URL, Shopee calls go out through that server, sending its password", async (t) => {
  const shopee = createServer((req, res) => res.end(JSON.stringify({ path: req.url })));
  const seen: string[] = [];
  const open: Socket[] = [];
  const proxy = createServer();
  proxy.on("connect", (req, client: Socket, head) => {
    seen.push(`${req.url} ${req.headers["proxy-authorization"]}`);
    const [host, port] = String(req.url).split(":");
    const up = connect(Number(port), host, () => {
      client.write("HTTP/1.1 200 Connection Established\r\n\r\n");
      up.write(head);
      up.pipe(client).pipe(up);
    });
    open.push(client, up);
  });
  const [shopeePort, proxyPort] = [await listen(shopee), await listen(proxy)];
  t.after(() => {
    delete process.env.SHOPEE_PROXY_URL;
    for (const s of open) s.destroy();
    shopee.closeAllConnections();
    shopee.close();
    proxy.close();
  });

  process.env.SHOPEE_PROXY_URL = `http://rezekii:s3cret@127.0.0.1:${proxyPort}`;
  const res = await shopeeFetch(`http://127.0.0.1:${shopeePort}/api/v2/shop/get_profile?x=1`);
  assert.deepEqual(await res.json(), { path: "/api/v2/shop/get_profile?x=1" });
  assert.deepEqual(seen, [`127.0.0.1:${shopeePort} Basic ${Buffer.from("rezekii:s3cret").toString("base64")}`]);
});
