document.addEventListener("DOMContentLoaded", function () {
  initMobileDrawer();

  // Dark mode toggle. The actual theme is applied earlier by an inline
  // script in <head> (see templates/base.html) so there's no flash of
  // the wrong theme on load -- this just wires up the button(s) and
  // keeps localStorage in sync with clicks. There are two of these now
  // (header, for desktop; drawer footer, for mobile) so every instance
  // updates together rather than assuming there's only one on the page.
  var themeBtns = Array.prototype.slice.call(document.querySelectorAll(".theme-toggle"));
  if (themeBtns.length) {
    var setLabel = function () {
      var isDark = document.documentElement.getAttribute("data-theme") === "dark";
      var label = isDark ? (window.WB_THEME_LABELS ? window.WB_THEME_LABELS.light : "Light mode") : (window.WB_THEME_LABELS ? window.WB_THEME_LABELS.dark : "Dark mode");
      themeBtns.forEach(function (btn) {
        btn.setAttribute("aria-checked", isDark ? "true" : "false");
        btn.setAttribute("aria-label", label);
      });
    };
    setLabel();
    themeBtns.forEach(function (themeBtn) {
      themeBtn.addEventListener("click", function () {
        var current = document.documentElement.getAttribute("data-theme");
        var next = current === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", next);
        try { localStorage.setItem("wattbench-theme", next); } catch (e) {}
        setLabel();
      });
    });
  }

  // ---- Categories dropdown: the toggle is now a real link to the
  // All Reviews page, so clicking it always goes somewhere. The submenu
  // itself only needs to appear on hover (desktop) -- pure CSS, no JS.

  // ---- Site search ----
  initSiteSearch();

  // ---- All-reviews filter/sort/lazy-load ----
  initReviewsFilter();

  // ---- Product photo gallery (review pages with more than one photo) ----
  initProductGallery();
  initRubricExplainerTabs();
  initRubricAccordion();
  initMobileRubricPlacement();
  initRecentStacks();
  initCategoryTabs();
  initProductFinder();

  // ---- Comparison table pagination ----
  initTablePagination();

  // ---- Language memory ----
  // Remember an explicit language choice so returning visitors land on
  // their preferred language automatically, without ever silently
  // redirecting a first-time visitor or someone who followed a specific
  // link/search result on purpose (see main.js comments below).
  initLanguageMemory();
});

// ---- Mobile slide-out drawer ----
// App-style pattern: hamburger (far left of the header, before the logo)
// opens a fixed full-height panel that slides in from the left over a
// fading backdrop, replacing the old in-place collapsing dropdown. Closes
// on: backdrop click, the drawer's own close button, Escape, clicking any
// link inside it (so it doesn't stay open behind a page navigation on the
// live site), or the viewport growing past the desktop breakpoint while
// it happens to be open.
function initMobileDrawer() {
  var toggle = document.querySelector(".nav-toggle");
  var drawer = document.getElementById("mobile-drawer");
  var backdrop = document.getElementById("menu-backdrop");
  var closeBtn = document.getElementById("drawer-close");
  if (!toggle || !drawer || !backdrop) return;

  function isOpen() { return drawer.classList.contains("is-open"); }

  function openDrawer() {
    drawer.classList.add("is-open");
    backdrop.classList.add("is-open");
    drawer.setAttribute("aria-hidden", "false");
    toggle.setAttribute("aria-expanded", "true");
    document.body.classList.add("drawer-open");
  }
  function closeDrawer() {
    drawer.classList.remove("is-open");
    backdrop.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
    toggle.setAttribute("aria-expanded", "false");
    document.body.classList.remove("drawer-open");
  }

  toggle.addEventListener("click", function () {
    if (isOpen()) closeDrawer(); else openDrawer();
  });
  backdrop.addEventListener("click", closeDrawer);
  if (closeBtn) closeBtn.addEventListener("click", closeDrawer);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && isOpen()) closeDrawer();
  });
  drawer.querySelectorAll("a").forEach(function (a) {
    a.addEventListener("click", closeDrawer);
  });
  var desktopMq = window.matchMedia("(min-width: 1041px)");
  desktopMq.addEventListener("change", function (e) {
    if (e.matches && isOpen()) closeDrawer();
  });
}

