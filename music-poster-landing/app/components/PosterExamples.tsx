import Image from "next/image";

const posters = [
  {
    src: "/examples/conspiraciones-poster.jpg",
    alt: "Conspiraciones-inspired poster example",
    caption: "Conspiraciones — cool, airy editorial composition",
  },
  {
    src: "/examples/monaco-poster.jpg",
    alt: "Monaco-inspired poster example",
    caption: "Monaco — warm tones with hand-drawn texture",
  },
  {
    src: "/examples/dtmf-poster.jpg",
    alt: "Dtmf-inspired poster example",
    caption: "DTMF — high-contrast color and bold framing",
  },
];

export function PosterExamples() {
  return (
    <section className="mt-20" aria-labelledby="poster-examples-title">
      <p className="text-xs uppercase tracking-[0.28em] text-stone-500">Selected examples</p>
      <h2 id="poster-examples-title" className="mt-4 text-3xl font-semibold tracking-tight text-stone-900 md:text-4xl">
        Posters created with the product
      </h2>
      <p className="mt-4 max-w-2xl text-stone-600">
        A few examples showing different moods, palettes, and compositions.
      </p>

      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {posters.map((poster) => (
          <article
            key={poster.src}
            className="rounded-2xl border border-stone-200 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.06)]"
          >
            <div className="overflow-hidden rounded-xl border border-stone-200 bg-stone-50">
              <Image
                src={poster.src}
                alt={poster.alt}
                width={800}
                height={1000}
                className="h-auto w-full object-cover"
                sizes="(min-width: 768px) 33vw, 100vw"
              />
            </div>
            <p className="mt-3 text-sm text-stone-600">{poster.caption}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
