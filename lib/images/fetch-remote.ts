import "server-only";
import { lookup as dnsLookup, type LookupAddress } from "node:dns";
import http from "node:http";
import https from "node:https";
import { BlockList, isIP, type LookupFunction } from "node:net";
import { ImageError } from "./rules";

// Downloads an image from a URL, so we can keep our own copy instead of
// linking to someone else's site: one Ivan pastes into the editor, or a Google
// sign-up's profile picture (copied once, lib/google-picture.ts).
//
// The server fetching a URL it's given is a classic attack surface (SSRF): a
// crafted URL could make it read internal services or cloud metadata. So:
//   - only for the admin (checked by the import route) or a Google picture
//     address (checked by googlePictureUrl in lib/avatars.ts)
//   - http(s) on the standard ports only, no "user:password@" URLs
//   - only public internet addresses. The check runs inside the DNS lookup the
//     connection itself uses, so a hostname can't pass the check with one
//     address and then connect to another ("DNS rebinding").
//   - redirects followed by hand (at most 3), each hop checked the same way
//   - a time limit, a size limit, and image responses only

export const REMOTE_LIMITS = {
  maxBytes: 25 * 1024 * 1024, // full-size Unsplash/Pexels originals are often 10–25 MB
  timeoutMs: 15_000,
  maxRedirects: 3,
} as const;

function tooBig(): string {
  return `That image is too big to import (over ${Math.round(REMOTE_LIMITS.maxBytes / 1024 / 1024)} MB).`;
}

const USER_AGENT = "StarfoxLabs/1.0 (+https://starfoxlabs.org; image import for the site's own pages)";

// Addresses that aren't the public internet: this machine, private networks,
// link-local (including cloud metadata at 169.254.169.254), carrier-grade NAT,
// documentation/benchmark ranges, multicast and reserved space.
const blocked = new BlockList();
for (const [network, prefix] of [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8], ["169.254.0.0", 16],
  ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24], ["192.88.99.0", 24], ["192.168.0.0", 16],
  ["198.18.0.0", 15], ["198.51.100.0", 24], ["203.0.113.0", 24], ["224.0.0.0", 4], ["240.0.0.0", 4],
] as const) {
  blocked.addSubnet(network, prefix, "ipv4");
}
for (const [network, prefix] of [
  ["::", 128], ["::1", 128], ["64:ff9b::", 96], ["64:ff9b:1::", 48], ["100::", 64], ["2001::", 23],
  ["2001:db8::", 32], ["2002::", 16], ["fc00::", 7], ["fe80::", 10], ["fec0::", 10], ["ff00::", 8],
] as const) {
  blocked.addSubnet(network, prefix, "ipv6");
}

/** True for any address that isn't on the public internet. */
export function isPrivateAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 4) return blocked.check(address, "ipv4");
  if (version !== 6) return true; // not an address at all: refuse
  // An IPv4 address written as IPv6 (::ffff:127.0.0.1) is checked as IPv4.
  const mapped = address.toLowerCase().match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return blocked.check(mapped[1], "ipv4");
  if (/^::ffff:/i.test(address)) return true; // the hex spelling of the same thing
  return blocked.check(address, "ipv6");
}

const NOT_PUBLIC = "That address isn't on the public internet, so it can't be imported.";

/** DNS lookup for outgoing connections that refuses any non-public answer. */
const publicOnlyLookup: LookupFunction = (hostname, options, callback) => {
  dnsLookup(hostname, { ...options, all: true }, (error, addresses: LookupAddress[]) => {
    if (error) return callback(error, "", 0);
    if (addresses.length === 0 || addresses.some((a) => isPrivateAddress(a.address))) {
      return callback(Object.assign(new Error(NOT_PUBLIC), { code: "ESTARFOXBLOCKED" }), "", 0);
    }
    if (options.all) return (callback as unknown as (e: null, a: LookupAddress[]) => void)(null, addresses);
    callback(null, addresses[0].address, addresses[0].family);
  });
};

