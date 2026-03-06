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
  const downloadActionsEl = document.getElementById("download-actions");
  const formEl = document.getElementById("poster-form");
  const artistSearchInputEl = document.getElementById("artist-search-input");
  const songSearchInputEl = document.getElementById("song-search-input");
  const artistsSuggestionsEl = document.getElementById("artists-suggestions");
  const tracksSuggestionsEl = document.getElementById("tracks-suggestions");
  const trackPreviewEl = document.getElementById("track-preview");
  const trackPreviewCoverEl = document.getElementById("track-preview-cover");
  const trackPreviewMetaEl = document.getElementById("track-preview-meta");

  const titleEl = document.getElementById("track-title");
  const artistsEl = document.getElementById("track-artists");
  const currentTimeEl = document.getElementById("time-current");
  const totalTimeEl = document.getElementById("time-total");
  const coverImageEl = document.getElementById("cover-image");
  const backgroundLayerEl = document.getElementById("background-layer");

  const sanitizeFileName = (value) =>
    String(value || "poster")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "poster";

  const exportPosterAsJpg = async (width) => {
    if (!posterEl || typeof window.html2canvas !== "function") return;

    const requestedWidth = Math.max(1, Math.round(Number(width) || posterEl.offsetWidth || 500));
    const sourceCanvas = await window.html2canvas(posterEl, {
      useCORS: true,
      backgroundColor: "#000000",
      scale: Math.max(2, window.devicePixelRatio || 1),
    });

    const sourceAspectRatio = sourceCanvas.height / sourceCanvas.width;
    const outputCanvas = document.createElement("canvas");
    outputCanvas.width = requestedWidth;
    outputCanvas.height = Math.round(requestedWidth * sourceAspectRatio);

    const outputContext = outputCanvas.getContext("2d");
    if (!outputContext) return;

    outputContext.imageSmoothingEnabled = true;
    outputContext.imageSmoothingQuality = "high";
    outputContext.drawImage(sourceCanvas, 0, 0, outputCanvas.width, outputCanvas.height);

    const fileBaseName = sanitizeFileName(titleEl?.textContent || "poster");
    const fileName = `${fileBaseName}-poster-${requestedWidth}.jpg`;

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
      0.92
    );
  };

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
    downloadActionsEl?.classList.remove("hidden");
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

  const hideTrackPreview = () => {
    trackPreviewEl?.classList.add("hidden");
  };

  const renderTrackPreview = (track) => {
    if (!track || !trackPreviewEl || !trackPreviewCoverEl || !trackPreviewMetaEl) {
      hideTrackPreview();
      return;
    }

    const artists = getTrackArtists(track);
    trackPreviewCoverEl.setAttribute("src", resolveCoverUrl(track.coverUrl));
    trackPreviewCoverEl.setAttribute("alt", `${track.title} cover preview`);
    trackPreviewMetaEl.textContent = artists ? `${track.title} — ${artists}` : track.title;
    trackPreviewEl.classList.remove("hidden");
  };

  const refreshTrackPreview = () => {
    renderTrackPreview(findTrackFromInputs());
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
  refreshTrackPreview();
  renderPoster(initialPosterData);

  downloadActionsEl?.addEventListener("click", async (event) => {
    const targetButton = event.target instanceof HTMLElement ? event.target.closest("[data-export-width]") : null;
    if (!(targetButton instanceof HTMLButtonElement)) return;

    const width = Number(targetButton.dataset.exportWidth);
    if (!width) return;

    targetButton.disabled = true;
    try {
      await exportPosterAsJpg(width);
    } finally {
      targetButton.disabled = false;
    }
  });

  if (hasQueryPosterData) {
    showPoster();
  }

  artistSearchInputEl?.addEventListener("input", () => {
    refreshArtistSuggestions();
    refreshTrackSuggestions();
    refreshTrackPreview();
  });
  songSearchInputEl?.addEventListener("input", () => {
    refreshTrackSuggestions();
    refreshTrackPreview();
  });

  if (!formEl) return;

  formEl.addEventListener("submit", (event) => {
    event.preventDefault();

    const selectedTrack = findTrackFromInputs();
    if (!selectedTrack) return;

    renderPoster(toPosterData(selectedTrack));
    showPoster();
  });
})();
