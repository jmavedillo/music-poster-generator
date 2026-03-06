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

  const applyPosterValues = (values) => {
    if (!isValidTime(values.ttot)) values.ttot = defaults.ttot;

    values.tcur = getElapsedTime(values.ttot);

    if (titleEl) titleEl.textContent = values.title;
    if (artistsEl) artistsEl.textContent = values.artists;
    if (currentTimeEl) currentTimeEl.textContent = values.tcur;
    if (totalTimeEl) totalTimeEl.textContent = values.ttot;

    if (coverImageEl) {
      coverImageEl.setAttribute("src", values.cover);
    }

    if (backgroundLayerEl) {
      backgroundLayerEl.style.setProperty("--cover-image", `url("${values.cover}")`);
      backgroundLayerEl.style.backgroundImage = `url("${values.cover}")`;
    }
  };

  const showPoster = () => {
    setupPanelEl?.classList.add("hidden");
    posterEl?.classList.remove("hidden");
  };

  const initialValues = {
    title: getParam("title"),
    artists: getParam("artists"),
    ttot: getParam("ttot"),
    cover: getParam("cover"),
  };

  const hasQueryPosterData = ["title", "artists", "cover"].some((key) => {
    const value = params.get(key);
    return Boolean(value && value.trim());
  });

  if (titleInputEl) titleInputEl.value = initialValues.title;
  if (artistInputEl) artistInputEl.value = initialValues.artists;

  buildDurationOptions(durationMinutesEl, 59);
  buildDurationOptions(durationSecondsEl, 59);

  const initialTotalSeconds = parseTime(initialValues.ttot) ?? parseTime(defaults.ttot);
  if (initialTotalSeconds !== null) {
    if (durationMinutesEl) durationMinutesEl.value = String(Math.floor(initialTotalSeconds / 60));
    if (durationSecondsEl) durationSecondsEl.value = String(initialTotalSeconds % 60);
  }

  applyPosterValues(initialValues);

  if (hasQueryPosterData) {
    showPoster();
  }

  if (!formEl) return;

  formEl.addEventListener("submit", (event) => {
    event.preventDefault();

    const file = coverInputEl?.files?.[0];
    if (!file) return;

    const fileUrl = URL.createObjectURL(file);
    const values = {
      title: titleInputEl?.value?.trim() || defaults.title,
      artists: artistInputEl?.value?.trim() || defaults.artists,
      ttot: formatTime((Number(durationMinutesEl?.value) || 0) * 60 + (Number(durationSecondsEl?.value) || 0)),
      cover: fileUrl,
    };

    applyPosterValues(values);
    showPoster();
  });
})();
