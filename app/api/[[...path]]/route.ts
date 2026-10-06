import { handleApi } from "@/lib/server/api";

export const dynamic = "force-dynamic";

export function GET(request: Request) { return handleApi(request); }
export function POST(request: Request) { return handleApi(request); }
export function PATCH(request: Request) { return handleApi(request); }
export function DELETE(request: Request) { return handleApi(request); }
