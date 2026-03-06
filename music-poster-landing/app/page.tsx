const navItems = ["Features", "How it Works", "Templates", "Pricing", "FAQ"];

const featureCards = [
  {
    title: "AI-powered poster styling",
    description:
      "Generate gallery-ready artwork using track mood, genre, and album palette in seconds.",
  },
  {
    title: "Editable design layers",
    description:
      "Tweak typography, waveform shape, backgrounds, and visual effects without leaving the editor.",
  },
  {
    title: "Ready-to-print exports",
    description:
      "Download in social, print, and merch formats with one click and no design tools required.",
  },
];

const workflowSteps = [
  {
    title: "Drop your track details",
    text: "Paste Spotify or Apple Music metadata, or enter title, artist, and vibe manually.",
  },
  {
    title: "Choose a poster direction",
    text: "Pick from modern, retro, minimal, or neon template families inspired by Finwise-style blocks.",
  },
  {
    title: "Generate and publish",
    text: "Export high-resolution posters for social campaigns, event flyers, and fan drops.",
  },
];

const pricingPlans = [
  {
    name: "Starter",
    price: "$12",
    cadence: "/month",
    cta: "Start creating",
    featured: false,
    points: ["25 poster generations", "HD downloads", "3 template packs"],
  },
  {
    name: "Pro",
    price: "$29",
    cadence: "/month",
    cta: "Get Pro",
    featured: true,
    points: ["Unlimited generations", "4K + print exports", "Brand kit + custom fonts"],
  },
  {
    name: "Studio",
    price: "$79",
    cadence: "/month",
    cta: "Talk to sales",
    featured: false,
    points: ["Team workspaces", "Client approvals", "Priority rendering queue"],
  },
];

const faqs = [
  {
    q: "Can I use generated posters commercially?",
    a: "Yes. Pro and Studio plans include commercial usage rights for campaigns, events, and merch.",
  },
  {
    q: "Do I need design experience?",
    a: "No. The generator handles layout and styling automatically, while you can still fine-tune details.",
  },
  {
    q: "Which export sizes are available?",
    a: "Square, story, and print ratios are included with customizable DPI presets.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <header className="flex items-center justify-between rounded-full border border-white/15 bg-white/5 px-6 py-3 backdrop-blur">
          <p className="text-sm font-semibold tracking-[0.18em] text-cyan-300">POSTERFLOW</p>
          <nav className="hidden gap-6 text-sm text-slate-200 md:flex">
            {navItems.map((item) => (
              <a key={item} href="#" className="transition hover:text-cyan-300">
                {item}
              </a>
            ))}
          </nav>
          <a
            href="/create"
            className="rounded-full border border-cyan-300/40 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-200 hover:bg-cyan-400/20"
          >
            Launch app
          </a>
        </header>

        <section className="relative mt-14 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-950 to-cyan-950/40 p-10 md:p-14">
          <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-cyan-400/30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 left-8 h-52 w-52 rounded-full bg-fuchsia-500/20 blur-3xl" />
          <p className="text-xs uppercase tracking-[0.28em] text-cyan-200">Music Poster Generator SaaS</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight md:text-6xl">
            Turn every track into a high-converting visual campaign.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-slate-300">
            A Finwise-inspired landing experience customized for artists, labels, and creators who need poster
            content in minutes.
          </p>
          <div className="mt-9 flex flex-wrap gap-4">
            <a
              href="/create"
              className="rounded-full bg-cyan-300 px-6 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-200"
            >
              Generate first poster
            </a>
            <a
              href="#pricing"
              className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-slate-100 hover:border-white/40"
            >
              View pricing
            </a>
          </div>
          <dl className="mt-12 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <dt className="text-xs uppercase tracking-wider text-slate-400">Posters generated</dt>
              <dd className="mt-2 text-2xl font-semibold">1.8M+</dd>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <dt className="text-xs uppercase tracking-wider text-slate-400">Avg. creation time</dt>
              <dd className="mt-2 text-2xl font-semibold">43 sec</dd>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <dt className="text-xs uppercase tracking-wider text-slate-400">Creator teams</dt>
              <dd className="mt-2 text-2xl font-semibold">9,400+</dd>
            </div>
          </dl>
        </section>

        <section className="mt-20">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <h2 className="text-3xl font-semibold">Everything you need for poster-ready releases.</h2>
            <p className="max-w-xl text-slate-300">
              Copy-only UI integration from the Finwise aesthetic with SaaS messaging tailored to music marketing.
            </p>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {featureCards.map((feature) => (
              <article
                key={feature.title}
                className="rounded-2xl border border-white/10 bg-slate-900/70 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]"
              >
                <div className="mb-4 h-10 w-10 rounded-lg bg-cyan-300/20" />
                <h3 className="text-lg font-semibold">{feature.title}</h3>
                <p className="mt-3 text-sm text-slate-300">{feature.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-20 grid gap-10 rounded-3xl border border-white/10 bg-slate-900/60 p-8 md:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-[0.26em] text-cyan-200">How it works</p>
            <h2 className="mt-4 text-3xl font-semibold">From track metadata to finished poster in three steps.</h2>
          </div>
          <ol className="space-y-5">
            {workflowSteps.map((step, index) => (
              <li key={step.title} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <p className="text-sm font-semibold text-cyan-200">0{index + 1}</p>
                <h3 className="mt-1 font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm text-slate-300">{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="pricing" className="mt-20">
          <h2 className="text-3xl font-semibold">Simple pricing for every creative stage.</h2>
          <div className="mt-7 grid gap-4 md:grid-cols-3">
            {pricingPlans.map((plan) => (
              <article
                key={plan.name}
                className={`rounded-2xl border p-6 ${
                  plan.featured
                    ? "border-cyan-300/70 bg-gradient-to-b from-cyan-400/20 to-slate-900"
                    : "border-white/10 bg-slate-900/60"
                }`}
              >
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                <p className="mt-3 text-4xl font-semibold">
                  {plan.price}
                  <span className="text-sm font-normal text-slate-300">{plan.cadence}</span>
                </p>
                <ul className="mt-5 space-y-2 text-sm text-slate-200">
                  {plan.points.map((point) => (
                    <li key={point}>• {point}</li>
                  ))}
                </ul>
                <button className="mt-6 w-full rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-slate-200">
                  {plan.cta}
                </button>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-20 rounded-3xl border border-white/10 bg-slate-900/60 p-8">
          <h2 className="text-3xl font-semibold">Frequently asked questions</h2>
          <div className="mt-6 space-y-4">
            {faqs.map((faq) => (
              <article key={faq.q} className="rounded-xl border border-white/10 bg-white/5 p-5">
                <h3 className="font-semibold">{faq.q}</h3>
                <p className="mt-2 text-sm text-slate-300">{faq.a}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
