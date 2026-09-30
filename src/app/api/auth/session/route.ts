import { http } from "@/composition/server";

export const dynamic = "force-dynamic";

export const POST = (req: Request) => http.openSession(req);
export const DELETE = (req: Request) => http.closeSession(req);
