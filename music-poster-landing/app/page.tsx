export default function Home() {
  return (
    <main className="min-h-screen bg-white text-black">

      <section className="mx-auto max-w-6xl px-6 py-24 text-center">

        <h1 className="text-5xl font-bold tracking-tight">
          Turn any song into a beautiful poster
        </h1>

        <p className="mt-6 text-lg text-gray-600">
          Create custom music posters inspired by your favorite tracks.
        </p>

        <div className="mt-10 flex justify-center gap-4">

          <a
            href="/create"
            className="rounded-xl bg-black px-6 py-3 text-white hover:bg-gray-800"
          >
            Create your poster
          </a>

        </div>

      </section>

    </main>
  );
}