import net from "node:net";

type ValidationResult =
  | {
      ok: true;
      normalizedUrl: string;
    }
  | {
      ok: false;
      error: string;
    };

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

const IPV4_PRIVATE_BLOCKS: Array<(octets: number[]) => boolean> = [
  ([a]) => a === 10,
  ([a, b]) => a === 172 && b >= 16 && b <= 31,
  ([a, b]) => a === 192 && b === 168,
  ([a]) => a === 127,
  ([a, b]) => a === 169 && b === 254,
  ([a]) => a === 0,
];

function isLoopbackHost(hostname: string): boolean {
  const clean = hostname.replace(/^\[|\]$/g, "").toLowerCase();

  return LOOPBACK_HOSTS.has(clean);
}

function isPrivateIpv4(hostname: string): boolean {
  if (net.isIP(hostname) !== 4) {
    return false;
  }

  const octets = hostname.split(".").map((value) => Number(value));

  return IPV4_PRIVATE_BLOCKS.some((predicate) => predicate(octets));
}

function isPrivateIpv6(hostname: string): boolean {
  const clean = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (net.isIP(clean) !== 6) {
    return false;
  }

  return clean === "::1" || clean.startsWith("fc") || clean.startsWith("fd") || clean.startsWith("fe8") || clean.startsWith("fe9") || clean.startsWith("fea") || clean.startsWith("feb");
}

function isLocalHostname(hostname: string): boolean {
  const lower = hostname.toLowerCase();

  if (lower.endsWith(".local") || lower.endsWith(".localhost")) {
    return true;
  }

  return !lower.includes(".");
}

export function validateWebsiteUrl(input: string): ValidationResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return { ok: false, error: "Website URL is required." };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, error: "Provide a valid URL (including http:// or https://)." };
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    return { ok: false, error: "Only http:// or https:// URLs are supported." };
  }

  const hostname = parsed.hostname;
  const allowLocalhost = process.env.ALLOW_LOCALHOST_CAPTURE === "true";

  if (isLoopbackHost(hostname)) {
    if (!allowLocalhost) {
      return {
        ok: false,
        error:
          "Loopback URLs are blocked. Set ALLOW_LOCALHOST_CAPTURE=true to allow localhost in development.",
      };
    }

    return { ok: true, normalizedUrl: parsed.toString() };
  }

  if (isPrivateIpv4(hostname) || isPrivateIpv6(hostname) || isLocalHostname(hostname)) {
    return {
      ok: false,
      error:
        "Private or local network addresses are not allowed. Only public websites are accepted.",
    };
  }

  return { ok: true, normalizedUrl: parsed.toString() };
}
