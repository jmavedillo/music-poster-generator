// Phase 2: dynamic poster values from URL query params (no backend/API)
(function () {
  const defaults = {
    title: "Viajo Sin Ver (Remix) [feat De La...]",
    artists: "Jon Z, De La Ghetto, Almighty, Miky...",
    tcur: "7:52",
    ttot: "9:29",
    cover: "assets/cover.jpg",
  };

  const params = new URLSearchParams(window.location.search);

  const getParam = (key) => {
    const value = params.get(key);
    return value && value.trim() ? value.trim() : defaults[key];
  };

  const isValidTime = (value) => /^\d{1,2}:\d{2}$/.test(value);

  const values = {
    title: getParam("title"),
    artists: getParam("artists"),
    tcur: getParam("tcur"),
    ttot: getParam("ttot"),
    cover: getParam("cover"),
  };

  if (!isValidTime(values.tcur)) values.tcur = defaults.tcur;
  if (!isValidTime(values.ttot)) values.ttot = defaults.ttot;

  const titleEl = document.getElementById("track-title");
  const artistsEl = document.getElementById("track-artists");
  const currentTimeEl = document.getElementById("time-current");
  const totalTimeEl = document.getElementById("time-total");
  const coverImageEl = document.getElementById("cover-image");
  const backgroundLayerEl = document.getElementById("background-layer");

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
})();
