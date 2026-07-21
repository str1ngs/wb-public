document.addEventListener("DOMContentLoaded", function () {
  var btn = document.querySelector(".nav-toggle");
  var nav = document.querySelector(".main-nav");
  if (btn && nav) {
    btn.addEventListener("click", function () {
      nav.classList.toggle("open");
      var expanded = nav.classList.contains("open");
      btn.setAttribute("aria-expanded", expanded ? "true" : "false");
    });
  }

  // Dark mode toggle. The actual theme is applied earlier by an inline
  // script in <head> (see templates/base.html) so there's no flash of
  // the wrong theme on load -- this just wires up the button and
  // keeps localStorage in sync with clicks.
  var themeBtn = document.querySelector(".theme-toggle");
  if (themeBtn) {
    var setLabel = function () {
      var isDark = document.documentElement.getAttribute("data-theme") === "dark";
      themeBtn.textContent = isDark ? (window.WB_THEME_LABELS ? window.WB_THEME_LABELS.light : "\u2600 LIGHT") : (window.WB_THEME_LABELS ? window.WB_THEME_LABELS.dark : "\u263D DARK");
      themeBtn.setAttribute("aria-pressed", isDark ? "true" : "false");
    };
    setLabel();
    themeBtn.addEventListener("click", function () {
      var current = document.documentElement.getAttribute("data-theme");
      var next = current === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      try { localStorage.setItem("wattbench-theme", next); } catch (e) {}
      setLabel();
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
  initRubricPopover();

  // ---- Comparison table pagination ----
  initTablePagination();

  // ---- Language memory ----
  // Remember an explicit language choice so returning visitors land on
  // their preferred language automatically, without ever silently
  // redirecting a first-time visitor or someone who followed a specific
  // link/search result on purpose (see main.js comments below).
  initLanguageMemory();
});

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
  if (!input || !window.WB_SEARCH_INDEX) return;
  var resultsBox = document.querySelector(".site-search-results");
  var button = document.querySelector(".site-search-btn");
  var chip = document.getElementById("search-cat-chip");
  var chipLabel = chip ? chip.querySelector(".chip-label") : null;
  var chipRemove = chip ? chip.querySelector(".chip-remove") : null;
  var data = window.WB_SEARCH_INDEX; // embedded at build time -- no fetch, works over file:// too
  var categories = window.WB_CATEGORIES || [];
  var activeCategory = null; // the locked chip, if any -- {id, label, accent, icon}

  var VISIBLE_ROWS = 5;
  var RENDER_CAP = 20; // plenty for this catalog size; scroll handles the rest
  var MIN_QUERY_LENGTH = 2;

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
  // always the first real move a visitor makes here.
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
  }

  var debounceTimer = null;
  input.addEventListener("input", function () {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function () { runSearch(input.value); }, 100);
  });

  input.addEventListener("focus", function () {
    if (input.value.trim() || activeCategory) runSearch(input.value);
    else renderSuggested();
  });

  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      goToResults();
    } else if (e.key === "Backspace" && !input.value && activeCategory) {
      // Backspacing from an empty box is the natural way to "delete" the
      // chip too, same as removing a tag in a chip-based filter UI.
      clearActiveCategory();
      renderSuggested();
    }
  });

  if (button) {
    button.addEventListener("click", goToResults);
  }

  document.addEventListener("click", function (e) {
    if (!e.target.closest(".hero-search")) resultsBox.classList.remove("open");
  });
}

