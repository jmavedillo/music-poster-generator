(function () {
  const defaults = {
    title: "Viajo Sin Ver (Remix) [feat De La...]",
    artists: "Jon Z, De La Ghetto, Almighty, Miky...",
    ttot: "9:29",
    cover: "cover1.png",
  };

  const tracksDb = typeof MOCK_TRACKS !== "undefined" && Array.isArray(MOCK_TRACKS) ? MOCK_TRACKS : [];
  const params = new URLSearchParams(window.location.search);

  const normalizeText = (value) =>
    String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

  const clampNumber = (value, min, max) => Math.min(max, Math.max(min, value));

  const formatTime = (totalSeconds) => {
    const safeSeconds = clampNumber(Number(totalSeconds) || 0, 0, 59 * 60 + 59);
    const minutes = Math.floor(safeSeconds / 60);
    const seconds = safeSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  };

  const parseTime = (value) => {
    if (!/^\d{1,2}:\d{2}$/.test(value)) return null;

    const [minutes, seconds] = value.split(":").map(Number);
    if (seconds > 59) return null;

    return minutes * 60 + seconds;
  };

  const getElapsedTime = (totalTime) => {
    const parsedTotal = parseTime(totalTime);
    if (parsedTotal === null) return formatTime(Math.round(0.8 * parseTime(defaults.ttot)));

    return formatTime(Math.round(parsedTotal * 0.8));
  };

  const getTrackArtists = (track) => (track?.artists || []).map((artist) => artist.name).join(", ");

  const resolveCoverUrl = (coverUrl) => {
    if (!coverUrl) return defaults.cover;
    return coverUrl;
  };

  const toPosterData = (track) => ({
    track: {
      title: track?.title || defaults.title,
      artists: getTrackArtists(track) || defaults.artists,
      totalTime: formatTime(track?.durationSeconds),
    },
    artwork: {
      coverUrl: resolveCoverUrl(track?.coverUrl),
    },
  });

  const getParam = (key) => {
    const value = params.get(key);
    return value && value.trim() ? value.trim() : defaults[key];
  };

  const setupPanelEl = document.getElementById("setup-panel");
  const posterEl = document.getElementById("poster");
  const formEl = document.getElementById("poster-form");
  const artistSearchInputEl = document.getElementById("artist-search-input");
  const songSearchInputEl = document.getElementById("song-search-input");
  const artistsSuggestionsEl = document.getElementById("artists-suggestions");
  const tracksSuggestionsEl = document.getElementById("tracks-suggestions");

  const titleEl = document.getElementById("track-title");
  const artistsEl = document.getElementById("track-artists");
  const currentTimeEl = document.getElementById("time-current");
  const totalTimeEl = document.getElementById("time-total");
  const coverImageEl = document.getElementById("cover-image");
  const backgroundLayerEl = document.getElementById("background-layer");

  const normalizePosterData = (posterData) => {
    const totalTime = /^\d{1,2}:\d{2}$/.test(posterData?.track?.totalTime) ? posterData.track.totalTime : defaults.ttot;

    return {
      track: {
        title: posterData?.track?.title?.trim() || defaults.title,
        artists: posterData?.track?.artists?.trim() || defaults.artists,
        currentTime: posterData?.track?.currentTime || getElapsedTime(totalTime),
        totalTime,
      },
      artwork: {
        coverUrl: posterData?.artwork?.coverUrl || defaults.cover,
      },
    };
  };

  const renderPoster = (posterData) => {
    const safePosterData = normalizePosterData(posterData);

    if (titleEl) titleEl.textContent = safePosterData.track.title;
    if (artistsEl) artistsEl.textContent = safePosterData.track.artists;
    if (currentTimeEl) currentTimeEl.textContent = safePosterData.track.currentTime;
    if (totalTimeEl) totalTimeEl.textContent = safePosterData.track.totalTime;

    if (coverImageEl) {
      coverImageEl.setAttribute("src", safePosterData.artwork.coverUrl);
    }

    if (backgroundLayerEl) {
      backgroundLayerEl.style.setProperty("--cover-image", `url("${safePosterData.artwork.coverUrl}")`);
      backgroundLayerEl.style.backgroundImage = `url("${safePosterData.artwork.coverUrl}")`;
    }
  };

  const showPoster = () => {
    setupPanelEl?.classList.add("hidden");
    posterEl?.classList.remove("hidden");
  };

  const getAllArtists = () => {
    const artistsMap = new Map();

    tracksDb.forEach((track) => {
      (track.artists || []).forEach((artist) => {
        if (!artistsMap.has(artist.name)) {
          artistsMap.set(artist.name, artist);
        }
      });
    });

    return Array.from(artistsMap.values());
  };

  const findArtistFromInput = () => {
    const artistTerm = normalizeText(artistSearchInputEl?.value);
    if (artistTerm.length < 3) return null;

    const allArtists = getAllArtists();
    const exactMatch = allArtists.find((artist) => normalizeText(artist.name) === artistTerm);
    if (exactMatch) return exactMatch;

    return allArtists.find((artist) => normalizeText(artist.name).includes(artistTerm)) || null;
  };

  const getTracksBySelectedArtist = () => {
    const selectedArtist = findArtistFromInput();
    if (!selectedArtist) return tracksDb;

    return tracksDb.filter((track) =>
      (track.artists || []).some((artist) => normalizeText(artist.name) === normalizeText(selectedArtist.name))
    );
  };

  const refreshArtistSuggestions = () => {
    if (!artistsSuggestionsEl) return;

    const artistTerm = normalizeText(artistSearchInputEl?.value);
    artistsSuggestionsEl.innerHTML = "";

    if (artistTerm.length < 3) return;

    const allArtists = getAllArtists();
    const matches = allArtists
      .filter((artist) => normalizeText(artist.name).includes(artistTerm))
      .slice(0, 8);

    matches.forEach((artist) => {
      const option = document.createElement("option");
      option.value = artist.name;
      artistsSuggestionsEl.append(option);
    });
  };

  const refreshTrackSuggestions = () => {
    if (!tracksSuggestionsEl) return;

    const songTerm = normalizeText(songSearchInputEl?.value);
    const tracksSource = getTracksBySelectedArtist();
    const matches = tracksSource
      .filter((track) => {
        if (songTerm.length < 2) return true;
        return normalizeText(track.title).includes(songTerm);
      })
      .slice(0, 8);

    tracksSuggestionsEl.innerHTML = "";

    matches.forEach((track) => {
      const option = document.createElement("option");
      option.value = `${track.title} — ${getTrackArtists(track)}`;
      tracksSuggestionsEl.append(option);
    });
  };

  const findTrackFromInputs = () => {
    const artistTerm = normalizeText(artistSearchInputEl?.value);
    const songTerm = normalizeText(songSearchInputEl?.value);
    const songRaw = normalizeText((songSearchInputEl?.value || "").split("—")[0]);
    const tracksSource = getTracksBySelectedArtist();

    return (
      tracksSource.find((track) => {
        const title = normalizeText(track.title);
        const artists = normalizeText(getTrackArtists(track));

        const artistMatches = !artistTerm || artistTerm.length < 3 || artists.includes(artistTerm);
        const songMatches = !songTerm || title.includes(songTerm) || title === songRaw;
        return artistMatches && songMatches;
      }) || null
    );
  };

  const initialPosterData = {
    track: {
      title: getParam("title"),
      artists: getParam("artists"),
      totalTime: getParam("ttot"),
    },
    artwork: {
      coverUrl: getParam("cover"),
    },
  };

  const hasQueryPosterData = ["title", "artists", "cover"].some((key) => {
    const value = params.get(key);
    return Boolean(value && value.trim());
  });

  refreshArtistSuggestions();
  refreshTrackSuggestions();
  renderPoster(initialPosterData);

  if (hasQueryPosterData) {
    showPoster();
  }

  artistSearchInputEl?.addEventListener("input", () => {
    refreshArtistSuggestions();
    refreshTrackSuggestions();
  });
  songSearchInputEl?.addEventListener("input", refreshTrackSuggestions);

  if (!formEl) return;

  formEl.addEventListener("submit", (event) => {
    event.preventDefault();

    const selectedTrack = findTrackFromInputs();
    if (!selectedTrack) return;

    renderPoster(toPosterData(selectedTrack));
    showPoster();
  });
})();