function initLanguageMemory() {
  if (!window.WB_LOCALE || !window.WB_ALT_LINKS) return;

  var STORAGE_KEY = "wattbench-lang";
  var BANNER_TEXT = {
    en: { suggest: "This site is also available in English.", action: "Switch to English" },
    de: { suggest: "Diese Seite ist auch auf Deutsch verf\u00fcgbar.", action: "Zu Deutsch wechseln" }
  };

  // Remember explicit choices made via the header language switcher.
  document.querySelectorAll(".lang-link").forEach(function (link) {
    link.addEventListener("click", function () {
      try { localStorage.setItem(STORAGE_KEY, link.getAttribute("data-lang")); } catch (e) {}
    });
  });

  var stored = null;
  try { stored = localStorage.getItem(STORAGE_KEY); } catch (e) {}

  var isHomepage = window.location.pathname.replace(/\/(en|es|de)\//, "/").match(/\/(index\.html)?$/);

  if (stored && stored !== window.WB_LOCALE && window.WB_ALT_LINKS[stored]) {
    if (isHomepage) {
      // Returning visitor landing on the homepage -- take them straight
      // to their remembered language, no prompt needed.
      window.location.replace(window.WB_ALT_LINKS[stored]);
      return;
    }
    showLanguageBanner(stored, BANNER_TEXT[stored]);
    return;
  }

  if (!stored) {
    // First-time visitor: suggest based on browser language, but never
    // auto-redirect -- they may have landed here via a specific link.
    var browserLang = (navigator.language || "").slice(0, 2).toLowerCase();
    if (browserLang && browserLang !== window.WB_LOCALE && window.WB_ALT_LINKS[browserLang] && BANNER_TEXT[browserLang]) {
      showLanguageBanner(browserLang, BANNER_TEXT[browserLang]);
    }
  }
}

function showLanguageBanner(langCode, text) {
  if (!text) return;
  var bar = document.createElement("div");
  bar.className = "lang-banner";
  bar.innerHTML =
    '<span>' + text.suggest + '</span>' +
    '<a href="' + window.WB_ALT_LINKS[langCode] + '" class="lang-banner-action" data-lang="' + langCode + '">' + text.action + '</a>' +
    '<button type="button" class="lang-banner-close" aria-label="Dismiss">\u00d7</button>';

  bar.querySelector(".lang-banner-action").addEventListener("click", function () {
    try { localStorage.setItem("wattbench-lang", langCode); } catch (e) {}
  });
  bar.querySelector(".lang-banner-close").addEventListener("click", function () {
    try { localStorage.setItem("wattbench-lang", window.WB_LOCALE); } catch (e) {}
    bar.remove();
  });

  var header = document.querySelector(".site-header");
  header.insertAdjacentElement("afterend", bar);
}

function initSiteSearch() {
  var input = document.querySelector(".site-search-input");
  if (!input) return;
  var resultsBox = document.querySelector(".site-search-results");
  var button = document.querySelector(".site-search-btn");
  var chip = document.getElementById("search-cat-chip");
  var chipLabel = chip ? chip.querySelector(".chip-label") : null;
  var chipRemove = chip ? chip.querySelector(".chip-remove") : null;
  var categories = window.WB_CATEGORIES || []; // tiny (one row per category) -- stays inline, no reason to fetch this separately
  var activeCategory = null; // the locked chip, if any -- {id, label, accent, icon}

  var VISIBLE_ROWS = 5;
  var RENDER_CAP = 20; // plenty for this catalog size; scroll handles the rest
  var MIN_QUERY_LENGTH = 2;

  // The full product index used to be embedded inline in EVERY page's
  // HTML (window.WB_SEARCH_INDEX) -- meaning every visitor downloaded
  // the whole catalog's search data on every single page load, whether
  // they ever touched search or not, and that payload only grows as the
  // catalog does. Fetched lazily now instead -- on first focus, not on
  // page load -- same principle as the /reviews/ hub's search. One real
  // trade-off, not a bug if you see it: fetch() is blocked under
  // file://, so this specifically no longer works opening a page
  // straight from disk. Only works served over real HTTP -- tools/
  // start.py's local server, or the live deployed site.
  var searchData = null;
  var indexPromise = null;
  function loadIndex() {
    if (indexPromise) return indexPromise;
    indexPromise = fetch(window.WB_ROOT + "search-index.json")
      .then(function (r) { return r.json(); })
      .then(function (data) { searchData = data; return data; })
      .catch(function () { searchData = []; return searchData; });
    return indexPromise;
  }

  var CAT_ICONS = {
    bolt: '<path d="M13 2 4 14h6l-1 8 9-12h-6z"></path>',
    battery: '<rect x="2" y="7" width="18" height="10" rx="2"></rect><line x1="22" y1="11" x2="22" y2="13"></line>',
    plug: '<path d="M9 2v4M15 2v4M6 8h12l-1 6a5 5 0 0 1-10 0z"></path><path d="M12 18v4"></path>'
  };
  function iconSvg(name, strokeFill) {
    var body = CAT_ICONS[name] || "";
    var attrs = strokeFill === "fill" ? 'fill="currentColor"' : 'fill="none" stroke="currentColor" stroke-width="2"';
    return '<svg viewBox="0 0 24 24" width="15" height="15" ' + attrs + '>' + body + '</svg>';
  }

  // The button and Enter key both "submit" the search -- they take you to
  // the reviews page with the same filter(s) applied, rather than just
  // re-displaying the same dropdown that's already open. Clicking an
  // individual row in the dropdown is still the fast path straight to one
  // product; this is the "show me everything that matches" path.
  function goToResults() {
    var params = [];
    if (activeCategory) params.push("category=" + encodeURIComponent(activeCategory.id));
    var q = input.value.trim();
    if (q) params.push("q=" + encodeURIComponent(q));
    if (!params.length) return;
    window.location.href = window.WB_ROOT + "reviews/index.html?" + params.join("&");
  }

  function ratingBadge(rating) {
    if (rating === undefined || rating === null) return "";
    return '<span class="search-rating-badge">\u2605 ' + rating + '</span>';
  }

  // The chip is a locked filter, not editable text -- picking a category
  // narrows the dataset, and whatever the visitor types after that searches
  // only inside that narrowed set. Removing the chip (the X) is the only
  // way back out, same as a filter tag in any faceted-search UI.
  function setActiveCategory(cat) {
    activeCategory = cat;
    if (!chip) return;
    chipLabel.textContent = cat.label;
    chip.style.setProperty("--chip-accent", cat.accent);
    chip.hidden = false;
    var filteredTemplate = window.WB_SEARCH_PLACEHOLDER_FILTERED || "Search within {category}...";
    input.placeholder = filteredTemplate.replace("{category}", cat.label);
  }
  function clearActiveCategory() {
    activeCategory = null;
    if (!chip) return;
    chip.hidden = true;
    input.placeholder = window.WB_SEARCH_PLACEHOLDER_DEFAULT || input.placeholder;
  }
  if (chipRemove) {
    chipRemove.addEventListener("click", function () {
      clearActiveCategory();
      input.value = "";
      input.focus();
      renderSuggested();
    });
  }

  // Default state (nothing typed, no category chip): surface the 3
  // categories rather than a generic "recent searches" list, since that's
  // the whole shape of this catalog -- picking a category is almost
  // always the first real move a visitor makes here. Doesn't need
  // searchData at all -- categories (WB_CATEGORIES) are already available,
  // so this renders instantly regardless of whether the index fetch below
  // has landed yet.
  function renderSuggested() {
    if (!categories.length) { resultsBox.classList.remove("open"); return; }
    var heading = '<div class="site-search-heading">' + (window.WB_SEARCH_SUGGESTED || "Suggested Categories") + '</div>';
    var rows = categories.map(function (cat) {
      return '<button type="button" class="site-search-result site-search-suggested-row" data-cat-id="' + cat.id + '" style="--row-accent:' + cat.accent + ';">' +
        '<span class="search-cat-icon" style="color:' + cat.accent + ';">' + iconSvg(cat.icon, cat.icon === "bolt" ? "fill" : "stroke") + '</span>' +
        '<span class="r-title">' + cat.label + '</span>' +
        '</button>';
    }).join("");
    resultsBox.innerHTML = '<div class="site-search-list">' + heading + rows + '</div>';
    resultsBox.classList.add("open");

    // Clicking a suggested category locks it in as a chip and immediately
    // shows every product in that category -- the input stays empty and
    // editable for narrowing further (e.g. typing "anker"), rather than
    // the category name itself becoming editable text.
    resultsBox.querySelectorAll(".site-search-suggested-row").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var cat = categories.filter(function (c) { return c.id === btn.getAttribute("data-cat-id"); })[0];
        if (!cat) return;
        setActiveCategory(cat);
        input.value = "";
        input.focus();
        runSearch("");
      });
    });
  }

  function render(items, query) {
    if (!items.length) {
      resultsBox.innerHTML = '<div class="site-search-empty">' + (window.WB_SEARCH_NO_RESULTS || "No results found.") + '</div>';
      resultsBox.classList.add("open");
      return;
    }
    var countHeading = '<div class="site-search-heading">' +
      (window.WB_SEARCH_RESULTS_COUNT || "{count} results").replace("{count}", items.length) +
      '</div>';
    var listHtml = countHeading + items.slice(0, RENDER_CAP).map(function (item) {
      var url = window.WB_ROOT + item.url;
      var accentStyle = item.accent ? ' style="--row-accent:' + item.accent + ';"' : "";
      return '<a class="site-search-result" href="' + url + '"' + accentStyle + '>' +
        '<span class="search-result-text">' +
        '<span class="r-title">' + item.title + '</span>' +
        '<span class="r-subtitle">' + item.subtitle + '</span>' +
        '</span>' +
        ratingBadge(item.rating) +
        '</a>';
    }).join("");
    var html = '<div class="site-search-list">' + listHtml + '</div>';
    // "View all" only makes sense when it points somewhere that actually
    // applies the same filter -- reviews/index.html supports filtering by
    // category, not by arbitrary search text, so a plain-text search (no
    // category chip) has nowhere accurate to send people. RENDER_CAP is
    // already generous enough that everything fits in the scrollable list
    // anyway, so nothing is actually lost by not showing that link here.
    if (activeCategory && items.length > VISIBLE_ROWS) {
      var viewAllText = (window.WB_SEARCH_VIEW_ALL || 'View all {count} matches for "{query}" \u2192')
        .replace("{count}", items.length).replace("{query}", query || activeCategory.label);
      html += '<a class="site-search-viewall" href="' + window.WB_ROOT + activeCategory.url + '">' + viewAllText + '</a>';
    }
    resultsBox.innerHTML = html;
    resultsBox.classList.add("open");
  }

  function runSearch(rawQuery) {
    var query = rawQuery.trim().toLowerCase();

    // With no category chip locked in, an empty or too-short query falls
    // back to the category suggestions -- that guard doesn't apply once a
    // category is already locked, since the pool to search is already
    // small and an empty query there just means "show the whole category".
    if (!activeCategory && query.length < MIN_QUERY_LENGTH) { renderSuggested(); return; }

    // Waits on the lazy-loaded index rather than reading an already-
    // embedded global -- in practice this resolves near-instantly for
    // anyone who actually types something, since loadIndex() already
    // started on focus, well before the debounced keystroke gets here.
    loadIndex().then(function (data) {
      var pool = activeCategory
        ? data.filter(function (item) { return item.subtitle === activeCategory.label; })
        : data;

      var matches = query
        ? pool.filter(function (item) {
            return item.title.toLowerCase().indexOf(query) !== -1 || item.subtitle.toLowerCase().indexOf(query) !== -1;
          })
        : pool;

      // rank matches where the title starts with the query above ones where
      // the query just appears somewhere -- otherwise "anker" with a dozen
      // Anker products returns an arbitrary-looking order
      if (query) {
        matches.sort(function (a, b) {
          var aStarts = a.title.toLowerCase().indexOf(query) === 0 ? 0 : 1;
          var bStarts = b.title.toLowerCase().indexOf(query) === 0 ? 0 : 1;
          if (aStarts !== bStarts) return aStarts - bStarts;
          return a.title.localeCompare(b.title);
        });
      } else {
        matches.sort(function (a, b) { return a.title.localeCompare(b.title); });
      }
      render(matches, query);
    });
  }

  var debounceTimer = null;
  input.addEventListener("input", function () {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function () { runSearch(input.value); }, 100);
  });

  input.addEventListener("focus", function () {
    loadIndex(); // start the fetch now, so it's ready (or close to it) by the time typing or a category click actually needs it
    if (input.value.trim() || activeCategory) runSearch(input.value);
    else renderSuggested();
  });

  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault(); // stop the native form submit -- goToResults() below handles navigation, and also carries the category chip state a plain submit can't
      goToResults();
    } else if (e.key === "Backspace" && !input.value && activeCategory) {
      // Backspacing from an empty box is the natural way to "delete" the
      // chip too, same as removing a tag in a chip-based filter UI.
      clearActiveCategory();
      renderSuggested();
    }
  });

  if (button) {
    button.addEventListener("click", function (e) {
      e.preventDefault(); // see the matching comment on the Enter-key handler above
      goToResults();
    });
  }

  document.addEventListener("click", function (e) {
    if (!e.target.closest(".hero-search")) resultsBox.classList.remove("open");
  });
}