function initReviewsFilter() {
  var grid = document.getElementById("review-grid");
  if (!grid) return; // not on the all-reviews page

  var cards = Array.prototype.slice.call(grid.querySelectorAll(".review-card"));
  var pills = Array.prototype.slice.call(document.querySelectorAll(".filter-pill"));
  var sortSelect = document.getElementById("review-sort");
  var paginationEl = document.getElementById("review-pagination");
  var countLabel = document.querySelector(".review-count");
  var emptyMsg = document.querySelector(".review-empty");
  var strings = window.WB_REVIEWS_STRINGS || { showingCount: "Showing {shown} of {total}", noMatches: "No matches." };

  var PAGE_SIZE = 9;
  var state = { category: "all", sort: "recent", page: 1, query: "" };
  var searchInput = document.querySelector(".page-search-input");
  var searchBtn = document.querySelector(".page-search-btn");

  // Honor ?category=<id> and ?q=<text> in the URL -- the homepage search
  // box sends people here with one or both set, so this page needs to
  // pick up right where that search left off instead of showing everything.
  try {
    var params = new URLSearchParams(window.location.search);
    var requestedCat = params.get("category");
    if (requestedCat && pills.some(function (p) { return p.getAttribute("data-filter-category") === requestedCat; })) {
      state.category = requestedCat;
      pills.forEach(function (p) {
        p.classList.toggle("active", p.getAttribute("data-filter-category") === requestedCat);
      });
    }
    var requestedQuery = params.get("q");
    if (requestedQuery) {
      state.query = requestedQuery.trim().toLowerCase();
      if (searchInput) searchInput.value = requestedQuery;
    }
  } catch (e) {}

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

  function renderPagination(totalPages) {
    if (!paginationEl) return;
    if (totalPages <= 1) { paginationEl.innerHTML = ""; return; }
    var html = '<button type="button" class="review-page-arrow" data-page="' + (state.page - 1) + '"' +
      (state.page <= 1 ? ' disabled' : '') + ' aria-label="Previous">\u2039</button>';
    for (var i = 1; i <= totalPages; i++) {
      html += '<button type="button" class="review-page-num' + (i === state.page ? ' active' : '') + '" data-page="' + i + '">' + i + '</button>';
    }
    html += '<button type="button" class="review-page-arrow" data-page="' + (state.page + 1) + '"' +
      (state.page >= totalPages ? ' disabled' : '') + ' aria-label="Next">\u203a</button>';
    paginationEl.innerHTML = html;

    paginationEl.querySelectorAll("button[data-page]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (btn.hasAttribute("disabled")) return;
        state.page = parseInt(btn.getAttribute("data-page"), 10);
        apply();
        requestAnimationFrame(function () {
          grid.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      });
    });
  }

  function apply() {
    var matching = cards.filter(function (c) {
      var inCategory = state.category === "all" || c.dataset.category === state.category;
      var inQuery = !state.query || c.dataset.title.indexOf(state.query) !== -1;
      return inCategory && inQuery;
    });
    matching.sort(sortFn);

    // reorder the actual DOM nodes to match sort order
    matching.forEach(function (c) { grid.appendChild(c); });

    var totalPages = Math.max(1, Math.ceil(matching.length / PAGE_SIZE));
    if (state.page > totalPages) state.page = totalPages;
    var start = (state.page - 1) * PAGE_SIZE;
    var end = start + PAGE_SIZE;

    cards.forEach(function (c) { c.hidden = true; });
    matching.forEach(function (c, i) {
      if (i >= start && i < end) c.hidden = false;
    });

    if (countLabel) {
      countLabel.textContent = matching.length
        ? strings.showingCount.replace("{shown}", Math.min(end, matching.length) - start).replace("{total}", matching.length)
        : "";
    }
    if (emptyMsg) emptyMsg.hidden = matching.length !== 0;
    renderPagination(totalPages);
  }

  function updatePlaceholder() {
    if (!searchInput) return;
    var active = pills.filter(function (p) { return p.classList.contains("active"); })[0];
    var label = active ? active.textContent.trim() : "";
    var prefix = window.WB_SEARCH_PREFIX || "Search";
    searchInput.placeholder = label ? prefix + " " + label : prefix + "...";
  }
  updatePlaceholder();

  pills.forEach(function (pill) {
    pill.addEventListener("click", function () {
      pills.forEach(function (p) { p.classList.remove("active"); });
      pill.classList.add("active");
      state.category = pill.getAttribute("data-filter-category");
      state.page = 1;
      apply();
      updatePlaceholder();
    });
  });

  var SEARCH_GLASS_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>';
  var CLEAR_X_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';

  function updateSearchBtn() {
    if (!searchBtn) return;
    var hasText = !!(searchInput && searchInput.value.trim());
    searchBtn.innerHTML = hasText ? CLEAR_X_SVG : SEARCH_GLASS_SVG;
    searchBtn.classList.toggle("is-clear", hasText);
  }

  if (searchInput) {
    var searchDebounce = null;
    searchInput.addEventListener("input", function () {
      updateSearchBtn();
      clearTimeout(searchDebounce);
      searchDebounce = setTimeout(function () {
        state.query = searchInput.value.trim().toLowerCase();
        state.page = 1;
        apply();
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
        state.query = "";
        state.page = 1;
        apply();
        updateSearchBtn();
      }
      searchInput.focus();
    });
  }

  if (sortSelect) {
    sortSelect.addEventListener("change", function () {
      state.sort = sortSelect.value;
      state.page = 1;
      apply();
    });
  }

  apply();
}

function initTablePagination() {
  document.querySelectorAll(".compare-table").forEach(function (table) {
    var outerWrap = table.closest(".compare-table-wrap");
    var pagination = outerWrap ? outerWrap.nextElementSibling : null;
    var pageSize = parseInt(table.getAttribute("data-page-size"), 10) || 4;
    var tbody = table.querySelector("tbody");
    var buttons = pagination && pagination.classList.contains("table-pagination")
      ? pagination.querySelectorAll(".table-page-btn") : [];

    // Page membership is computed fresh from current DOM order every time,
    // rather than the page each row was assigned at build time -- that way
    // sorting the table and paging through it keep working together instead
    // of the two features fighting over stale page numbers.
    function showPage(pageIndex) {
      var rows = Array.prototype.slice.call(tbody.querySelectorAll("tr"));
      rows.forEach(function (row, i) {
        row.hidden = Math.floor(i / pageSize) !== pageIndex;
      });
      buttons.forEach(function (b) {
        b.classList.toggle("active", parseInt(b.getAttribute("data-page"), 10) === pageIndex);
      });
    }

    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        showPage(parseInt(btn.getAttribute("data-page"), 10));
      });
    });

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
    });

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

function initRubricPopover() {
  var wrap = document.querySelector(".rubric-trigger-wrap");
  if (!wrap) return;
  var trigger = wrap.querySelector(".rubric-trigger");

  trigger.addEventListener("click", function (e) {
    e.stopPropagation();
    wrap.classList.toggle("open");
  });

  if (closeBtn) {
    closeBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      wrap.classList.remove("open");
    });
  }

  document.addEventListener("click", function (e) {
    if (!wrap.contains(e.target)) wrap.classList.remove("open");
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") wrap.classList.remove("open");
  });
}
