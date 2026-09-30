import { http } from "@/composition/server";

export const dynamic = "force-dynamic";

export const POST = (req: Request) => http.hire(req);
