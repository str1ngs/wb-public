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
  initRubricPopover();
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
    var html = '<button type="button" class="wb-page-btn wb-page-arrow" data-page="' + (state.page - 1) + '"' +
      (state.page <= 1 ? ' disabled' : '') + ' aria-label="Previous">\u2039</button>';
    for (var i = 1; i <= totalPages; i++) {
      html += '<button type="button" class="wb-page-btn' + (i === state.page ? ' active' : '') + '" data-page="' + i + '">' + i + '</button>';
    }
    html += '<button type="button" class="wb-page-btn wb-page-arrow" data-page="' + (state.page + 1) + '"' +
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
    var pagination = outerWrap ? outerWrap.querySelector(".table-pagination") : null;
    var pageSize = parseInt(table.getAttribute("data-page-size"), 10) || 4;
    var tbody = table.querySelector("tbody");
    var buttons = pagination ? pagination.querySelectorAll(".wb-page-btn") : [];

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
  var popover = wrap.querySelector(".rubric-popover");
  var closeBtn = wrap.querySelector(".rubric-popover-close");
  var dragHandle = wrap.querySelector(".rubric-popover-title");

  function resetPosition() {
    popover.style.transition = "";
    popover.style.position = "";
    popover.style.left = "";
    popover.style.top = "";
    popover.style.right = "";
    popover.style.bottom = "";
    popover.style.transform = "";
  }

  trigger.addEventListener("click", function (e) {
    e.stopPropagation();
    resetPosition(); // always reopen centered/anchored, not wherever it was last dragged
    wrap.classList.add("open");
  });

  if (closeBtn) {
    closeBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      wrap.classList.remove("open");
    });
  }

  if (dragHandle) {
    var dragging = false;
    var startX, startY, startLeft, startTop;

    dragHandle.addEventListener("pointerdown", function (e) {
      dragging = true;
      var rect = popover.getBoundingClientRect();
      popover.style.transition = "none"; // must be set before the lines below, so the position swap isn't animated
      popover.style.position = "fixed";
      popover.style.left = rect.left + "px";
      popover.style.top = rect.top + "px";
      popover.style.right = "auto";
      popover.style.bottom = "auto";
      popover.style.transform = "none";
      startX = e.clientX;
      startY = e.clientY;
      startLeft = rect.left;
      startTop = rect.top;
      dragHandle.setPointerCapture(e.pointerId);
    });

    dragHandle.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      var newLeft = startLeft + (e.clientX - startX);
      var newTop = startTop + (e.clientY - startY);
      var margin = 20;
      newLeft = Math.max(margin - popover.offsetWidth, Math.min(newLeft, window.innerWidth - margin));
      newTop = Math.max(0, Math.min(newTop, window.innerHeight - margin));
      popover.style.left = newLeft + "px";
      popover.style.top = newTop + "px";
    });

    function endDrag() {
      if (!dragging) return;
      dragging = false;
      popover.style.transition = ""; // restore normal fade transition for next close/open
    }
    dragHandle.addEventListener("pointerup", endDrag);
    dragHandle.addEventListener("pointercancel", endDrag);
  }
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
  panel.addEventListener("touchstart", function (e) { touchStartX = e.touches[0].clientX; });
  panel.addEventListener("touchend", function (e) {
    if (touchStartX == null || !isMobile) return;
    var dx = e.changedTouches[0].clientX - touchStartX;
    if (dx < -40) goToStep(wizardStep + 1);
    else if (dx > 40) goToStep(wizardStep - 1);
    touchStartX = null;
  });

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

  var USAGE_CATEGORY = { phone: "power-banks", laptop: "power-stations", fridge: "power-stations" };
  var BUDGET_RANGES = { micro: [0, 100], low: [100, 400], high: [400, Infinity] };

  function rankByUsecase(candidates, usecase) {
    var sorted = candidates.slice();
    if (usecase === "traveling") {
      sorted.sort(function (a, b) {
        var as = a.portability + a.charge_speed, bs = b.portability + b.charge_speed;
        if (bs !== as) return bs - as;
        var aw = a.weight_kg == null ? Infinity : a.weight_kg;
        var bw = b.weight_kg == null ? Infinity : b.weight_kg;
        return aw - bw;
      });
    } else if (usecase === "camping") {
      sorted.sort(function (a, b) {
        var as = a.portability + a.value + (a.is_rugged ? 0.5 : 0);
        var bs = b.portability + b.value + (b.is_rugged ? 0.5 : 0);
        if (bs !== as) return bs - as;
        var aw = a.weight_kg == null ? Infinity : a.weight_kg;
        var bw = b.weight_kg == null ? Infinity : b.weight_kg;
        return (b.effective_wh / bw) - (a.effective_wh / aw);
      });
    } else if (usecase === "offgrid") {
      var maxWh = Math.max.apply(null, candidates.map(function (p) { return p.effective_wh; })) || 1;
      sorted.sort(function (a, b) {
        var aScore = a.reliability * 0.6 + (5 * a.effective_wh / maxWh) * 0.4;
        var bScore = b.reliability * 0.6 + (5 * b.effective_wh / maxWh) * 0.4;
        if (bScore !== aScore) return bScore - aScore;
        return b.output_w - a.output_w;
      });
    }
    return sorted;
  }

  function pickRanked(candidates, usecases) {
    if (!usecases.length) {
      return candidates.slice().sort(function (a, b) { return b.rating - a.rating; });
    }
    if (usecases.length === 1) {
      return rankByUsecase(candidates, usecases[0]);
    }
    var rankMaps = usecases.map(function (uc) {
      var ranked = rankByUsecase(candidates, uc);
      var map = {};
      ranked.forEach(function (item, i) { map[item.id] = i; });
      return map;
    });
    var withAvgRank = candidates.map(function (item) {
      var sum = rankMaps.reduce(function (acc, map) { return acc + map[item.id]; }, 0);
      return { item: item, avgRank: sum / rankMaps.length };
    });
    withAvgRank.sort(function (a, b) { return a.avgRank - b.avgRank; });
    return withAvgRank.map(function (x) { return x.item; });
  }

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
      ? '<img src="' + window.WB_ROOT + smallImageSrc(item.image) + '" alt="">'
      : "\u26A1";
    var photoClass = "finder-mobile-best-photo" + (item.image ? "" : " placeholder");
    var badgeHtml = item.is_top_rated
      ? '<span class="top-rated-badge" title="' + (window.WB_TOP_RATED_LABEL || "Top Rated") + '"><svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 2l2.9 6.26 6.9.6-5.2 4.6 1.6 6.75L12 16.9l-6.2 3.31 1.6-6.75-5.2-4.6 6.9-.6z"></path></svg></span>'
      : "";

    // The whole card is one link to the review -- no separate "View
    // review" button needed. <a> can legally wrap block-level content
    // (div/h4/p), so this is valid markup, not a div-in-a-link hack.
    bestEl.innerHTML =
      '<a class="finder-best-link" href="' + window.WB_ROOT + item.url + '" aria-label="' + item.title + ' \u2014 ' + window.WB_FINDER_CTA + '">' +
        '<div class="' + photoClass + '">' + badgeHtml + photoInner + "</div>" +
        "<h4>" + item.title + "</h4>" +
        '<p class="recent-card-stars">' + starString(item.rating) + ' <span>' + item.rating + "/5 \u00b7 ~\u20AC" + item.price_eur.toLocaleString() + "</span></p>" +
        '<p class="finder-mobile-best-desc">' + (item.summary || "") + "</p>" +
      "</a>";
  }

  function computeMatch() {
    var pool = window.WB_FINDER_INDEX.slice();

    if (state.usage.length) {
      var categories = state.usage.map(function (u) { return USAGE_CATEGORY[u]; });
      pool = pool.filter(function (item) { return categories.indexOf(item.category) !== -1; });
    }
    if (!pool.length) return null;

    var usedFallback = false;
    if (state.budget.length) {
      var ranges = state.budget.map(function (b) { return BUDGET_RANGES[b]; });
      var inBudget = pool.filter(function (item) {
        return ranges.some(function (r) { return item.price_eur >= r[0] && item.price_eur <= r[1]; });
      });
      if (inBudget.length) {
        pool = inBudget;
      } else {
        usedFallback = true; // no exact match in any selected range -- show the closest fit instead
      }
    }

    return { best: pickRanked(pool, state.usecase)[0], usedFallback: usedFallback };
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