/** Checks a URL before any connection: scheme, port, credentials, and IP-literal hosts. */
function checkUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new ImageError("That doesn't look like a link. Paste the full address, starting with https://.");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new ImageError("Only http:// and https:// links can be imported.");
  }
  if (url.username || url.password) throw new ImageError("Links with a username or password can't be imported.");
  if (url.port && url.port !== "80" && url.port !== "443") {
    throw new ImageError("Only links on the standard web ports can be imported.");
  }
  // Node connects to IP literals without a DNS lookup, so check those here.
  // (The URL parser has already turned tricks like "0x7f.1" into "127.0.0.1".)
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (isIP(host) && isPrivateAddress(host)) throw new ImageError(NOT_PUBLIC);
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new ImageError(NOT_PUBLIC);
  }
  return url;
}

type Downloaded = { bytes: Buffer; contentType: string; finalUrl: URL };

function requestOnce(url: URL, signal: AbortSignal): Promise<{ status: number; location?: string } | Downloaded> {
  return new Promise((resolve, reject) => {
    const client = url.protocol === "https:" ? https : http;
    const request = client.get(
      url,
      {
        lookup: publicOnlyLookup,
        signal,
        headers: { "User-Agent": USER_AGENT, Accept: "image/avif,image/webp,image/png,image/jpeg;q=0.9,*/*;q=0.1" },
      },
      (response) => {
        const status = response.statusCode ?? 0;
        if (status >= 300 && status < 400) {
          response.resume(); // discard the body
          return resolve({ status, location: response.headers.location });
        }
        if (status !== 200) {
          response.resume();
          return reject(new ImageError(`The image's website answered with an error (${status}). Check the link.`));
        }

        const contentType = (response.headers["content-type"] ?? "").split(";")[0].trim().toLowerCase();
        if (contentType === "text/html" || contentType === "application/xhtml+xml") {
          response.resume();
          return reject(
            new ImageError("That link opens a web page, not an image. Right-click the image and choose “Copy image address”."),
          );
        }
        const declared = Number(response.headers["content-length"] ?? 0);
        if (declared > REMOTE_LIMITS.maxBytes) {
          response.destroy();
          return reject(new ImageError(tooBig()));
        }

        const chunks: Buffer[] = [];
        let received = 0;
        response.on("data", (chunk: Buffer) => {
          received += chunk.length;
          if (received > REMOTE_LIMITS.maxBytes) {
            response.destroy();
            reject(new ImageError(tooBig()));
          } else {
            chunks.push(chunk);
          }
        });
        response.on("end", () => resolve({ bytes: Buffer.concat(chunks), contentType, finalUrl: url }));
        response.on("error", reject);
      },
    );
    request.on("error", reject);
  });
}

/** Downloads an image from a public http(s) URL, within the limits above. */
export async function fetchRemoteImage(raw: string): Promise<Downloaded> {
  const signal = AbortSignal.timeout(REMOTE_LIMITS.timeoutMs);
  let url = checkUrl(raw);

  try {
    for (let hop = 0; hop <= REMOTE_LIMITS.maxRedirects; hop++) {
      const result = await requestOnce(url, signal);
      if ("bytes" in result) return result;
      if (!result.location) throw new ImageError("The image's website sent a redirect without an address.");
      url = checkUrl(new URL(result.location, url).href); // every hop gets the same checks
    }
    throw new ImageError("That link redirects too many times.");
  } catch (error) {
    if (error instanceof ImageError) throw error;
    const code = (error as { code?: string; name?: string }).code;
    const name = (error as { name?: string }).name;
    if (code === "ESTARFOXBLOCKED") throw new ImageError(NOT_PUBLIC);
    if (name === "TimeoutError" || name === "AbortError" || signal.aborted) {
      throw new ImageError(
        `The image took too long to download (over ${REMOTE_LIMITS.timeoutMs / 1000} seconds). Try another link.`,
      );
    }
    if (code === "ENOTFOUND" || code === "EAI_AGAIN") throw new ImageError("Couldn't find that website. Check the link.");
    throw new ImageError("Couldn't download that image. Check the link and try again.");
  }
}
