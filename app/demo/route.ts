import { NextResponse } from "next/server";
import { EVENT_SLUG } from "@/lib/demo/build";
import { getDemoState, openSession } from "@/lib/demo/store";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const session = openSession(getDemoState(), "usr_ana");
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || new URL(request.url).host;
  const proto = request.headers.get("x-forwarded-proto") || new URL(request.url).protocol.replace(":", "");
  const response = NextResponse.redirect(`${proto}://${host}/events/${EVENT_SLUG}/control-center`);
  const secure = process.env.NODE_ENV === "production" && proto === "https";
  const base = { path: "/", sameSite: "lax" as const, secure, maxAge: 60 * 60 * 24 * 14 };
  response.cookies.set("plane_session", session.token, { ...base, httpOnly: true });
  response.cookies.set("plane_csrf", session.csrfToken, { ...base, httpOnly: false });
  response.cookies.set("plane_demo", "1", { ...base, httpOnly: true });
  return response;
}
