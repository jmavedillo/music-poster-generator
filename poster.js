(function () {
  const defaults = {
    title: "Viajo Sin Ver (Remix) [feat De La...]",
    artists: "Jon Z, De La Ghetto, Almighty, Miky...",
    ttot: "9:29",
    cover: "assets/cover.svg",
  };

  const params = new URLSearchParams(window.location.search);

  const getParam = (key) => {
    const value = params.get(key);
    return value && value.trim() ? value.trim() : defaults[key];
  };

  const isValidTime = (value) => /^\d{1,2}:\d{2}$/.test(value);

  const clampNumber = (value, min, max) => Math.min(max, Math.max(min, value));

  const formatTime = (totalSeconds) => {
    const safeSeconds = clampNumber(Number(totalSeconds) || 0, 0, 59 * 60 + 59);
    const minutes = Math.floor(safeSeconds / 60);
    const seconds = safeSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  };

  const parseTime = (value) => {
    if (!isValidTime(value)) return null;

    const [minutes, seconds] = value.split(":").map(Number);
    if (seconds > 59) return null;

    return minutes * 60 + seconds;
  };

  const buildDurationOptions = (selectEl, maxValue) => {
    if (!selectEl) return;

    selectEl.innerHTML = "";

    for (let i = 0; i <= maxValue; i += 1) {
      const option = document.createElement("option");
      option.value = String(i);
      option.textContent = String(i).padStart(2, "0");
      selectEl.append(option);
    }
  };

  const getElapsedTime = (totalTime) => {
    const parsedTotal = parseTime(totalTime);
    if (parsedTotal === null) return formatTime(Math.round(0.8 * parseTime(defaults.ttot)));

    return formatTime(Math.round(parsedTotal * 0.8));
  };

  const setupPanelEl = document.getElementById("setup-panel");
  const posterEl = document.getElementById("poster");
  const formEl = document.getElementById("poster-form");
  const titleInputEl = document.getElementById("title-input");
  const artistInputEl = document.getElementById("artist-input");
  const coverInputEl = document.getElementById("cover-input");
  const durationMinutesEl = document.getElementById("duration-minutes");
  const durationSecondsEl = document.getElementById("duration-seconds");

  const titleEl = document.getElementById("track-title");
  const artistsEl = document.getElementById("track-artists");
  const currentTimeEl = document.getElementById("time-current");
  const totalTimeEl = document.getElementById("time-total");
  const coverImageEl = document.getElementById("cover-image");
  const backgroundLayerEl = document.getElementById("background-layer");

  const normalizePosterData = (posterData) => {
    const totalTime = isValidTime(posterData?.track?.totalTime) ? posterData.track.totalTime : defaults.ttot;

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

  if (titleInputEl) titleInputEl.value = initialPosterData.track.title;
  if (artistInputEl) artistInputEl.value = initialPosterData.track.artists;

  buildDurationOptions(durationMinutesEl, 59);
  buildDurationOptions(durationSecondsEl, 59);

  const initialTotalSeconds = parseTime(initialPosterData.track.totalTime) ?? parseTime(defaults.ttot);
  if (initialTotalSeconds !== null) {
    if (durationMinutesEl) durationMinutesEl.value = String(Math.floor(initialTotalSeconds / 60));
    if (durationSecondsEl) durationSecondsEl.value = String(initialTotalSeconds % 60);
  }

  renderPoster(initialPosterData);

  if (hasQueryPosterData) {
    showPoster();
  }

  if (!formEl) return;

  formEl.addEventListener("submit", (event) => {
    event.preventDefault();

    const file = coverInputEl?.files?.[0];
    if (!file) return;

    const fileUrl = URL.createObjectURL(file);
    const posterData = {
      track: {
        title: titleInputEl?.value || "",
        artists: artistInputEl?.value || "",
        totalTime: formatTime((Number(durationMinutesEl?.value) || 0) * 60 + (Number(durationSecondsEl?.value) || 0)),
      },
      artwork: {
        coverUrl: fileUrl,
      },
    };

    renderPoster(posterData);
    showPoster();
  });
})();