function initReviewsFilter() {
  var grid = document.getElementById("review-grid");
  if (!grid) return; // not on the all-reviews page

  var catalogGrid = document.getElementById("catalog-results-grid");
  var paginationEl = document.getElementById("review-pagination");
  var cards = Array.prototype.slice.call(grid.querySelectorAll(".review-card"));
  var pills = Array.prototype.slice.call(document.querySelectorAll(".filter-pill"));
  var sortSelect = document.getElementById("review-sort");
  var countLabel = document.querySelector(".review-count");
  var emptyMsg = document.querySelector(".review-empty");
  var strings = window.WB_REVIEWS_STRINGS || { showingCount: "Showing {shown} of {total}", noMatches: "No matches." };

  // "all" shows this page's own server-rendered cards (real pagination,
  // nothing to fetch). Any specific category filters the WHOLE catalog
  // via the lazily-fetched index below, not just whatever happens to be
  // on this one page -- a visitor picking "Chargers" expects every
  // charger, not just the ones that landed on this particular page by
  // chance of sort order. Sort still applies either way, just against
  // whichever set is currently showing.
  var state = { category: "all", sort: "recent", catalogPage: 1 };

  var BADGE_LABELS = {
    top_rated: window.WB_TOP_RATED_LABEL, best_value: window.WB_BEST_VALUE_LABEL,
    fastest_charge: window.WB_FASTEST_CHARGE_LABEL, highest_output: window.WB_HIGHEST_OUTPUT_LABEL,
    lightest: window.WB_LIGHTEST_LABEL,
  };

  function sortFn(a, b) {
    var av = a.dataset, bv = b.dataset;
    switch (state.sort) {
      case "price-low": return parseFloat(av.price) - parseFloat(bv.price);
      case "price-high": return parseFloat(bv.price) - parseFloat(av.price);
      case "rating": return parseFloat(bv.rating) - parseFloat(av.rating);
      case "recent":
      default: return av.date < bv.date ? 1 : -1;
    }
  }

  function showPageView() {
    catalogGrid.hidden = true;
    grid.hidden = false;
    if (paginationEl) paginationEl.hidden = false;

    var sorted = cards.slice().sort(sortFn);
    sorted.forEach(function (c) { grid.appendChild(c); }); // reorder DOM to match sort order

    if (countLabel) {
      var pageTotal = (typeof window.WB_TOTAL_REVIEWS === "number") ? window.WB_TOTAL_REVIEWS : cards.length;
      countLabel.textContent = strings.showingCount.replace("{shown}", cards.length).replace("{total}", pageTotal);
    }
    if (emptyMsg) emptyMsg.hidden = true; // "all" on a real page always has at least one card, or the page wouldn't exist
  }

  // ---- catalog-wide index (shared by category filtering and search --
  // one fetch covers both, so a visitor who filters by category and
  // then searches, or vice versa, only ever pays for the request once) ----
  var catalogIndex = null;
  var indexPromise = null;

  function loadCatalogIndex() {
    if (indexPromise) return indexPromise;
    indexPromise = fetch(window.WB_ROOT + "reviews-catalog.json")
      .then(function (r) { return r.json(); })
      .then(function (data) { catalogIndex = data; return data; })
      .catch(function () { catalogIndex = []; return catalogIndex; });
    return indexPromise;
  }

  function catalogSortFn(a, b) {
    switch (state.sort) {
      case "price-low": return (a.price_eur || 0) - (b.price_eur || 0);
      case "price-high": return (b.price_eur || 0) - (a.price_eur || 0);
      case "rating": return (b.rating || 0) - (a.rating || 0);
      case "recent":
      default: return (a.date_added || "") < (b.date_added || "") ? 1 : -1;
    }
  }

  // Deliberately simpler than the server-rendered cards -- no buy
  // buttons (replicating brand_affiliate_url()'s Awin/locale logic
  // client-side isn't worth it for a card whose whole job is "click
  // through to the real review page," where those buttons already are).
  function renderCatalogCard(item) {
    var photoInner = item.image
      ? '<img src="' + window.WB_ROOT + item.image + '" alt="' + item.brand + ' ' + item.model + '" loading="lazy">'
      : '<span class="bolt-mark">\u26A1</span>' + item.brand + ' ' + item.model;
    var photoClass = "product-photo" + (item.image ? "" : " placeholder");
    var badgeHtml = "";
    if (item.primary_badge && BADGE_LABELS[item.primary_badge]) {
      badgeHtml = '<div class="product-badge-pill"><span class="badge-icon">' + (item.primary_badge_emoji || "") + '</span><span>' + BADGE_LABELS[item.primary_badge] + '</span></div>';
    }
    var specs = [];
    if (item.capacity_wh) specs.push('<span><strong>' + item.capacity_wh.toLocaleString() + '</strong> Wh</span>');
    if (item.capacity_mah) specs.push('<span><strong>' + item.capacity_mah.toLocaleString() + '</strong> mAh</span>');
    if (item.total_output_w) specs.push('<span><strong>' + item.total_output_w.toLocaleString() + '</strong> W</span>');
    if (item.weight_display) specs.push('<span><strong>' + item.weight_display + '</strong></span>');

    // Bonus-point indicator ("+0.5", "+1", or their sum "+1.5" when a
    // product qualifies for both) -- see "Bonus points" in the Rating
    // engine section of README.md. || 0 fallbacks mean this quietly
    // shows nothing rather than "+NaN" if build.py hasn't been updated
    // to include these two fields in reviews-catalog.json yet. Now
    // appended to the score inside .rubric-total-line (below), not the
    // h3 -- matches where it moved to server-side.
    var bonusSum = (item.portability_bonus || 0) + (item.rugged_bonus || 0) + (item.ups_bonus || 0);
    var bonusHtml = bonusSum > 0 ? ' <span class="bonus-indicator">(+' + bonusSum + ')</span>' : "";

    // Matches .rubric-total-line's exact markup from _macros.html /
    // review.html's sidebar -- same classes, same three-part
    // label/stars/score layout -- so this reads identically wherever
    // it appears, not a separate one-off format invented for just this
    // card. Star string computed inline rather than calling the
    // starString() helper elsewhere in this file -- that helper is
    // local to initProductFinder()'s own closure, a separate top-level
    // function from initReviewsFilter() (which contains this
    // function), so it was never actually reachable here despite
    // looking like it should be via ordinary hoisting -- confirmed by
    // an actual "starString is not defined" runtime error when this
    // was first tried as a direct call.
    var starFilled = Math.max(0, Math.min(5, Math.round(item.rating)));
    var starStr = "\u2605".repeat(starFilled) + "\u2606".repeat(5 - starFilled);
    var totalLineHtml = '<div class="rubric-total-line">' +
      '<span class="rubric-total-label">' + (window.WB_RUBRIC_TOTAL_LABEL || "Overall Score") + '</span>' +
      '<span class="rubric-total-stars">' + starStr + '</span>' +
      '<span class="rubric-total-score">' + item.rating + '/5' + bonusHtml + '</span>' +
      '</div>';

    // Score breakdown bars, matching product_rubric_viz() in
    // _macros.html (used server-side for this same card elsewhere) --
    // reimplemented here since a client-side render can't call a Jinja
    // macro. Only renders (bars + the total-line above) if all five
    // sub-scores are actually present on this item; falls back to the
    // plain summary text otherwise, same graceful-degradation pattern
    // as WB_TOTAL_REVIEWS elsewhere in this file, rather than
    // rendering broken/undefined bars if reviews-catalog.json doesn't
    // carry these fields yet.
    var RUBRIC_ROWS = [
      ["value", window.WB_RUBRIC_VALUE_LABEL],
      ["power", window.WB_RUBRIC_POWER_LABEL],
      ["portability", window.WB_RUBRIC_PORTABILITY_LABEL],
      ["charge_speed", item.category === "chargers" ? window.WB_RUBRIC_EFFICIENCY_LABEL : window.WB_RUBRIC_CHARGE_SPEED_LABEL],
      ["reliability", window.WB_RUBRIC_RELIABILITY_LABEL],
    ];
    var hasAllScores = RUBRIC_ROWS.every(function (row) { return typeof item[row[0]] === "number"; });
    var middleBlockHtml;
    if (hasAllScores) {
      middleBlockHtml = '<div class="card-rubric-block"><div class="rubric-viz">' +
        RUBRIC_ROWS.map(function (row) {
          var key = row[0], label = row[1] || key;
          var score = item[key];
          var pct = Math.round((score / 5) * 100);
          return '<div class="rubric-bar-row">' +
            '<span class="rubric-bar-label">' + label + '</span>' +
            '<div class="rubric-bar-track"><div class="rubric-bar-fill" style="width:' + pct + '%"></div></div>' +
            '<span class="rubric-bar-pct">' + score + '/5</span>' +
            '</div>';
        }).join("") +
        '</div>' + totalLineHtml + '</div>';
    } else {
      middleBlockHtml = item.summary ? '<p class="desc desc-fade">' + item.summary + '</p>' : "";
    }

    // Buy buttons -- only if build.py has already resolved these URLs
    // server-side into reviews-catalog.json (item.amazon_url,
    // item.brand_buy_url with a brand_buy_label for the button text,
    // plus item.amazon_unavailable/item.awin_unavailable for muting).
    // Deliberately not replicating brand_affiliate_url()'s Awin
    // merchant-ID/publisher-ID lookup logic client-side -- that's real
    // business logic that belongs in one place (build.py), not
    // duplicated and kept in sync by hand in two languages. Omitted
    // entirely, gracefully, if those fields aren't present yet, same
    // pattern as the rubric bars above.
    var buyButtonsHtml = "";
    if (item.amazon_url || item.brand_buy_url) {
      var amazonBtnHtml = "";
      if (item.amazon_url) {
        amazonBtnHtml = item.amazon_unavailable
          ? '<span class="card-buy-btn card-buy-btn-muted" aria-disabled="true">' + (window.WB_CURRENTLY_UNAVAILABLE_LABEL || "Currently not available") + '</span>'
          : '<a href="' + item.amazon_url + '" class="card-buy-btn" rel="sponsored nofollow noopener" target="_blank">' + (window.WB_BUY_AMAZON_LABEL || "Amazon.de Price Check") + '</a>';
      }
      var brandBtnHtml = "";
      if (item.brand_buy_url) {
        brandBtnHtml = item.awin_unavailable
          ? '<span class="card-buy-btn card-buy-btn-alt card-buy-btn-muted" aria-disabled="true">' + (window.WB_CURRENTLY_UNAVAILABLE_LABEL || "Currently not available") + '</span>'
          : '<a href="' + item.brand_buy_url + '" class="card-buy-btn card-buy-btn-alt" rel="sponsored nofollow noopener" target="_blank">' + (item.brand_buy_label || (item.brand + " Store")) + '</a>';
      }
      buyButtonsHtml = '<div class="card-buy-row">' + amazonBtnHtml + brandBtnHtml + '</div>';
    }

    // Price + buy buttons move together as one pinned-to-bottom unit
    // now -- .card-footer, margin-top:auto in CSS -- matching the same
    // restructure the server-rendered card just went through (price
    // used to sit inside .card-content, the growing/flexible part).
    var priceHtml = '<span class="price">~\u20AC' + (item.price_eur != null ? item.price_eur.toLocaleString() : "") + ' <span class="price-est">(' + (window.WB_EST_LABEL || "Est.") + ')</span></span>';
    var footerHtml = '<div class="card-footer">' + priceHtml + buyButtonsHtml + '</div>';

    return '<div class="card review-card" style="--cat-accent:' + (item.accent || "") + ';">' +
      '<div class="card-content">' +
      '<a href="' + window.WB_ROOT + item.url + '" class="card-photo-link">' +
      '<div class="' + photoClass + '">' + badgeHtml + photoInner + '</div>' +
      '</a>' +
      '<span class="brand">' + item.brand + '</span>' +
      '<h3>' + item.model + '</h3>' +
      '<div class="specrow">' + specs.join("") + '</div>' +
      middleBlockHtml +
      '</div>' + footerHtml + '</div>';
  }

  // Matches REVIEWS_PER_PAGE in build.py -- same page size client-side so
  // the catalog-wide view paginates the same way the server-rendered one
  // does, rather than dumping every match into one unpaginated page.
  var CATALOG_PAGE_SIZE = 12;

  function renderCatalogPagination(totalItems, currentPage) {
    var nav = document.getElementById("catalog-pagination");
    if (!nav) return;
    var totalPages = Math.ceil(totalItems / CATALOG_PAGE_SIZE);
    if (totalPages <= 1) { nav.hidden = true; nav.innerHTML = ""; return; }

    var html = "";
    html += currentPage > 1
      ? '<button type="button" class="wb-page-btn wb-page-arrow" data-catalog-page="' + (currentPage - 1) + '" aria-label="Previous">\u2039</button>'
      : '<span class="wb-page-btn wb-page-arrow" aria-disabled="true">\u2039</span>';
    for (var i = 1; i <= totalPages; i++) {
      html += i === currentPage
        ? '<span class="wb-page-btn active" aria-current="page">' + i + "</span>"
        : '<button type="button" class="wb-page-btn" data-catalog-page="' + i + '">' + i + "</button>";
    }
    html += currentPage < totalPages
      ? '<button type="button" class="wb-page-btn wb-page-arrow" data-catalog-page="' + (currentPage + 1) + '" aria-label="Next">\u203A</button>'
      : '<span class="wb-page-btn wb-page-arrow" aria-disabled="true">\u203A</span>';
    nav.innerHTML = html;
    nav.hidden = false;

    Array.prototype.slice.call(nav.querySelectorAll("[data-catalog-page]")).forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.catalogPage = parseInt(btn.getAttribute("data-catalog-page"), 10);
        showCatalogView();
        nav.closest("section").scrollIntoView({ block: "start", behavior: "smooth" });
      });
    });
  }

  function showCatalogView() {
    if (!catalogIndex) return; // still loading -- the .then() chain that triggered this re-calls once it lands

    grid.hidden = true;
    catalogGrid.hidden = false;
    if (paginationEl) paginationEl.hidden = true; // the server-rendered nav is for the page view specifically; the catalog view gets its own, below

    var matching = state.category === "all"
      ? catalogIndex.slice()
      : catalogIndex.filter(function (item) { return item.category === state.category; });
    matching.sort(catalogSortFn);

    var totalPages = Math.max(1, Math.ceil(matching.length / CATALOG_PAGE_SIZE));
    if (state.catalogPage > totalPages) state.catalogPage = totalPages;
    if (state.catalogPage < 1) state.catalogPage = 1;
    var pageStart = (state.catalogPage - 1) * CATALOG_PAGE_SIZE;
    var pageItems = matching.slice(pageStart, pageStart + CATALOG_PAGE_SIZE);

    catalogGrid.innerHTML = pageItems.map(renderCatalogCard).join("");
    if (countLabel) {
      countLabel.textContent = matching.length
        ? strings.showingCount.replace("{shown}", pageItems.length).replace("{total}", matching.length)
        : "";
    }
    if (emptyMsg) emptyMsg.hidden = matching.length !== 0;
    renderCatalogPagination(matching.length, state.catalogPage);
  }

  function apply() {
    // The server-rendered page view is only correct for the true default
    // state -- "all" category AND "recent" sort, which is what the page
    // was actually built and sorted as. Anything else -- a category
    // picked, or just the sort order changed while still on "all" -- has
    // to mean "sort/filter the whole catalog," not "re-sort this page's
    // 12 products," since that's what a sort dropdown reasonably implies:
    // picking "cheapest first" should surface the cheapest thing in the
    // whole catalog, not just the cheapest among whatever happened to
    // land on this particular page.
    if (state.category === "all" && state.sort === "recent") {
      showPageView();
    } else {
      loadCatalogIndex().then(showCatalogView);
    }
  }

  // Honor ?category=<id> in the URL -- the homepage search box can land
  // people here with a category pre-selected. ?q= is handled further
  // down (see the search section), since query text searches the whole
  // catalog via the same lazily-fetched index, not this page alone.
  try {
    var params = new URLSearchParams(window.location.search);
    var requestedCat = params.get("category");
    if (requestedCat && pills.some(function (p) { return p.getAttribute("data-filter-category") === requestedCat; })) {
      state.category = requestedCat;
      pills.forEach(function (p) {
        p.classList.toggle("active", p.getAttribute("data-filter-category") === requestedCat);
      });
    }
  } catch (e) {}

  function updatePlaceholder() {
    if (!searchInput) return;
    var active = pills.filter(function (p) { return p.classList.contains("active"); })[0];
    var label = active ? active.textContent.trim() : "";
    var prefix = window.WB_SEARCH_PREFIX || "Search";
    searchInput.placeholder = label ? prefix + " " + label + "\u2026" : prefix + "\u2026";
  }
  updatePlaceholder();

  pills.forEach(function (pill) {
    pill.addEventListener("click", function () {
      pills.forEach(function (p) { p.classList.remove("active"); });
      pill.classList.add("active");
      state.category = pill.getAttribute("data-filter-category");
      state.catalogPage = 1;
      apply();
      updatePlaceholder();
    });
  });

  if (sortSelect) {
    sortSelect.addEventListener("change", function () {
      state.sort = sortSelect.value;
      state.catalogPage = 1;
      apply();
    });
  }

  // ---- catalog-wide text search (same lazily-fetched index as category
  // filtering above -- one fetch, shared). Fetched exactly once, on
  // first focus (never on page load, so a visitor who never touches
  // either feature never pays for the request), then renders live
  // matches from the ENTIRE catalog into a dropdown -- same visual
  // pattern and CSS classes as the header search (initSiteSearch above).
  var searchInput = document.querySelector(".page-search-input");
  var searchBtn = document.querySelector(".page-search-btn");
  var resultsBox = document.querySelector(".page-search-results");
  var MIN_QUERY_LENGTH = 2;
  var RENDER_CAP = 20;

  function ratingBadge(rating) {
    if (rating === undefined || rating === null) return "";
    return '<span class="search-rating-badge">\u2605 ' + rating + '</span>';
  }

  function renderCatalogResults(query) {
    if (!resultsBox) return;
    if (!query || query.length < MIN_QUERY_LENGTH) { resultsBox.classList.remove("open"); return; }
    if (!catalogIndex) return; // still loading -- the .then() chain that called this re-renders once it lands

    // Scope to the active category pill FIRST, same pattern already used
    // for the catalog grid itself (showCatalogView() above) -- this was
    // the actual bug: the placeholder text already read state.category
    // correctly ("Search Power Stations..."), but this function searched
    // the entire, un-scoped catalogIndex regardless of which pill was
    // active, so a query like "100w" matched chargers too even with
    // Power Stations selected.
    var pool = state.category === "all"
      ? catalogIndex
      : catalogIndex.filter(function (item) { return item.category === state.category; });

    var q = query.toLowerCase();
    var matches = pool.filter(function (item) {
      var title = item.brand + " " + item.model;
      return title.toLowerCase().indexOf(q) !== -1;
    });
    // Same "starts with the query" ranking as the header search, so
    // typing "anker" with a dozen Anker products doesn't return an
    // arbitrary-looking order.
    matches.sort(function (a, b) {
      var aTitle = (a.brand + " " + a.model).toLowerCase();
      var bTitle = (b.brand + " " + b.model).toLowerCase();
      var aStarts = aTitle.indexOf(q) === 0 ? 0 : 1;
      var bStarts = bTitle.indexOf(q) === 0 ? 0 : 1;
      if (aStarts !== bStarts) return aStarts - bStarts;
      return aTitle.localeCompare(bTitle);
    });

    if (!matches.length) {
      resultsBox.innerHTML = '<div class="site-search-empty">' + (window.WB_SEARCH_NO_RESULTS || "No results found.") + '</div>';
      resultsBox.classList.add("open");
      return;
    }
    var countHeading = '<div class="site-search-heading">' +
      (window.WB_SEARCH_RESULTS_COUNT || "{count} results").replace("{count}", matches.length) +
      '</div>';
    var rows = matches.slice(0, RENDER_CAP).map(function (item) {
      var accentStyle = item.accent ? ' style="--row-accent:' + item.accent + ';"' : "";
      return '<a class="site-search-result" href="' + window.WB_ROOT + item.url + '"' + accentStyle + '>' +
        '<span class="search-result-text">' +
        '<span class="r-title">' + item.brand + ' ' + item.model + '</span>' +
        '<span class="r-subtitle">' + item.category_label + '</span>' +
        '</span>' +
        ratingBadge(item.rating) +
        '</a>';
    }).join("");
    resultsBox.innerHTML = countHeading + '<div class="site-search-list">' + rows + '</div>';
    resultsBox.classList.add("open");
  }

  var SEARCH_GLASS_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>';
  var CLEAR_X_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';

  function updateSearchBtn() {
    if (!searchBtn) return;
    var hasText = !!(searchInput && searchInput.value.trim());
    searchBtn.innerHTML = hasText ? CLEAR_X_SVG : SEARCH_GLASS_SVG;
    searchBtn.classList.toggle("is-clear", hasText);
  }

  if (searchInput) {
    searchInput.addEventListener("focus", function () { loadCatalogIndex(); }, { once: true });

    var searchDebounce = null;
    searchInput.addEventListener("input", function () {
      updateSearchBtn();
      clearTimeout(searchDebounce);
      var query = searchInput.value.trim();
      searchDebounce = setTimeout(function () {
        loadCatalogIndex().then(function () { renderCatalogResults(query); });
      }, 150);
    });
    searchInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") e.preventDefault(); // already filtering live, nothing to "submit"
    });
    updateSearchBtn();
  }
  if (searchBtn) {
    searchBtn.addEventListener("click", function () {
      if (!searchInput) return;
      if (searchBtn.classList.contains("is-clear")) {
        searchInput.value = "";
        if (resultsBox) resultsBox.classList.remove("open");
        updateSearchBtn();
      }
      searchInput.focus();
    });
  }
  document.addEventListener("click", function (e) {
    if (resultsBox && !e.target.closest(".page-search")) resultsBox.classList.remove("open");
  });

  // ?q=<text> in the URL -- the homepage search can land people here
  // with a query already typed. Pre-fills the box AND immediately shows
  // catalog-wide matches, fetching the index right away rather than
  // waiting for a focus event that already effectively just happened.
  try {
    var qParam = new URLSearchParams(window.location.search).get("q");
    if (qParam && searchInput) {
      searchInput.value = qParam;
      updateSearchBtn();
      loadCatalogIndex().then(function () { renderCatalogResults(qParam); });
    }
  } catch (e) {}

  apply();
}

