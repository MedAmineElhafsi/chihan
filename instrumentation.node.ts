/**
 * Prefer IPv4 when resolving hostnames. Avoids Windows Node burning the
 * connect timeout on unreachable IPv6 (NAT64) addresses for Supabase.
 */
import dns from "node:dns";

dns.setDefaultResultOrder("ipv4first");
