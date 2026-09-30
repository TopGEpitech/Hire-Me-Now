import { http } from "@/composition/server";

export const dynamic = "force-dynamic";
// the coach can take a few seconds, streaming keeps the connection busy
export const maxDuration = 60;

export const POST = (req: Request) => http.coach(req);
