import { withSecurity } from "../../utilsAPI/withSecurity";

export const GET = withSecurity(async () => {
  return Response.json({ hello: "world" });
});

export const POST = withSecurity(async () => {
  return Response.json({ hello: "world" });
});