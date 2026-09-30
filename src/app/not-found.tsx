import Link from "next/link";

export default function NotFoundPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <p className="kicker">404</p>
      <h1 className="mt-2 text-4xl font-black">A wild 404 appeared!</h1>
      <p className="mt-3 text-muted-foreground">
        This page isn&apos;t in the Pokédex. Maybe it&apos;s in the tall grass.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-md border-2 bg-primary px-4 py-2 font-bold text-primary-foreground shadow-hard-sm"
      >
        Run back home
      </Link>
    </div>
  );
}
