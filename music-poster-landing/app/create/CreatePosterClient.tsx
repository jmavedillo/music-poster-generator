"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Script from "next/script";
import "./legacyPoster.css";

declare global {
  interface Window {
    html2canvas?: (element: HTMLElement, options?: Record<string, unknown>) => Promise<HTMLCanvasElement>;
  }
}

type Artist = {
  id: string;
  name: string;
  imageUrl: string | null;
};

type TrackArtist = {
  id: string;
  name: string;
};

type Track = {
  id: string;
  title: string;
  artists: TrackArtist[];
  durationSeconds: number;
  coverUrl: string | null;
};

type PosterTheme = "dark" | "inverse";

type PosterData = {
  track: {
    title: string;
    artists: string;
    currentTime: string;
    totalTime: string;
  };
  artwork: {
    coverUrl: string;
  };
};

const defaults = {
  title: "Viajo Sin Ver (Remix) [feat De La...]",
  artists: "Jon Z, De La Ghetto, Almighty, Miky...",
  totalTime: "9:29",
  cover: "/next.svg",
};

const MIN_QUERY_LENGTH = 3;
const DEBOUNCE_MS = 300;
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";
const waveHeights = [16, 26, 12, 34, 20, 40, 14, 46, 22, 32, 12, 38, 18, 44, 16];

const normalizeText = (value: string) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const clampNumber = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const formatTime = (totalSeconds: number) => {
  const safeSeconds = clampNumber(Number(totalSeconds) || 0, 0, 59 * 60 + 59);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};

const parseTime = (value: string) => {
  if (!/^\d{1,2}:\d{2}$/.test(value)) return null;
  const [minutes, seconds] = value.split(":").map(Number);
  if (seconds > 59) return null;
  return minutes * 60 + seconds;
};

const getElapsedTime = (totalTime: string) => {
  const parsedTotal = parseTime(totalTime);
  if (parsedTotal === null) {
    return formatTime(Math.round(0.8 * (parseTime(defaults.totalTime) ?? 0)));
  }

  return formatTime(Math.round(parsedTotal * 0.8));
};

const getTrackArtists = (track: Track | null) => (track?.artists || []).map((artist) => artist.name).join(", ");

const resolveCoverUrl = (coverUrl: string | null | undefined) => coverUrl || defaults.cover;

const toPosterData = (track: Track): PosterData => ({
  track: {
    title: track?.title || defaults.title,
    artists: getTrackArtists(track) || defaults.artists,
    totalTime: formatTime(track?.durationSeconds),
    currentTime: getElapsedTime(formatTime(track?.durationSeconds)),
  },
  artwork: {
    coverUrl: resolveCoverUrl(track?.coverUrl),
  },
});

const sanitizeFileName = (value: string) =>
  String(value || "poster")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "poster";

const fetchJson = async <T,>(url: string): Promise<T> => {
  const response = await fetch(url);
  if (!response.ok) {
    const error = new Error(`Request failed (${response.status}) for ${url}`);
    console.error("[create] API request failed", {
      url,
      status: response.status,
      statusText: response.statusText,
    });
    throw error;
  }

  return response.json() as Promise<T>;
};