function initTablePagination() {
  document.querySelectorAll(".compare-table").forEach(function (table) {
    var outerWrap = table.closest(".compare-table-wrap");
    var pagination = outerWrap ? outerWrap.querySelector(".table-pagination") : null;
    var pageSize = parseInt(table.getAttribute("data-page-size"), 10) || 4;
    var tbody = table.querySelector("tbody");
    var totalRows = tbody.querySelectorAll("tr").length;
    var totalPages = Math.max(1, Math.ceil(totalRows / pageSize));

    // Always shows page 1 and the last page, plus the current page and
    // its immediate neighbors -- any larger gap between those collapses
    // into a single "..." rather than listing every page number, so a
    // category with many products doesn't turn this into a wall of
    // buttons. 0-indexed throughout, matching pageIndex elsewhere in
    // this function; only the displayed label adds 1.
    function computePageList(current, total) {
      var showSet = {};
      showSet[0] = true;
      showSet[total - 1] = true;
      for (var d = -1; d <= 1; d++) {
        var p = current + d;
        if (p >= 0 && p < total) showSet[p] = true;
      }
      var sorted = Object.keys(showSet).map(Number).sort(function (a, b) { return a - b; });
      var pages = [];
      var prev = null;
      sorted.forEach(function (p) {
        if (prev !== null && p - prev > 1) pages.push("...");
        pages.push(p);
        prev = p;
      });
      return pages;
    }

    // Rebuilds the pagination bar's own buttons around whichever page is
    // now current -- called every time the page changes (not just once
    // at init), since which pages are "current's neighbors" changes as
    // you page through, unlike the old static, build-once bar.
    function renderPaginationBar(currentPage) {
      if (!pagination) return;
      pagination.innerHTML = computePageList(currentPage, totalPages).map(function (p) {
        if (p === "...") return '<span class="wb-page-ellipsis">\u2026</span>';
        return '<button type="button" class="wb-page-btn' + (p === currentPage ? " active" : "") +
          '" data-page="' + p + '">' + (p + 1) + "</button>";
      }).join("");
      pagination.querySelectorAll(".wb-page-btn").forEach(function (btn) {
        btn.addEventListener("click", function () {
          showPage(parseInt(btn.getAttribute("data-page"), 10));
        });
      });
    }

    // Page membership is computed fresh from current DOM order every time,
    // rather than the page each row was assigned at build time -- that way
    // sorting the table and paging through it keep working together instead
    // of the two features fighting over stale page numbers.
    function showPage(pageIndex) {
      var rows = Array.prototype.slice.call(tbody.querySelectorAll("tr"));
      rows.forEach(function (row, i) {
        row.hidden = Math.floor(i / pageSize) !== pageIndex;
      });
      renderPaginationBar(pageIndex);
    }

    // ---- sortable column headers ----
    var sortState = { key: null, dir: 1 };
    table.querySelectorAll("th.sortable").forEach(function (th) {
      th.addEventListener("click", function () {
        var key = th.getAttribute("data-sort");
        var colIndex = Array.prototype.indexOf.call(th.parentElement.children, th);
        sortState.dir = sortState.key === key ? -sortState.dir : 1;
        sortState.key = key;

        table.querySelectorAll("th.sortable").forEach(function (h) {
          h.classList.remove("sort-asc", "sort-desc");
        });
        th.classList.add(sortState.dir === 1 ? "sort-asc" : "sort-desc");

        var rows = Array.prototype.slice.call(tbody.querySelectorAll("tr"));
        rows.sort(function (a, b) {
          var aCell = a.children[colIndex], bCell = b.children[colIndex];
          var aVal = parseFloat(aCell.getAttribute("data-value"));
          var bVal = parseFloat(bCell.getAttribute("data-value"));
          return (aVal - bVal) * sortState.dir;
        });
        rows.forEach(function (row) { tbody.appendChild(row); });
        showPage(0);
      });
    });

    showPage(0);
  });
}

