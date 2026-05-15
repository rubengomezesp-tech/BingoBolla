// Lightweight IP geolocation using ipapi.co (free tier, no key required).
// In production replace with GeoComply or MaxMind for legal compliance.

const US_STATE_MAP: Record<string, string> = {
  Alabama: "AL", Alaska: "AK", Arizona: "AZ", Arkansas: "AR", California: "CA",
  Colorado: "CO", Connecticut: "CT", Delaware: "DE", Florida: "FL", Georgia: "GA",
  Hawaii: "HI", Idaho: "ID", Illinois: "IL", Indiana: "IN", Iowa: "IA",
  Kansas: "KS", Kentucky: "KY", Louisiana: "LA", Maine: "ME", Maryland: "MD",
  Massachusetts: "MA", Michigan: "MI", Minnesota: "MN", Mississippi: "MS", Missouri: "MO",
  Montana: "MT", Nebraska: "NE", Nevada: "NV", "New Hampshire": "NH", "New Jersey": "NJ",
  "New Mexico": "NM", "New York": "NY", "North Carolina": "NC", "North Dakota": "ND",
  Ohio: "OH", Oklahoma: "OK", Oregon: "OR", Pennsylvania: "PA", "Rhode Island": "RI",
  "South Carolina": "SC", "South Dakota": "SD", Tennessee: "TN", Texas: "TX", Utah: "UT",
  Vermont: "VT", Virginia: "VA", Washington: "WA", "West Virginia": "WV", Wisconsin: "WI",
  Wyoming: "WY", "District of Columbia": "DC",
};

export type GeoResult = {
  country: string | null;
  state: string | null;  // 2-letter code
  city: string | null;
  ip: string;
};

export async function lookupIp(ip: string): Promise<GeoResult | null> {
  // Skip localhost in dev
  if (!ip || ip === "127.0.0.1" || ip.startsWith("::") || ip.startsWith("10.") || ip.startsWith("192.168.")) {
    return { country: "US", state: "FL", city: "Miami (dev)", ip };
  }
  try {
    const r = await fetch(`https://ipapi.co/${ip}/json/`, {
      headers: { "User-Agent": "BingoBolla/1.0" },
      next: { revalidate: 3600 },
    });
    if (!r.ok) return null;
    const j = await r.json();
    const stateName = j.region as string | undefined;
    return {
      country: j.country_code ?? null,
      state: stateName ? US_STATE_MAP[stateName] ?? null : null,
      city: j.city ?? null,
      ip,
    };
  } catch {
    return null;
  }
}

export function ipFromHeaders(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return headers.get("x-real-ip") ?? "127.0.0.1";
}