// This component ports the old index.html + poster.js generator flow to React,
// while preserving the same API contract and poster export behavior.
export function CreatePosterClient() {
  const posterRef = useRef<HTMLDivElement | null>(null);

  const [artistQuery, setArtistQuery] = useState("");
  const [songQuery, setSongQuery] = useState("");
  const [artistResults, setArtistResults] = useState<Artist[]>([]);
  const [trackResults, setTrackResults] = useState<Track[]>([]);
  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [theme, setTheme] = useState<PosterTheme>("dark");
  const [showPoster, setShowPoster] = useState(false);
  const [isExporting, setIsExporting] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [posterData, setPosterData] = useState<PosterData>({
    track: {
      title: defaults.title,
      artists: defaults.artists,
      totalTime: defaults.totalTime,
      currentTime: getElapsedTime(defaults.totalTime),
    },
    artwork: { coverUrl: defaults.cover },
  });

  const trackPreviewText = useMemo(() => {
    if (!selectedTrack) return "";
    const artists = getTrackArtists(selectedTrack);
    return artists ? `${selectedTrack.title} — ${artists}` : selectedTrack.title;
  }, [selectedTrack]);

  useEffect(() => {
    const normalizedArtistTerm = normalizeText(artistQuery);
    if (normalizedArtistTerm.length < MIN_QUERY_LENGTH) {
      setArtistResults([]);
      setSelectedArtist(null);
      return;
    }

    let isCancelled = false;
    const timeoutId = window.setTimeout(async () => {
      try {
        const url = `${API_BASE_URL}/api/artists?q=${encodeURIComponent(artistQuery)}`;
        const results = await fetchJson<Artist[]>(url);
        if (isCancelled) return;

        setArtistResults(Array.isArray(results) ? results : []);
        const matchedArtist = (Array.isArray(results) ? results : []).find(
          (artist) => normalizeText(artist.name) === normalizedArtistTerm,
        );
        setSelectedArtist(matchedArtist || null);
        setSearchError(null);
      } catch (error) {
        if (isCancelled) return;
        console.error("[create] Failed to fetch artists", {
          artistQuery,
          apiBaseUrl: API_BASE_URL,
          error,
        });
        setArtistResults([]);
        setSelectedArtist(null);
        setSearchError("Unable to fetch artists right now.");
      }
    }, DEBOUNCE_MS);

    return () => {
      isCancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [artistQuery]);

  useEffect(() => {
    const artistChanged = selectedArtist && normalizeText(selectedArtist.name) !== normalizeText(artistQuery);
    if (artistChanged) {
      setSelectedTrack(null);
    }

    const normalizedSongTerm = normalizeText(songQuery);
    if (normalizedSongTerm.length < MIN_QUERY_LENGTH) {
      setTrackResults([]);
      if (!songQuery) setSelectedTrack(null);
      return;
    }

    let isCancelled = false;
    const timeoutId = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q: songQuery.split("—")[0].trim() });
        if (selectedArtist?.name) {
          params.set("artistName", selectedArtist.name);
        }

        const results = await fetchJson<Track[]>(`${API_BASE_URL}/api/tracks?${params.toString()}`);
        if (isCancelled) return;

        const safeResults = Array.isArray(results) ? results : [];
        setTrackResults(safeResults);

        const selectedSongTerm = normalizeText(songQuery);
        const selectedSongRaw = normalizeText(songQuery.split("—")[0].trim());
        const matchedTrack =
          safeResults.find((track) => {
            const title = normalizeText(track.title);
            const display = normalizeText(`${track.title} — ${getTrackArtists(track)}`);
            return title === selectedSongRaw || display === selectedSongTerm || title === selectedSongTerm;
          }) || null;

        setSelectedTrack(matchedTrack);
        setSearchError(null);
      } catch (error) {
        if (isCancelled) return;
        console.error("[create] Failed to fetch tracks", {
          songQuery,
          artistQuery,
          selectedArtist: selectedArtist?.name || null,
          apiBaseUrl: API_BASE_URL,
          error,
        });
        setTrackResults([]);
        setSelectedTrack(null);
        setSearchError("Unable to fetch tracks right now.");
      }
    }, DEBOUNCE_MS);

    return () => {
      isCancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [songQuery, artistQuery, selectedArtist]);

  const handleGeneratePoster = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedTrack || isGenerating) return;

    setIsGenerating(true);
    await new Promise((resolve) => window.setTimeout(resolve, 3500));
    setPosterData(toPosterData(selectedTrack));
    setShowPoster(true);
    setIsGenerating(false);
  };

  const handleExport = async (width: number) => {
    if (!posterRef.current) return;

    setIsExporting(width);
    try {
      // Migrated from poster.js exportPosterAsJpg: capture poster DOM and resize to target width.
      if (typeof window === "undefined" || typeof window.html2canvas !== "function") return;

      const sourceCanvas = await window.html2canvas(posterRef.current, {
        useCORS: true,
        backgroundColor: theme === "inverse" ? "#f8f6f1" : "#000000",
        scale: Math.max(2, window.devicePixelRatio || 1),
      });

      const requestedWidth = Math.max(1, Math.round(width));
      const sourceAspectRatio = sourceCanvas.height / sourceCanvas.width;
      const outputCanvas = document.createElement("canvas");
      outputCanvas.width = requestedWidth;
      outputCanvas.height = Math.round(requestedWidth * sourceAspectRatio);

      const outputContext = outputCanvas.getContext("2d");
      if (!outputContext) return;

      outputContext.imageSmoothingEnabled = true;
      outputContext.imageSmoothingQuality = "high";
      outputContext.drawImage(sourceCanvas, 0, 0, outputCanvas.width, outputCanvas.height);

      const fileName = `${sanitizeFileName(posterData.track.title)}-poster-${requestedWidth}.jpg`;
      outputCanvas.toBlob(
        (blob) => {
          if (!blob) return;
          const downloadUrl = URL.createObjectURL(blob);
          const linkEl = document.createElement("a");
          linkEl.href = downloadUrl;
          linkEl.download = fileName;
          document.body.append(linkEl);
          linkEl.click();
          linkEl.remove();
          URL.revokeObjectURL(downloadUrl);
        },
        "image/jpeg",
        0.92,
      );
    } finally {
      setIsExporting(null);
    }
  };

  const isInverse = theme === "inverse";

  return (
    <>
      <Script src="https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js" strategy="afterInteractive" />
      <main className="min-h-screen bg-stone-50 text-stone-900">
        <div className="mx-auto max-w-6xl px-6 py-8 md:px-8 md:py-10">
          <header className="flex items-center justify-between rounded-full border border-stone-200 bg-white/90 px-6 py-3">
            <Link href="/" className="text-sm font-semibold tracking-[0.18em] text-stone-700">
              POSTERFLOW
            </Link>
            <Link
              href="/"
              className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 transition hover:bg-stone-100"
            >
              Back Home
            </Link>
          </header>

          <section className="mt-10 grid gap-8 lg:grid-cols-[360px_1fr]">
            <div className="rounded-3xl border border-stone-200 bg-white p-6">
              <h1 className="text-3xl font-semibold tracking-tight">Create your poster</h1>
              <p className="mt-2 text-sm text-stone-600">Search an artist and song, then generate and export.</p>

              <form className="mt-6 space-y-4" onSubmit={handleGeneratePoster}>
                <label className="block text-sm font-semibold text-stone-700">
                  Search by artist
                  <input
                    type="search"
                    value={artistQuery}
                    onChange={(event) => setArtistQuery(event.target.value)}
                    list="artists-suggestions"
                    placeholder="e.g. Bad Bunny"
                    className="mt-2 w-full rounded-xl border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-stone-500"
                  />
                  <datalist id="artists-suggestions">
                    {artistResults.slice(0, 8).map((artist) => (
                      <option key={artist.id} value={artist.name} />
                    ))}
                  </datalist>
                </label>

                <label className="block text-sm font-semibold text-stone-700">
                  Search by song
                  <input
                    type="search"
                    required
                    value={songQuery}
                    onChange={(event) => setSongQuery(event.target.value)}
                    list="tracks-suggestions"
                    placeholder="e.g. Moscow Mule"
                    className="mt-2 w-full rounded-xl border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-stone-500"
                  />
                  <datalist id="tracks-suggestions">
                    {trackResults.slice(0, 8).map((track) => (
                      <option key={track.id} value={`${track.title} — ${getTrackArtists(track)}`} />
                    ))}
                  </datalist>
                </label>

                {selectedTrack ? (
                  <div className="rounded-2xl border border-stone-200 bg-stone-50 p-3">
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={resolveCoverUrl(selectedTrack.coverUrl)}
                        alt={`${selectedTrack.title} cover preview`}
                        className="h-14 w-14 rounded-md object-cover"
                      />
                      <small className="text-xs text-stone-600">{trackPreviewText}</small>
                    </div>
                  </div>
                ) : null}

                <fieldset className="rounded-2xl border border-stone-200 p-4">
                  <legend className="px-2 text-sm font-semibold text-stone-700">Poster color mode</legend>
                  <div className="space-y-2 text-sm text-stone-700">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="poster-theme"
                        checked={theme === "dark"}
                        onChange={() => setTheme("dark")}
                      />
                      Classic (light on dark)
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="poster-theme"
                        checked={theme === "inverse"}
                        onChange={() => setTheme("inverse")}
                      />
                      Elegant (dark on light)
                    </label>
                  </div>
                </fieldset>

                {searchError ? <p className="text-xs text-red-600">{searchError}</p> : null}

                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-stone-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!selectedTrack || isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden />
                      Generating...
                    </>
                  ) : (
                    "Generate poster"
                  )}
                </button>
              </form>
            </div>

            <div>
              <div className="rounded-3xl border border-stone-200 bg-white p-4 shadow-[0_14px_36px_rgba(15,23,42,0.08)]">
                <div className="grid items-start gap-4 md:grid-cols-[minmax(0,390px)_1fr]">
                  <div className="legacy-poster-shell md:justify-self-start">
                    <section
                      ref={posterRef}
                      className={`poster ${isInverse ? "poster-theme-inverse" : ""}`.trim()}
                      aria-label="Music player poster mockup"
                    >
                      <div
                        className="background-layer"
                        aria-hidden="true"
                        style={{
                          backgroundImage: `url(${posterData.artwork.coverUrl})`,
                          ["--cover-image" as string]: `url("${posterData.artwork.coverUrl}")`,
                        }}
                      />

                      <section className="content">
                        <figure className="album-cover-wrap">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={posterData.artwork.coverUrl} alt="Album cover" className="album-cover" />
                        </figure>

                        <section className="player-overlay" aria-label="Player overlay">
                          <div className="wave-row" aria-hidden="true">
                            <div className="wave-bars">
                              {waveHeights.map((height) => (
                                <span key={height} style={{ ["--h" as string]: `${height}px` }} />
                              ))}
                            </div>
                          </div>

                          <div className="title-row">
                            <h2>{posterData.track.title}</h2>
                            <button className="heart" aria-label="Liked song" type="button">
                              ♥
                            </button>
                          </div>

                          <p className="artist-row">
                            <span className="explicit">E</span>
                            <span className="artist-text">{posterData.track.artists}</span>
                          </p>

                          <div className="progress-wrap" aria-hidden="true">
                            <div className="progress-bar">
                              <span className="knob" />
                            </div>
                            <div className="time-row">
                              <span>{posterData.track.currentTime}</span>
                              <span>{posterData.track.totalTime}</span>
                            </div>
                          </div>

                          <div className="controls" aria-label="Playback controls">
                            <button className="icon shuffle" aria-label="Shuffle" type="button" />
                            <button className="icon previous" aria-label="Previous" type="button" />
                            <button className="icon play" aria-label="Play" type="button" />
                            <button className="icon next" aria-label="Next" type="button" />
                            <button className="icon repeat" aria-label="Repeat" type="button" />
                          </div>
                        </section>
                      </section>
                    </section>
                  </div>

                  <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-600">
                    <p className="leading-relaxed">
                      This artwork uses publicly available music metadata and cover references for fan-made, non-commercial
                      creative use only. Please do not use generated posters for commercial sales or trademarked branding.
                    </p>

                    <div className="mt-4 flex flex-wrap gap-3">
                      {[500, 1000].map((width) => (
                        <button
                          key={width}
                          type="button"
                          onClick={() => handleExport(width)}
                          disabled={!showPoster || isExporting !== null}
                          className="rounded-full border border-stone-300 bg-white px-5 py-2 text-sm font-semibold text-stone-800 transition hover:bg-stone-100 disabled:cursor-wait disabled:opacity-60"
                        >
                          {isExporting === width ? "Exporting..." : `Download JPG (${width}px wide)`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
