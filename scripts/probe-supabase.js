const fs = require("fs");
const dns = require("dns");

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
console.log("url", u);
console.log("keyPrefix", k.slice(0, 18), "len", k.length);

dns.setDefaultResultOrder("ipv4first");
dns.lookup(new URL(u).hostname, { all: true }, (e, a) => {
  console.log("dns", e || a);
});

fetch(u + "/auth/v1/settings", {
  headers: { apikey: k, Authorization: "Bearer " + k },
})
  .then(async (r) => {
    console.log("fetch status", r.status);
    console.log((await r.text()).slice(0, 120));
  })
  .catch((e) =>
    console.log("fetch FAIL", e.cause?.code || e.code || e.message, e.cause || e)
  );