function initProductGallery() {
  document.querySelectorAll(".product-gallery").forEach(function (gallery) {
    var track = gallery.querySelector(".gallery-track");
    var dots = gallery.querySelectorAll(".gallery-dot");
    var slides = gallery.querySelectorAll(".gallery-slide");
    var slideCount = slides.length;
    var prevBtn = gallery.querySelector(".gallery-arrow.prev");
    var nextBtn = gallery.querySelector(".gallery-arrow.next");
    var counter = gallery.querySelector(".gallery-counter-current");
    var creditEl = document.getElementById("gallery-credit");

    function goTo(idx) {
      idx = Math.max(0, Math.min(slideCount - 1, idx));
      track.scrollTo({ left: idx * track.clientWidth, behavior: "smooth" });
    }

    function syncToIndex(idx) {
      dots.forEach(function (d, i) { d.classList.toggle("active", i === idx); });
      if (prevBtn) prevBtn.classList.toggle("is-hidden", idx === 0);
      if (nextBtn) nextBtn.classList.toggle("is-hidden", idx === slideCount - 1);
      if (counter) counter.textContent = idx + 1;
      if (creditEl && slides[idx]) creditEl.textContent = slides[idx].getAttribute("data-credit") || "";
    }

    gallery.querySelectorAll(".gallery-arrow").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var dir = parseInt(btn.getAttribute("data-dir"), 10);
        goTo(Math.round(track.scrollLeft / track.clientWidth) + dir);
      });
    });

    dots.forEach(function (dot) {
      dot.addEventListener("click", function () { goTo(parseInt(dot.getAttribute("data-index"), 10)); });
    });

    var syncTimer;
    track.addEventListener("scroll", function () {
      clearTimeout(syncTimer);
      syncTimer = setTimeout(function () {
        var idx = Math.max(0, Math.min(slideCount - 1, Math.round(track.scrollLeft / track.clientWidth)));
        syncToIndex(idx);
      }, 100);
    }, { passive: true });

    syncToIndex(0); // set initial arrow/counter state on load
  });

  initLightbox();
}

