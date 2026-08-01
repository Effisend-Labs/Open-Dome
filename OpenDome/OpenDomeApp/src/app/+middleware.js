import { getCorsHeaders, isAllowedOrigin } from "../utilsAPI/corsHelper";

export const unstable_settings = {
  matcher: {
    patterns: [
      "/api",           
      "/api/[...path]"  
    ],
  },
};

export default function middleware(request) {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(request),
    });
  }

  if (!isAllowedOrigin(request)) {
    console.warn(`🚫 CORS BLOCKED origin: ${request.headers.get("origin")}`);
    return Response.json(
      { error: "CORS error: Origin not allowed" },
      { status: 403, headers: getCorsHeaders(request) }
    );
  }

  const userAgent = request.headers.get("user-agent")?.toLowerCase() || "";
  const blockedAgents = ["postman", "curl", "node-fetch", "axios", "insomnia", "undici"];
  
  if (blockedAgents.some(agent => userAgent.includes(agent))) {
    console.warn(`🚫 Blocked automated tool: ${userAgent}`);
    return Response.json(
      { error: "Automated requests and server tools are not allowed." },
      { status: 403, headers: getCorsHeaders(request) }
    );
  }
}