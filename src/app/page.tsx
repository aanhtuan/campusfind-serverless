import Link from "next/link";
import { ArrowDown, ArrowUpRight, Backpack, CheckCircle2, MapPin, Search, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

const steps = [
  { number: "01", icon: Search, title: "Find a familiar thing", description: "Browse lost and found reports from across your campus." },
  { number: "02", icon: MapPin, title: "Share what you found", description: "A small act of kindness can make someone’s day. Give a found item a place to be seen." },
  { number: "03", icon: ShieldCheck, title: "Make the connection", description: "Confirm ownership and arrange a safe return with your campus community." },
];

export default function Home() {
  return (
    <div className="mx-auto max-w-7xl px-6 sm:px-10 lg:px-16">
      <a href="#main-content" className="sr-only rounded-md bg-primary p-3 text-white focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-10">Skip to main content</a>
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-foreground/10 py-6">
        <Link href="/" aria-label="CampusFind home" className="flex items-center gap-2 text-xl font-bold tracking-tight">
          <span className="rounded-full bg-primary p-2 text-white"><MapPin aria-hidden="true" className="size-5" /></span>CampusFind<span className="text-primary">.</span>
        </Link>
        <nav aria-label="Main navigation" className="flex items-center gap-6 text-sm font-medium">
          <a href="#how-it-works" className="rounded-sm hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">How it works</a>
          <a href="#our-community" className="rounded-sm hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">Our community</a>
        </nav>
      </header>
      <main id="main-content">
        <section aria-labelledby="hero-title" className="grid items-center gap-12 py-16 sm:py-24 lg:grid-cols-[1.15fr_1fr]">
          <div>
            <p className="mb-6 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary"><span className="size-2 rounded-full bg-primary" />A little lost. A little found.</p>
            <h1 id="hero-title" className="max-w-xl text-5xl leading-[1.08] font-semibold tracking-tight sm:text-6xl lg:text-7xl">Good things<br />find their way<br /><span className="text-primary">back.</span></h1>
            <p className="mt-7 max-w-md text-lg leading-relaxed text-foreground/70">Your water bottle. Your favorite hoodie. Your whole day. A shared home for lost and found on campus.</p>
            <Button asChild size="lg" className="mt-8"><a href="#how-it-works">Meet CampusFind <ArrowDown aria-hidden="true" /></a></Button>
            <p className="mt-5 text-xs text-foreground/60">Coming soon to your campus.</p>
          </div>
          <div aria-label="Illustration of a backpack finding its way home" className="relative flex min-h-80 items-center justify-center rounded-[2rem] border border-primary/10 bg-[#e7eddf] p-8 sm:min-h-96">
            <div className="absolute top-7 left-7 flex items-center gap-2 text-xs font-semibold text-primary"><span className="size-2 rounded-full bg-primary" />Every item has a story</div>
            <div className="flex size-48 rotate-[-8deg] items-center justify-center rounded-[2.5rem] bg-primary text-[#e7eddf] shadow-xl sm:size-56"><Backpack aria-hidden="true" className="size-32 stroke-1" /></div>
            <div className="absolute right-5 bottom-8 flex items-center gap-3 rounded-xl border border-primary/10 bg-white p-4 shadow-sm sm:right-8"><CheckCircle2 aria-hidden="true" className="size-7 text-primary" /><div><p className="text-sm font-semibold">Back where it belongs.</p><p className="mt-1 text-xs text-foreground/60">That’s the idea.</p></div></div>
          </div>
        </section>
        <section id="how-it-works" aria-labelledby="steps-title" className="scroll-mt-6 border-t border-foreground/10 py-14 sm:py-20">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">A simple way to help</p><h2 id="steps-title" className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Less searching. More finding.</h2></div><span className="rounded-full border border-primary/20 px-3 py-1 text-xs text-primary">Planned for our first release</span></div>
          <div className="grid gap-6 md:grid-cols-3">{steps.map(({ number, icon: Icon, title, description }) => <article key={number} className="rounded-2xl border border-foreground/10 bg-white p-7"><div className="flex items-center justify-between"><Icon aria-hidden="true" className="size-6 text-primary" /><span className="text-xs font-medium text-foreground/50">{number}</span></div><h3 className="mt-7 text-lg font-semibold">{title}</h3><p className="mt-3 text-sm leading-relaxed text-foreground/70">{description}</p></article>)}</div>
        </section>
        <section id="our-community" aria-labelledby="community-title" className="mb-16 scroll-mt-6 rounded-2xl bg-primary px-7 py-10 text-white sm:p-12"><div className="flex flex-wrap items-center justify-between gap-6"><div className="max-w-xl"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">Made for campus life</p><h2 id="community-title" className="mt-3 text-3xl font-semibold tracking-tight">A campus that looks out for each other.</h2><p className="mt-4 leading-relaxed text-white/80">CampusFind brings students and campus staff together to turn misplaced belongings into happy reunions.</p></div><ArrowUpRight aria-hidden="true" className="size-12 stroke-1" /></div></section>
      </main>
      <footer className="flex flex-wrap justify-between gap-3 border-t border-foreground/10 py-6 text-xs text-foreground/60"><p>CampusFind · Lost things, found together.</p><p>Built for university communities.</p></footer>
    </div>
  );
}