function initLightbox() {
  var lightbox = document.getElementById("lightbox");
  if (!lightbox) return;

  var img = lightbox.querySelector(".lightbox-img");
  var counter = lightbox.querySelector(".lightbox-counter");
  var creditEl = lightbox.querySelector(".lightbox-credit");
  var prevBtn = lightbox.querySelector(".lightbox-arrow.prev");
  var nextBtn = lightbox.querySelector(".lightbox-arrow.next");
  var closeBtn = lightbox.querySelector(".lightbox-close");

  // Collect the full-size src + credit for every photo on the page, in
  // order, whether it's a multi-photo gallery or a single static photo.
  var photos = [];
  document.querySelectorAll(".gallery-slide").forEach(function (slide) {
    photos.push({ full: slide.getAttribute("data-full"), credit: slide.getAttribute("data-credit") || "" });
  });
  if (!photos.length) {
    var single = document.querySelector(".product-photo[data-full]");
    if (single) {
      var creditP = single.parentElement.querySelector(".gallery-credit");
      photos.push({ full: single.getAttribute("data-full"), credit: creditP ? creditP.textContent : "" });
    }
  }
  if (!photos.length) return;

  var current = 0;

  function show(idx) {
    current = Math.max(0, Math.min(photos.length - 1, idx));
    img.src = photos[current].full;
    if (counter) counter.textContent = photos.length > 1 ? (current + 1) + " / " + photos.length : "";
    if (creditEl) creditEl.textContent = photos[current].credit;
    if (prevBtn) prevBtn.classList.toggle("is-hidden", photos.length < 2 || current === 0);
    if (nextBtn) nextBtn.classList.toggle("is-hidden", photos.length < 2 || current === photos.length - 1);
  }

  function open(idx) {
    show(idx);
    lightbox.hidden = false;
    document.body.style.overflow = "hidden";
  }
  function close() {
    lightbox.hidden = true;
    document.body.style.overflow = "";
  }

  document.querySelectorAll(".gallery-expand").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var gallery = btn.closest(".product-gallery, .product-photo");
      var track = gallery ? gallery.querySelector(".gallery-track") : null;
      var idx = track ? Math.round(track.scrollLeft / track.clientWidth) : 0;
      open(idx);
    });
  });

  if (closeBtn) closeBtn.addEventListener("click", close);
  lightbox.addEventListener("click", function (e) { if (e.target === lightbox) close(); });
  if (prevBtn) prevBtn.addEventListener("click", function () { show(current - 1); });
  if (nextBtn) nextBtn.addEventListener("click", function () { show(current + 1); });

  document.addEventListener("keydown", function (e) {
    if (lightbox.hidden) return;
    if (e.key === "Escape") close();
    else if (e.key === "ArrowLeft") show(current - 1);
    else if (e.key === "ArrowRight") show(current + 1);
  });
}

function initRubricExplainerTabs() {
  var tabs = document.querySelectorAll(".rubric-explainer-tab");
  var textEl = document.getElementById("rubric-explainer-text");
  if (!tabs.length || !textEl) return;
  tabs.forEach(function (tab) {
    tab.addEventListener("click", function (e) {
      e.stopPropagation(); // don't let this bubble up into the popover's own drag/close handling
      tabs.forEach(function (t) { t.classList.remove("active"); });
      tab.classList.add("active");
      textEl.textContent = tab.getAttribute("data-explain");
    });
  });
}

// Collapsed by default -- only the Overall Score summary line shows on
// page load, saving space on both mobile and desktop as requested. The
// trigger is a real <button> with aria-expanded/aria-controls already
// in the markup; this just keeps that attribute and the body's native
// hidden attribute in sync on click. The chevron's own rotation is
// pure CSS (keyed off [aria-expanded="true"] in style.css), not
// animated here.
function initRubricAccordion() {
  var trigger = document.querySelector(".rubric-accordion-trigger");
  var body = document.getElementById("rubric-accordion-body");
  if (!trigger || !body) return;
  trigger.addEventListener("click", function () {
    var expanded = trigger.getAttribute("aria-expanded") === "true";
    trigger.setAttribute("aria-expanded", String(!expanded));
    body.hidden = expanded;
  });
}

// Moves the "Overall Score" block itself between the sidebar and the
// article, on request -- below 700px it becomes the first thing inside
// .review-main-bottom (directly above the lede paragraph); at/above
// 700px it lives back in its original spot in .review-rubric-section,
// in the sidebar, completely untouched. Same 700px breakpoint already
// established in initProductFinder() below, matched here rather than
// introducing a second, slightly different mobile threshold into the
// same file.
//
// This moves the actual DOM node, not a duplicate -- CSS Grid can't
// stack two separate elements sequentially inside one named
// grid-template-area (multiple items sharing an area just overlap each
// other, they don't stack in reading order), so reaching this specific
// nesting requires either real DOM movement or two copies of the same
// markup kept in sync by hand. Moving the one real node means its
// accordion open/closed state, its click listener from
// initRubricAccordion() above, and its content all just come along
// with it automatically -- nothing to duplicate, nothing that can
// drift out of sync between two copies.
function initMobileRubricPlacement() {
  var rubricBlock = document.querySelector(".rubric-static-block");
  var mainBottom = document.querySelector(".review-main-bottom");
  if (!rubricBlock || !mainBottom) return; // not on the review page

  // Where the block actually starts (inside .review-rubric-section, in
  // the sidebar) -- remembered up front so it can go back to that exact
  // spot, not just get appended somewhere plausible-looking, once the
  // viewport crosses back above 700px.
  var originalParent = rubricBlock.parentNode;
  var originalNextSibling = rubricBlock.nextSibling; // null is valid -- it may have been the last child

  function applyPlacement(isMobile) {
    if (isMobile) {
      if (mainBottom.firstChild !== rubricBlock) {
        mainBottom.insertBefore(rubricBlock, mainBottom.firstChild);
      }
    } else if (rubricBlock.parentNode !== originalParent) {
      originalParent.insertBefore(rubricBlock, originalNextSibling);
    }
  }

  var mq = window.matchMedia("(max-width: 700px)");
  applyPlacement(mq.matches);
  function handleMqChange(e) { applyPlacement(e.matches); }
  if (mq.addEventListener) mq.addEventListener("change", handleMqChange);
  else mq.addListener(handleMqChange); // older Safari
}

function initRecentStacks() {
  document.querySelectorAll("[data-stack]").forEach(function (stack) {
    var cards = Array.prototype.slice.call(stack.querySelectorAll("[data-stack-card]"));
    var dots = Array.prototype.slice.call(stack.querySelectorAll(".recent-stack-dot"));
    var total = cards.length;
    if (total < 2) return; // only one card in this category -- nothing to page through

    var front = 0;

    function layout() {
      cards.forEach(function (card, i) {
        card.dataset.stackPos = (i - front + total) % total;
      });
      dots.forEach(function (dot, i) { dot.classList.toggle("active", i === front); });
    }
    layout();

    // Wraps in both directions (front - 1 on card 0 lands on the last
    // card) -- same endless-loop behavior the old swipe stack had, so
    // Back/Next never need a disabled state.
    function goTo(index) {
      front = ((index % total) + total) % total;
      layout();
    }

    dots.forEach(function (dot, i) {
      dot.addEventListener("click", function () { goTo(i); });
    });

    // Back/Next -- same goTo()/layout() the dots already use, so the
    // motion comes for free from the .35s transform transition already
    // on .recent-stack .recent-card in CSS. Mirrors the finder wizard's
    // nav pattern instead of the old pointer-drag/fling gesture.
    var backBtn = stack.querySelector(".recent-stack-back");
    var nextBtn = stack.querySelector(".recent-stack-next");
    if (backBtn) backBtn.addEventListener("click", function () { goTo(front - 1); });
    if (nextBtn) nextBtn.addEventListener("click", function () { goTo(front + 1); });
  });
}

// Mobile category tabs -- used by both the recent-reviews showcase and
// the comparison tables below it. Scoped per [data-tabs-group] rather
// than one flat document-wide lookup, since both sections have a
// "power-stations"/"power-banks"/"chargers" panel and a global lookup
// would let one section's tab click control the other section's panel.
function initCategoryTabs() {
  document.querySelectorAll("[data-tabs-group]").forEach(function (tabsGroup) {
    var tabs = Array.prototype.slice.call(tabsGroup.querySelectorAll(".recent-tab"));
    if (!tabs.length) return;
    var panels = {};
    tabsGroup.querySelectorAll("[data-category-panel]").forEach(function (panel) {
      panels[panel.getAttribute("data-category-panel")] = panel;
    });
    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        var cat = tab.getAttribute("data-category-tab");
        tabs.forEach(function (t) {
          var isActive = t === tab;
          t.classList.toggle("active", isActive);
          t.setAttribute("aria-selected", isActive ? "true" : "false");
        });
        Object.keys(panels).forEach(function (key) {
          panels[key].hidden = key !== cat;
        });
      });
    });
  });
}

