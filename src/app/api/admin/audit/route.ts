import { http } from "@/composition/server";

export const dynamic = "force-dynamic";

export const GET = (req: Request) => http.audit(req);
