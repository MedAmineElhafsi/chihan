const fs = require("fs");
const dns = require("dns");

dns.setDefaultResultOrder("ipv4first");

async function main() {
  try {
    const { Agent, setGlobalDispatcher } = require("undici");
    setGlobalDispatcher(
      new Agent({
        connect: { timeout: 60_000 },
        headersTimeout: 60_000,
        bodyTimeout: 60_000,
      })
    );
    console.log("undici agent ok");
  } catch (e) {
    console.log("undici agent fail", e.message);
  }

  const env = Object.fromEntries(
    fs
      .readFileSync(".env.local", "utf8")
      .split(/\r?\n/)
      .filter((l) => l && !l.startsWith("#") && l.includes("="))
      .map((l) => {
        const i = l.indexOf("=");
        return [
          l.slice(0, i),
          l
            .slice(i + 1)
            .trim()
            .replace(/^["']|["']$/g, ""),
        ];
      })
  );

  const u = env.NEXT_PUBLIC_SUPABASE_URL;
  const k = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const started = Date.now();
  try {
    const r = await fetch(u + "/auth/v1/settings", {
      headers: { apikey: k, Authorization: "Bearer " + k },
    });
    console.log("fetch status", r.status, "in", Date.now() - started, "ms");
  } catch (e) {
    console.log(
      "fetch FAIL",
      Date.now() - started,
      "ms",
      e.cause?.code || e.code || e.message
    );
  }
}

main();
