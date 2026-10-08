import { absoluteAppUrl } from "@/lib/app-origins";

export default function MarketingHome() {
  return (
    <main className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <span className="text-2xl font-bold tracking-tight text-brand">FitOut</span>
        <a href={absoluteAppUrl("/")} className="inline-flex min-h-11 items-center rounded-full bg-brand px-6 font-semibold text-brand-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">Open App</a>
      </header>
      <section className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center gap-6 px-6 py-16 text-center">
        <p className="font-semibold uppercase tracking-widest text-brand">For players. For hosts.</p>
        <h1 className="text-5xl font-bold tracking-tight sm:text-7xl">Good plans need a place.</h1>
        <p className="max-w-2xl text-lg text-muted-foreground">Find a court, gym or studio for your next session. Have a space? Help people find it, book it and make it part of their plans.</p>
        <div className="flex flex-wrap justify-center gap-4">
          <a href="/players" className="inline-flex min-h-11 items-center rounded-full bg-brand px-6 font-semibold text-brand-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">I want to play</a>
          <a href="/hosts" className="inline-flex min-h-11 items-center rounded-full border border-border bg-card px-6 font-semibold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">I have a space</a>
        </div>
      </section>
    </main>
  );
}
