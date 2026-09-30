import { http } from "@/composition/server";

export const dynamic = "force-dynamic";

export const GET = (req: Request, { params }: { params: { name: string } }) => http.pokemon(req, params);
