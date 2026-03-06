(function () {
  const defaults = {
    title: "Viajo Sin Ver (Remix) [feat De La...]",
    artists: "Jon Z, De La Ghetto, Almighty, Miky...",
    tcur: "7:52",
    ttot: "9:29",
    cover: "assets/cover.svg",
  };

  const params = new URLSearchParams(window.location.search);

  const getParam = (key) => {
    const value = params.get(key);
    return value && value.trim() ? value.trim() : defaults[key];
  };

  const isValidTime = (value) => /^\d{1,2}:\d{2}$/.test(value);

  const setupPanelEl = document.getElementById("setup-panel");
  const posterEl = document.getElementById("poster");
  const formEl = document.getElementById("poster-form");
  const titleInputEl = document.getElementById("title-input");
  const artistInputEl = document.getElementById("artist-input");
  const coverInputEl = document.getElementById("cover-input");

  const titleEl = document.getElementById("track-title");
  const artistsEl = document.getElementById("track-artists");
  const currentTimeEl = document.getElementById("time-current");
  const totalTimeEl = document.getElementById("time-total");
  const coverImageEl = document.getElementById("cover-image");
  const backgroundLayerEl = document.getElementById("background-layer");

  const applyPosterValues = (values) => {
    if (!isValidTime(values.tcur)) values.tcur = defaults.tcur;
    if (!isValidTime(values.ttot)) values.ttot = defaults.ttot;

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
    tcur: getParam("tcur"),
    ttot: getParam("ttot"),
    cover: getParam("cover"),
  };

  const hasQueryPosterData = ["title", "artists", "cover"].some((key) => {
    const value = params.get(key);
    return Boolean(value && value.trim());
  });

  if (titleInputEl) titleInputEl.value = initialValues.title;
  if (artistInputEl) artistInputEl.value = initialValues.artists;

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
      tcur: defaults.tcur,
      ttot: defaults.ttot,
      cover: fileUrl,
    };

    applyPosterValues(values);
    showPoster();
  });
})();
