import { describe, expect, it } from "vitest";
import { UpstreamError } from "@/core/application/errors";
import { CODES, testApp } from "@/test/fakes";
import { createHttpApi } from "./http-api";

const url = (path: string) => `http://localhost/api${path}`;
const get = (path: string, headers: Record<string, string> = {}) => new Request(url(path), { headers });
const login = (accessCode: string, headers: Record<string, string> = {}) =>
  new Request(url("/auth/session"), {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify({ accessCode }),
  });

function setup() {
  const ctx = testApp();
  return { ...ctx, http: createHttpApi(ctx.app, { secureCookies: true }) };
}

// grab "hm_session=xxx" out of a set-cookie header
const sessionFrom = (res: Response) => res.headers.get("set-cookie")!.split(";")[0];

describe("http api", () => {
  it("says you're a visitor when you have no session", async () => {
    const res = await setup().http.me(get("/me"));
    expect(await res.json()).toMatchObject({ role: "visitor", permissions: ["profile:read", "pokedex:read"] });
  });

  it("answers 403 on contact for a visitor, with what's missing", async () => {
    const res = await setup().http.contact(get("/contact"));
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "forbidden", need: "contact:read", youAre: "visitor" });
  });

  it("logs in with a recruiter code + then shows the contact", async () => {
    const { http } = setup();
    const res = await http.openSession(login(CODES.recruiter));
    expect(res.status).toBe(201);

    const setCookie = res.headers.get("set-cookie")!;
    expect(setCookie).toMatch(/HttpOnly/);
    expect(setCookie).toMatch(/SameSite=Lax/);
    expect(setCookie).toMatch(/Secure/);

    const contact = await http.contact(get("/contact", { cookie: sessionFrom(res) }));
    expect(contact.status).toBe(200);
    expect(await contact.json()).toMatchObject({ email: "younes.kadi@epitech.eu", phone: "+33 0 00 00 00 00" });
  });

  it("accepts a bearer token too, for curl people", async () => {
    const { http } = setup();
    const token = sessionFrom(await http.openSession(login(CODES.admin))).split("=")[1];
    const res = await http.me(get("/me", { authorization: `Bearer ${token}` }));
    expect((await res.json()).role).toBe("admin");
  });

  it("says 401 on a wrong code", async () => {
    expect((await setup().http.openSession(login("guess"))).status).toBe(401);
  });

  it("only takes json on login", async () => {
    const form = new Request(url("/auth/session"), { method: "POST", body: "accessCode=x" });
    expect((await setup().http.openSession(form)).status).toBe(415);
  });

  it("says 400 on a body with no code", async () => {
    const { http } = setup();
    const res = await http.openSession(
      new Request(url("/auth/session"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("slows down brute force with a 429 + retry-after", async () => {
    const { http } = setup();
    const ip = { "x-forwarded-for": "6.6.6.6" };
    for (let i = 0; i < 5; i++) await http.openSession(login("guess", ip));
    const res = await http.openSession(login(CODES.admin, ip));
    expect(res.status).toBe(429);
    expect(Number(res.headers.get("retry-after"))).toBeGreaterThan(0);
  });

  it("drops a tampered cookie + treats you as a visitor", async () => {
    const res = await setup().http.me(get("/me", { cookie: "hm_session=eyJyb2xlIjoiYWRtaW4ifQ.fake" }));
    expect((await res.json()).role).toBe("visitor");
    expect(res.headers.get("set-cookie")).toMatch(/Max-Age=0/);
  });

  it("keeps the audit log for admins, + it shows who got denied", async () => {
    const { http } = setup();
    await http.contact(get("/contact"));

    const recruiter = sessionFrom(await http.openSession(login(CODES.recruiter)));
    expect((await http.audit(get("/admin/audit", { cookie: recruiter }))).status).toBe(403);

    const admin = sessionFrom(await http.openSession(login(CODES.admin)));
    const res = await http.audit(get("/admin/audit", { cookie: admin }));
    expect(res.status).toBe(200);
    const entries = await res.json();
    expect(entries).toEqual(
      expect.arrayContaining([expect.objectContaining({ role: "visitor", action: "contact:read", allowed: false })]),
    );
  });

  it("serves the pokedex to everyone", async () => {
    const res = await setup().http.pokemonList(get("/pokemon?limit=3"));
    expect(res.status).toBe(200);
    expect(await res.json()).toHaveLength(3);
  });

  it("404s on a weird name instead of passing it upstream", async () => {
    const res = await setup().http.pokemon(get("/pokemon/x"), { name: "../../etc/passwd" });
    expect(res.status).toBe(404);
  });

  it("502s when pokeapi is down", async () => {
    const { http, catalog } = setup();
    catalog.details = async () => {
      throw new UpstreamError("down");
    };
    expect((await http.pokemon(get("/pokemon/pikachu"), { name: "pikachu" })).status).toBe(502);
  });
});
