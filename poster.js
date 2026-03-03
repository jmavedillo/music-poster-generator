// Phase 2: dynamic poster values from URL query params (no backend/API)
(function () {
  const defaults = {
    title: "Viajo Sin Ver (Remix) [feat De La...]",
    artists: "Jon Z, De La Ghetto, Almighty, Miky...",
    ttot: "9:29",
    cover: "assets/cover.jpg",
  };

  const PROGRESS_RATIO = 4 / 5;
  const params = new URLSearchParams(window.location.search);

  const getParam = (key) => {
    const value = params.get(key);
    return value && value.trim() ? value.trim() : defaults[key];
  };

  const parseTimeToSeconds = (value) => {
    if (!/^\d{1,2}:\d{2}$/.test(value)) return null;

    const [minPart, secPart] = value.split(":");
    const minutes = Number(minPart);
    const seconds = Number(secPart);

    if (!Number.isInteger(minutes) || !Number.isInteger(seconds)) return null;
    if (seconds < 0 || seconds > 59) return null;

    return minutes * 60 + seconds;
  };

  const formatSeconds = (totalSeconds) => {
    const safe = Math.max(0, Math.floor(totalSeconds));
    const minutes = Math.floor(safe / 60);
    const seconds = safe % 60;
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  };

  const values = {
    title: getParam("title"),
    artists: getParam("artists"),
    ttot: getParam("ttot"),
    cover: getParam("cover"),
  };

  const totalSeconds = parseTimeToSeconds(values.ttot) ?? parseTimeToSeconds(defaults.ttot);
  const currentSeconds = Math.floor(totalSeconds * PROGRESS_RATIO);
  const currentLabel = formatSeconds(currentSeconds);
  const totalLabel = formatSeconds(totalSeconds);
  const progressPercent = totalSeconds > 0 ? (currentSeconds / totalSeconds) * 100 : PROGRESS_RATIO * 100;

  const titleEl = document.getElementById("track-title");
  const artistsEl = document.getElementById("track-artists");
  const currentTimeEl = document.getElementById("time-current");
  const totalTimeEl = document.getElementById("time-total");
  const coverImageEl = document.getElementById("cover-image");
  const backgroundLayerEl = document.getElementById("background-layer");
  const progressBarEl = document.querySelector(".progress-bar");

  if (titleEl) titleEl.textContent = values.title;
  if (artistsEl) artistsEl.textContent = values.artists;
  if (currentTimeEl) currentTimeEl.textContent = currentLabel;
  if (totalTimeEl) totalTimeEl.textContent = totalLabel;

  if (coverImageEl) {
    coverImageEl.setAttribute("src", values.cover);
  }

  if (backgroundLayerEl) {
    backgroundLayerEl.style.setProperty("--cover-image", `url("${values.cover}")`);
    backgroundLayerEl.style.backgroundImage = `url("${values.cover}")`;
  }

  if (progressBarEl) {
    progressBarEl.style.setProperty("--progress-pct", `${progressPercent}%`);
  }
})();
