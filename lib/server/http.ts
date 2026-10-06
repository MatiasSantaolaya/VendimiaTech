export class HttpError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

export function json(status: number, body: unknown, extra?: Headers) {
  const headers = extra ?? new Headers();
  if (!headers.has("content-type")) headers.set("content-type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(body), { status, headers });
}

export function readCookie(request: Request, name: string) {
  const header = request.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

export function cookieHeader(name: string, value: string, request: Request, httpOnly: boolean, maxAge = 60 * 60 * 24 * 14) {
  const secure = process.env.NODE_ENV === "production" && new URL(request.url).protocol === "https:";
  const parts = [`${name}=${encodeURIComponent(value)}`, "Path=/", "SameSite=Lax", `Max-Age=${maxAge}`];
  if (httpOnly) parts.push("HttpOnly");
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export function authCookieList(request: Request, token: string, csrf: string, demo: boolean) {
  const cookies = [
    cookieHeader("plane_session", token, request, true),
    cookieHeader("plane_csrf", csrf, request, false),
  ];
  cookies.push(demo ? cookieHeader("plane_demo", "1", request, true) : cookieHeader("plane_demo", "", request, true, 0));
  return cookies;
}

export function withCookies(response: Response, cookies: string[]) {
  const headers = new Headers(response.headers);
  for (const cookie of cookies) headers.append("set-cookie", cookie);
  return new Response(response.body, { status: response.status, headers });
}

export function requestHost(request: Request) {
  return request.headers.get("x-forwarded-host") || request.headers.get("host") || new URL(request.url).host;
}

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) throw new HttpError(403, "ORIGIN_REQUIRED", "Falta el origen de la solicitud.");
  if (new URL(origin).host !== requestHost(request)) throw new HttpError(403, "ORIGIN_MISMATCH", "El origen no coincide.");
}

export function clientIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}