function initProductFinder() {
  var panel = document.querySelector(".finder-grid");
  if (!panel || !window.WB_FINDER_INDEX) return;

  // No default selections and no default result anymore -- the panel
  // starts genuinely empty (see the placeholder in #finder-best) until
  // the person actually answers. "usage" and "usecase" are required
  // (computeMatch() needs both to produce a real ranked answer);
  // "budget" stays optional exactly as before, zero selected just means
  // no price filter.
  var state = { usage: [], usecase: [], budget: [] };

  function canSubmit() {
    return state.usage.length > 0 && state.usecase.length > 0;
  }
  function updateSubmitAvailability() {
    if (submitBtn && !hasShownResult) submitBtn.disabled = !canSubmit();
  }

  // "usage" (device type) is a single-select group -- exactly one option
  // is always the current answer, same idea as a radio group, because
  // "traveling with a phone AND a fridge" isn't a meaningful combination
  // the way "traveling AND camping" is for use case. usecase/budget stay
  // multi-select/optional exactly as before.
  panel.querySelectorAll(".finder-pills").forEach(function (group) {
    var groupName = group.getAttribute("data-finder-group");
    var isSingleSelect = groupName === "usage" || groupName === "usecase";
    var pills = Array.prototype.slice.call(group.querySelectorAll(".finder-pill"));
    if (isSingleSelect) group.setAttribute("role", "radiogroup");
    pills.forEach(function (pill) {
      var value = pill.getAttribute("data-value");
      if (isSingleSelect) {
        pill.setAttribute("role", "radio");
        pill.setAttribute("aria-checked", pill.classList.contains("active") ? "true" : "false");
      } else {
        pill.setAttribute("aria-pressed", pill.classList.contains("active") ? "true" : "false");
      }
      pill.addEventListener("click", function () {
        if (isSingleSelect) {
          if (state[groupName][0] === value) return; // already the only answer -- radio groups don't unselect down to none
          state[groupName] = [value];
          pills.forEach(function (p) {
            var isActive = p === pill;
            p.classList.toggle("active", isActive);
            p.setAttribute("aria-checked", isActive ? "true" : "false");
          });
          updateSubmitAvailability();
          return;
        }
        var idx = state[groupName].indexOf(value);
        if (idx === -1) {
          state[groupName].push(value);
        } else {
          state[groupName].splice(idx, 1);
        }
        pill.classList.toggle("active", idx === -1);
        pill.setAttribute("aria-pressed", idx === -1 ? "true" : "false");
        updateSubmitAvailability();
      });
    });
  });

  // ---- mobile step-wizard: below 700px, only one step is visible at a
  // time (usage -> usecase -> budget -> results), driven by the nav bar
  // below. Above 700px this whole block is a no-op and every step is
  // always visible at once via the two-column layout. (This breakpoint
  // must stay in sync with the CSS breakpoints for .finder-grid,
  // .finder-step-submit, .finder-pair, and the mobile-nav merge rules.) ----
  var STEP_ORDER = ["usage", "usecase", "budget", "results"];
  var stepEls = {};
  document.querySelectorAll("[data-finder-step]").forEach(function (el) {
    stepEls[el.getAttribute("data-finder-step")] = el;
  });
  var mobileNav = document.getElementById("finder-mobile-nav");
  var dots = Array.prototype.slice.call(document.querySelectorAll("#finder-dots .finder-dot"));
  var backBtn = document.getElementById("finder-back");
  var nextBtn = document.getElementById("finder-next");
  var submitBtn = document.getElementById("finder-submit");
  var hasShownResult = false; // tracks which of the two labels/actions the shared desktop button is currently in

  function setSubmitButtonState(showingResult) {
    hasShownResult = showingResult;
    if (submitBtn) {
      submitBtn.textContent = showingResult
        ? ("\u21BA " + window.WB_FINDER_RESET_LABEL)
        : (window.WB_FINDER_SUBMIT_LABEL || "Show My Match \u2192");
      submitBtn.classList.toggle("is-submit", !showingResult);
      submitBtn.classList.toggle("is-reset", showingResult);
    }
    setPillsInteractive(!showingResult);
    if (!showingResult) updateSubmitAvailability(); // re-locks the button until a fresh selection is made -- this was the bug: Reset called this with showingResult=false but nothing re-evaluated .disabled, so the button stayed clickable from before Reset was pressed
  }
  // While a result is showing, the pills are locked rather than left live --
  // changing them wouldn't do anything until Reset is clicked anyway (the
  // shown result deliberately doesn't recompute itself), so leaving them
  // clickable was misleading. Native `disabled` rather than a CSS-only
  // treatment: it blocks the click for free, skips them in tab order, and
  // gets announced correctly by screen readers, instead of reimplementing
  // all of that by hand.
  function setPillsInteractive(enabled) {
    panel.querySelectorAll(".finder-pill").forEach(function (pill) {
      pill.disabled = !enabled;
    });
  }
  var mq = window.matchMedia("(max-width: 700px)");
  var isMobile = mq.matches;
  // Starts on the first question, not the results step -- there's no
  // longer a default result computed up front (see below), so jumping
  // straight to results would just show an empty placeholder as if it
  // were step 1. Desktop is unaffected either way since every step is
  // visible at once there regardless of wizardStep.
  var wizardStep = 0;

  function updateWizardView() {
    // .finder-col-left/.finder-col-right/.finder-pair are never hidden by
    // the per-step loop below -- only the individual [data-finder-step]
    // divs inside them are. Left on their own, the *empty* wrapper still
    // occupies a grid row (finder-grid) or flex slot (finder-col-left),
    // which still gets a `gap` around it even with nothing visible inside
    // -- a phantom blank strip between the visible card and the nav bar.
    // Collapsing the wrapper itself removes it from layout entirely.
    var colLeft = panel.querySelector(".finder-col-left");
    var colRight = panel.querySelector(".finder-col-right");
    var pairEl = panel.querySelector(".finder-pair");
    if (!isMobile) {
      STEP_ORDER.forEach(function (key) { if (stepEls[key]) stepEls[key].hidden = false; });
      if (mobileNav) mobileNav.hidden = true;
      if (colLeft) colLeft.hidden = false;
      if (colRight) colRight.hidden = false;
      if (pairEl) pairEl.hidden = false;
      return;
    }
    STEP_ORDER.forEach(function (key, i) { if (stepEls[key]) stepEls[key].hidden = i !== wizardStep; });

    var isResultsStep = wizardStep === STEP_ORDER.length - 1;
    var isPairStep = wizardStep === 1 || wizardStep === 2;
    if (colLeft) colLeft.hidden = isResultsStep;
    if (colRight) colRight.hidden = !isResultsStep;
    if (pairEl) pairEl.hidden = !isPairStep;
    if (mobileNav) mobileNav.hidden = false;
    dots.forEach(function (dot, i) { dot.classList.toggle("active", i === wizardStep); });

    if (backBtn) backBtn.hidden = isResultsStep;
    if (backBtn && !isResultsStep) backBtn.disabled = wizardStep === 0;
    if (nextBtn) {
      if (isResultsStep) {
        // Nothing to advance to from the last slide -- this button becomes
        // the wizard's reset control instead of being hidden, styled to
        // match the desktop Show My Match / Reset button exactly (see
        // .finder-next.is-reset in style.css) rather than the plain
        // .finder-nav-btn look the Back/Next pair normally has.
        nextBtn.hidden = false;
        nextBtn.textContent = "\u21BA " + window.WB_FINDER_RESET_LABEL;
        nextBtn.classList.remove("is-submit");
        nextBtn.classList.add("is-reset");
      } else {
        nextBtn.hidden = false;
        nextBtn.classList.remove("is-reset");
        var isLastQuestion = wizardStep === STEP_ORDER.length - 2;
        nextBtn.textContent = isLastQuestion ? (window.WB_FINDER_SUBMIT_LABEL || "Show My Match \u2192") : "Next \u2192";
        nextBtn.classList.toggle("is-submit", isLastQuestion);
        nextBtn.disabled = isLastQuestion && !canSubmit();
      }
    }
  }

  // Landing on the results step (from anywhere else) recomputes the
  // match, since that's the wizard's equivalent of clicking the desktop
  // submit button -- selections may have changed since it was last shown.
  function goToStep(newStep) {
    var wasResults = wizardStep === STEP_ORDER.length - 1;
    wizardStep = Math.max(0, Math.min(STEP_ORDER.length - 1, newStep));
    var isResults = wizardStep === STEP_ORDER.length - 1;
    updateWizardView();
    if (isResults && !wasResults && canSubmit()) runMatch();
  }

  function handleMqChange(e) {
    isMobile = e.matches;
    wizardStep = STEP_ORDER.length - 1;
    updateWizardView();
  }
  if (mq.addEventListener) mq.addEventListener("change", handleMqChange);
  else mq.addListener(handleMqChange); // older Safari

  if (backBtn) backBtn.addEventListener("click", function () { goToStep(wizardStep - 1); });
  if (nextBtn) nextBtn.addEventListener("click", function () {
    if (wizardStep === STEP_ORDER.length - 1) {
      resetAll();
      clearResult();
      setSubmitButtonState(false);
      return;
    }
    goToStep(wizardStep + 1);
  });

  var touchStartX = null;
  panel.addEventListener("touchstart", function (e) { touchStartX = e.touches[0].clientX; }, { passive: true });
  panel.addEventListener("touchend", function (e) {
    if (touchStartX == null || !isMobile) return;
    var dx = e.changedTouches[0].clientX - touchStartX;
    if (dx < -40) goToStep(wizardStep + 1);
    else if (dx > 40) goToStep(wizardStep - 1);
    touchStartX = null;
  }, { passive: true });

  function resetAll() {
    state = { usage: [], usecase: [], budget: [] };
    panel.querySelectorAll(".finder-pill.active").forEach(function (pill) { pill.classList.remove("active"); });
    panel.querySelectorAll('.finder-pills[data-finder-group="usage"] .finder-pill, .finder-pills[data-finder-group="usecase"] .finder-pill').forEach(function (pill) {
      pill.setAttribute("aria-checked", "false");
    });
    panel.querySelectorAll('.finder-pills[data-finder-group="budget"] .finder-pill').forEach(function (pill) {
      pill.setAttribute("aria-pressed", "false");
    });
    setPillsInteractive(true);
    if (isMobile) {
      wizardStep = 0;
      updateWizardView();
    }
    // deliberately no runMatch() here -- the shown result stays put until Show My Match is clicked again
  }

  updateWizardView();

  // Step 1, device type -- Wh/W thresholds against the real catalog
  // rather than a fixed category mapping, so a small power station and a
  // large power bank can both legitimately show up for "Medium Gear" if
  // their numbers actually fit, instead of one category being silently
  // excluded just because of what it's called.
  var USAGE_FILTERS = {
    phone: function (item) { return item.category === "power-banks" || item.effective_wh <= 300; },
    laptop: function (item) { return item.effective_wh >= 300 && item.effective_wh <= 1000; },
    fridge: function (item) { return item.effective_wh >= 1000 && item.output_w >= 1000; },
  };

  // Step 2, use case -- real hard filters now (this used to be a
  // ranking-only formula that never actually excluded anything). "On the
  // Go" deliberately drops the "AND category IN (power-bank,
  // power-station)" clause a station-inclusive version of this rule
  // would need: a real power station is never <=1.5kg, so that clause
  // never excluded anything a weight threshold alone doesn't already
  // handle -- keeping it would've been redundant, not more correct.
  var USECASE_FILTERS = {
    traveling: function (item) { return item.weight_kg != null && item.weight_kg <= 1.5; },
    camping: function (item) { return item.weight_kg != null && item.weight_kg <= 25 && item.effective_wh >= 300; },
    offgrid: function (item) { return item.category === "power-stations" && item.effective_wh >= 500; },
  };
  var BUDGET_RANGES = { micro: [0, 100], low: [100, 400], high: [400, Infinity] };

  function byRating(a, b) { return b.rating - a.rating; }

  function smallImageSrc(src) {
    return src && src.slice(-5) === ".webp" ? src.slice(0, -5) + "-sm.webp" : src;
  }

  function starString(rating) {
    var filled = Math.max(0, Math.min(5, Math.round(rating)));
    return "\u2605".repeat(filled) + "\u2606".repeat(5 - filled);
  }

  function renderBestMatch(item, usedFallback) {
    var noteEl = document.getElementById("finder-note");
    var bestEl = document.getElementById("finder-best");
    if (!bestEl) return;

    if (noteEl) {
      noteEl.hidden = !usedFallback;
      if (usedFallback) noteEl.textContent = window.WB_FINDER_FALLBACK_NOTE;
    }

    var photoInner = item.image
      ? '<img src="' + window.WB_ROOT + smallImageSrc(item.image) + '" alt="' + item.title + '" loading="lazy">'
      : "\u26A1";
    var photoClass = "finder-mobile-best-photo" + (item.image ? "" : " placeholder");
    var badgeLabels = {
      top_rated: window.WB_TOP_RATED_LABEL || "Top Rated",
      best_value: window.WB_BEST_VALUE_LABEL || "Best Value",
      fastest_charge: window.WB_FASTEST_CHARGE_LABEL || "Fastest Charge",
      highest_output: window.WB_HIGHEST_OUTPUT_LABEL || "Highest Output",
      lightest: window.WB_LIGHTEST_LABEL || "Lightest"
    };
    var badgeHtml = item.primary_badge
      ? '<div class="product-badge-pill"><span class="badge-icon">' + item.primary_badge_emoji + '</span><span>' + badgeLabels[item.primary_badge] + '</span></div>'
      : "";

    // Only the photo is the actual link now (matches the same pattern
    // used for the homepage recent-cards) -- title/rating/description
    // are plain text underneath, not part of any clickable area.
    bestEl.innerHTML =
      '<div class="finder-best-card">' +
        '<a class="finder-best-photo-link" href="' + window.WB_ROOT + item.url + '" aria-label="' + item.title + ' \u2014 ' + window.WB_FINDER_CTA + '">' +
          '<div class="' + photoClass + '">' + badgeHtml + photoInner + "</div>" +
        "</a>" +
        "<h4>" + item.title + "</h4>" +
        '<p class="recent-card-stars">' + starString(item.rating) + ' <span>' + item.rating + "/5 \u00b7 ~\u20AC" + item.price_eur.toLocaleString() + "</span></p>" +
        '<p class="finder-mobile-best-desc">' + (item.summary || "") + "</p>" +
      "</div>";
  }

  function computeMatch() {
    var pool = window.WB_FINDER_INDEX.slice();
    var usedFallback = false;

    var usageFn = state.usage.length ? USAGE_FILTERS[state.usage[0]] : null;
    var usecaseFn = state.usecase.length ? USECASE_FILTERS[state.usecase[0]] : null;

    var afterUsage = usageFn ? pool.filter(usageFn) : pool;
    if (!afterUsage.length) { afterUsage = pool; usedFallback = true; } // this device type matched nothing at all -- whole pool instead of a dead end

    var narrowed = afterUsage;
    if (usecaseFn) {
      var afterUsecase = afterUsage.filter(usecaseFn);
      if (afterUsecase.length) {
        narrowed = afterUsecase;
      } else {
        usedFallback = true; // this use case is too narrow for the chosen device type (e.g. Heavy Gear + On the Go is a real contradiction) -- keep the device-type pool instead
      }
    }

    if (state.budget.length) {
      var ranges = state.budget.map(function (b) { return BUDGET_RANGES[b]; });
      var inBudget = narrowed.filter(function (item) {
        return ranges.some(function (r) { return item.price_eur >= r[0] && item.price_eur <= r[1]; });
      });
      if (inBudget.length) {
        narrowed = inBudget;
      } else {
        usedFallback = true; // no exact match in any selected range -- show the closest fit instead
      }
    }

    narrowed = narrowed.slice().sort(byRating);
    return { best: narrowed[0], usedFallback: usedFallback };
  }

  function runMatch() {
    var result = computeMatch();
    if (!result) return;
    renderBestMatch(result.best, result.usedFallback);
  }

  var FINDER_PLACEHOLDER_HTML =
    '<div class="finder-best-placeholder">' +
      '<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="7"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>' +
      "<p>" + (window.WB_FINDER_PLACEHOLDER_TEXT || "Pick your answers on the left and your match will show up here.") + "</p>" +
    "</div>";

  function clearResult() {
    var bestEl = document.getElementById("finder-best");
    var noteEl = document.getElementById("finder-note");
    if (bestEl) bestEl.innerHTML = FINDER_PLACEHOLDER_HTML;
    if (noteEl) noteEl.hidden = true;
  }

  function showFinderLoading() {
    var bestEl = document.getElementById("finder-best");
    var noteEl = document.getElementById("finder-note");
    if (noteEl) noteEl.hidden = true;
    if (bestEl) {
      bestEl.innerHTML = '<div class="finder-loading"><div class="finder-loading-spinner"></div><p>' + (window.WB_FINDER_LOADING_TEXT || "Finding your match\u2026") + "</p></div>";
    }
  }

  if (submitBtn) {
    submitBtn.addEventListener("click", function () {
      if (hasShownResult) {
        resetAll();
        clearResult();
        setSubmitButtonState(false);
        return;
      }
      setPillsInteractive(false);
      submitBtn.disabled = true;
      showFinderLoading();
      setTimeout(function () {
        runMatch();
        setSubmitButtonState(true);
        submitBtn.disabled = false;
      }, 650);
    });
  }

  setSubmitButtonState(false); // starts as "Show My Match" (not "Reset"), disabled, and bold/is-submit -- all handled internally now
}
