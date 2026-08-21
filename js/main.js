document.addEventListener("DOMContentLoaded", function () {
  initMobileDrawer();

  
  
  
  
  
  
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

  
  
  

  
  initSiteSearch();

  
  initReviewsFilter();

  
  initProductGallery();
  initRubricExplainerTabs();
  initRubricAccordion();
  initMobileRubricPlacement();
  initMobileRelatedPlacement();
  initRecentStacks();
  initCategoryTabs();
  initProductFinder();

  
  initTablePagination();

  
  
  
  
  
  initLanguageMemory();
});









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
      
      
      window.location.replace(window.WB_ALT_LINKS[stored]);
      return;
    }
    showLanguageBanner(stored, BANNER_TEXT[stored]);
    return;
  }

  if (!stored) {
    
    
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
  var categories = window.WB_CATEGORIES || []; 
  var activeCategory = null; 

  var VISIBLE_ROWS = 5;
  var RENDER_CAP = 20; 
  var MIN_QUERY_LENGTH = 2;

  
  
  
  
  
  
  
  
  
  
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

    
    
    
    
    if (!activeCategory && query.length < MIN_QUERY_LENGTH) { renderSuggested(); return; }

    
    
    
    
    loadIndex().then(function (data) {
      var pool = activeCategory
        ? data.filter(function (item) { return item.subtitle === activeCategory.label; })
        : data;

      var matches = query
        ? pool.filter(function (item) {
            return item.title.toLowerCase().indexOf(query) !== -1 || item.subtitle.toLowerCase().indexOf(query) !== -1;
          })
        : pool;

      
      
      
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
    loadIndex(); 
    if (input.value.trim() || activeCategory) runSearch(input.value);
    else renderSuggested();
  });

  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault(); 
      goToResults();
    } else if (e.key === "Backspace" && !input.value && activeCategory) {
      
      
      clearActiveCategory();
      renderSuggested();
    }
  });

  if (button) {
    button.addEventListener("click", function (e) {
      e.preventDefault(); 
      goToResults();
    });
  }

  document.addEventListener("click", function (e) {
    if (!e.target.closest(".hero-search")) resultsBox.classList.remove("open");
  });
}

function initReviewsFilter() {
  var grid = document.getElementById("review-grid");
  if (!grid) return; 

  var catalogGrid = document.getElementById("catalog-results-grid");
  var paginationEl = document.getElementById("review-pagination");
  var cards = Array.prototype.slice.call(grid.querySelectorAll(".review-card"));
  var pills = Array.prototype.slice.call(document.querySelectorAll(".filter-pill"));
  var sortSelect = document.getElementById("review-sort");
  var countLabel = document.querySelector(".review-count");
  var emptyMsg = document.querySelector(".review-empty");
  var strings = window.WB_REVIEWS_STRINGS || { showingCount: "Showing {shown} of {total}", noMatches: "No matches." };

  
  
  
  
  
  
  
  var state = { category: "all", sort: "recent", catalogPage: 1, query: "", brands: [] };

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
    sorted.forEach(function (c) { grid.appendChild(c); }); 

    if (countLabel) {
      var pageTotal = (typeof window.WB_TOTAL_REVIEWS === "number") ? window.WB_TOTAL_REVIEWS : cards.length;
      countLabel.textContent = strings.showingCount.replace("{shown}", cards.length).replace("{total}", pageTotal);
    }
    if (emptyMsg) emptyMsg.hidden = true; 
  }

  
  
  
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

    
    
    
    
    
    
    
    var bonusSum = (item.portability_bonus || 0) + (item.rugged_bonus || 0) + (item.ups_bonus || 0);
    var bonusHtml = bonusSum > 0 ? ' <span class="bonus-indicator">(+' + bonusSum + ')</span>' : "";

    
    
    
    
    
    
    
    
    
    
    
    
    var starFilled = Math.max(0, Math.min(5, Math.round(item.rating)));
    var starStr = "\u2605".repeat(starFilled) + "\u2606".repeat(5 - starFilled);
    var totalLineHtml = '<div class="rubric-total-line">' +
      '<span class="rubric-total-label">' + (window.WB_RUBRIC_TOTAL_LABEL || "Overall Score") + '</span>' +
      '<span class="rubric-total-stars">' + starStr + '</span>' +
      '<span class="rubric-total-score">' + item.rating + '/5' + bonusHtml + '</span>' +
      '</div>';

    
    
    
    
    
    
    
    
    
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

    
    
    
    
    
    
    
    
    
    
    var buyButtonsHtml = "";
    if (item.amazon_url || item.brand_buy_url) {
      var bothMuted = item.amazon_url && item.amazon_unavailable && item.brand_buy_url && item.awin_unavailable;
      var amazonBtnHtml = "";
      if (item.amazon_url) {
        amazonBtnHtml = item.amazon_unavailable
          ? '<span class="card-buy-btn card-buy-btn-muted" aria-disabled="true">' + (window.WB_CURRENTLY_UNAVAILABLE_LABEL || "Currently not available") + '</span>'
          : '<a href="' + item.amazon_url + '" class="card-buy-btn" rel="sponsored nofollow noopener" target="_blank">' + (window.WB_BUY_AMAZON_LABEL || "Amazon.de Price Check") + '</a>';
      }
      var brandBtnHtml = "";
      if (item.brand_buy_url && !bothMuted) {
        brandBtnHtml = item.awin_unavailable
          ? '<span class="card-buy-btn card-buy-btn-alt card-buy-btn-muted" aria-disabled="true">' + (window.WB_CURRENTLY_UNAVAILABLE_LABEL || "Currently not available") + '</span>'
          : '<a href="' + item.brand_buy_url + '" class="card-buy-btn card-buy-btn-alt" rel="sponsored nofollow noopener" target="_blank">' + (item.brand_buy_label || (item.brand + " Store")) + '</a>';
      }
      buyButtonsHtml = '<div class="card-buy-row">' + amazonBtnHtml + brandBtnHtml + '</div>';
    }

    
    
    
    
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
    if (!catalogIndex) return; 

    grid.hidden = true;
    catalogGrid.hidden = false;
    if (paginationEl) paginationEl.hidden = true; 

    var matching;
    if (state.query) {
      
      
      
      var q = state.query.toLowerCase();
      matching = catalogIndex.filter(function (item) {
        return (item.brand + " " + item.model).toLowerCase().indexOf(q) !== -1;
      });
    } else {
      matching = state.category === "all"
        ? catalogIndex.slice()
        : catalogIndex.filter(function (item) { return item.category === state.category; });
    }
    matching = matching.filter(function (item) { return state.brands.indexOf(item.brand) !== -1; });
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
    
    
    
    
    
    
    
    
    
    
    
    
    if (!state.query && state.brands.length === ALL_BRAND_VALUES.length && state.category === "all" && state.sort === "recent") {
      showPageView();
    } else {
      loadCatalogIndex().then(showCatalogView);
    }
  }

  
  
  
  
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

  pills.forEach(function (pill) {
    pill.addEventListener("click", function () {
      pills.forEach(function (p) { p.classList.remove("active"); });
      pill.classList.add("active");
      state.category = pill.getAttribute("data-filter-category");
      state.catalogPage = 1;
      apply();
    });
  });

  if (sortSelect) {
    sortSelect.addEventListener("change", function () {
      state.sort = sortSelect.value;
      state.catalogPage = 1;
      apply();
    });
  }

  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  var searchInput = document.querySelector(".page-search-input");
  var searchBtn = document.querySelector(".page-search-btn");
  var MIN_QUERY_LENGTH = 2;

  function setSearchQuery(query) {
    state.query = query.length >= MIN_QUERY_LENGTH ? query : "";
    state.category = "all";
    pills.forEach(function (p) { p.classList.toggle("active", p.getAttribute("data-filter-category") === "all"); });
    state.catalogPage = 1;
    apply();
  }

  function runSearch() {
    if (!searchInput) return;
    var query = searchInput.value.trim();
    loadCatalogIndex().then(function () { setSearchQuery(query); });
  }

  if (searchInput) {
    searchInput.addEventListener("focus", function () { loadCatalogIndex(); }, { once: true });
    searchInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); runSearch(); }
    });
  }
  if (searchBtn) {
    searchBtn.addEventListener("click", runSearch);
  }

  
  
  
  
  
  
  
  
  
  var brandToggle = document.getElementById("brand-filter-toggle");
  var brandPanel = document.getElementById("brand-filter-panel");
  var brandCount = document.getElementById("brand-filter-count");
  var brandSelectAll = document.getElementById("brand-filter-select-all");
  var brandCheckboxes = Array.prototype.slice.call(document.querySelectorAll(".brand-filter-checkbox"));
  var ALL_BRAND_VALUES = brandCheckboxes.map(function (c) { return c.value; });
  state.brands = ALL_BRAND_VALUES.slice();

  function updateBrandCount() {
    if (!brandCount) return;
    var excluded = ALL_BRAND_VALUES.length - state.brands.length;
    if (excluded > 0) {
      brandCount.textContent = excluded;
      brandCount.hidden = false;
    } else {
      brandCount.hidden = true;
    }
  }

  var brandSelectAllLabel = document.getElementById("brand-filter-select-all-label");

  function syncSelectAllState() {
    if (!brandSelectAll) return;
    var allSelected = state.brands.length === ALL_BRAND_VALUES.length;
    brandSelectAll.checked = allSelected;
    brandSelectAll.indeterminate = state.brands.length > 0 && !allSelected;
    if (brandSelectAllLabel) {
      brandSelectAllLabel.textContent = allSelected
        ? brandSelectAll.getAttribute("data-deselect-all-label")
        : brandSelectAll.getAttribute("data-select-all-label");
    }
  }

  function applyBrandChange() {
    state.catalogPage = 1;
    updateBrandCount();
    loadCatalogIndex().then(apply);
  }

  if (brandToggle && brandPanel) {
    brandToggle.addEventListener("click", function () {
      var open = brandPanel.hidden;
      brandPanel.hidden = !open;
      brandToggle.setAttribute("aria-expanded", String(open));
    });
    document.addEventListener("click", function (e) {
      if (!e.target.closest(".brand-control")) {
        brandPanel.hidden = true;
        brandToggle.setAttribute("aria-expanded", "false");
      }
    });
  }
  if (brandSelectAll) {
    brandSelectAll.addEventListener("change", function () {
      var checkAll = brandSelectAll.checked;
      brandCheckboxes.forEach(function (c) { c.checked = checkAll; });
      state.brands = checkAll ? ALL_BRAND_VALUES.slice() : [];
      syncSelectAllState();
      applyBrandChange();
    });
  }
  brandCheckboxes.forEach(function (cb) {
    cb.addEventListener("change", function () {
      state.brands = brandCheckboxes.filter(function (c) { return c.checked; }).map(function (c) { return c.value; });
      syncSelectAllState();
      applyBrandChange();
    });
  });

  
  
  
  
  
  try {
    var qParam = new URLSearchParams(window.location.search).get("q");
    if (qParam && searchInput) {
      searchInput.value = qParam;
      loadCatalogIndex().then(function () { setSearchQuery(qParam); });
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

    
    
    
    
    function showPage(pageIndex) {
      var rows = Array.prototype.slice.call(tbody.querySelectorAll("tr"));
      rows.forEach(function (row, i) {
        row.hidden = Math.floor(i / pageSize) !== pageIndex;
      });
      renderPaginationBar(pageIndex);
    }

    
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

    syncToIndex(0); 
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

  
  
  var photos = [];
  document.querySelectorAll(".gallery-slide").forEach(function (slide) {
    photos.push({ full: slide.getAttribute("data-full"), credit: slide.getAttribute("data-credit") || "", alt: slide.getAttribute("data-alt") || "" });
  });
  if (!photos.length) {
    var single = document.querySelector(".product-photo[data-full]");
    if (single) {
      var creditP = single.parentElement.querySelector(".gallery-credit");
      photos.push({ full: single.getAttribute("data-full"), credit: creditP ? creditP.textContent : "", alt: single.getAttribute("data-alt") || "" });
    }
  }
  if (!photos.length) return;

  var current = 0;

  function show(idx) {
    current = Math.max(0, Math.min(photos.length - 1, idx));
    img.src = photos[current].full;
    img.alt = photos[current].alt;
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
      e.stopPropagation(); 
      tabs.forEach(function (t) { t.classList.remove("active"); });
      tab.classList.add("active");
      textEl.textContent = tab.getAttribute("data-explain");
    });
  });
}








function initRubricAccordion() {
  var triggers = Array.prototype.slice.call(document.querySelectorAll(".rubric-accordion-trigger"));
  triggers.forEach(function (trigger) {
    var bodyId = trigger.getAttribute("aria-controls");
    var body = bodyId ? document.getElementById(bodyId) : null;
    if (!body) return;
    trigger.addEventListener("click", function () {
      var expanded = trigger.getAttribute("aria-expanded") === "true";
      trigger.setAttribute("aria-expanded", String(!expanded));
      body.hidden = expanded;
    });
  });
}




















function initMobileRubricPlacement() {
  var rubricBlock = document.querySelector(".rubric-static-block");
  var mainBottom = document.querySelector(".review-main-bottom");
  if (!rubricBlock || !mainBottom) return; 

  
  
  
  
  var originalParent = rubricBlock.parentNode;
  var originalNextSibling = rubricBlock.nextSibling; 

  function applyPlacement(isMobile) {
    if (isMobile) {
      if (mainBottom.firstChild !== rubricBlock) {
        mainBottom.insertBefore(rubricBlock, mainBottom.firstChild);
      }
    } else if (rubricBlock.parentNode !== originalParent) {
      originalParent.insertBefore(rubricBlock, originalNextSibling);
    }
  }

  var mq = window.matchMedia("(max-width: 1300px)");
  applyPlacement(mq.matches);
  function handleMqChange(e) { applyPlacement(e.matches); }
  if (mq.addEventListener) mq.addEventListener("change", handleMqChange);
  else mq.addListener(handleMqChange); 
}

function initMobileRelatedPlacement() {
  var relatedSection = document.querySelector(".review-related-section");
  var mainBottom = document.querySelector(".review-main-bottom");
  if (!relatedSection || !mainBottom) return; 

  var originalParent = relatedSection.parentNode;
  var originalNextSibling = relatedSection.nextSibling;

  function applyPlacement(isMobile) {
    if (isMobile) {
      if (relatedSection.parentNode !== mainBottom) {
        mainBottom.appendChild(relatedSection);
      }
    } else if (relatedSection.parentNode !== originalParent) {
      originalParent.insertBefore(relatedSection, originalNextSibling);
    }
  }

  var mq2 = window.matchMedia("(max-width: 1300px)");
  applyPlacement(mq2.matches);
  function handleMq2Change(e) { applyPlacement(e.matches); }
  if (mq2.addEventListener) mq2.addEventListener("change", handleMq2Change);
  else mq2.addListener(handleMq2Change);
}

function initRecentStacks() {
  document.querySelectorAll("[data-stack]").forEach(function (stack) {
    var cards = Array.prototype.slice.call(stack.querySelectorAll("[data-stack-card]"));
    var dots = Array.prototype.slice.call(stack.querySelectorAll(".recent-stack-dot"));
    var total = cards.length;
    if (total < 2) return; 

    var front = 0;

    function layout() {
      cards.forEach(function (card, i) {
        card.dataset.stackPos = (i - front + total) % total;
      });
      dots.forEach(function (dot, i) { dot.classList.toggle("active", i === front); });
    }
    layout();

    
    
    
    function goTo(index) {
      front = ((index % total) + total) % total;
      layout();
    }

    dots.forEach(function (dot, i) {
      dot.addEventListener("click", function () { goTo(i); });
    });

    
    
    
    
    var backBtn = stack.querySelector(".recent-stack-back");
    var nextBtn = stack.querySelector(".recent-stack-next");
    if (backBtn) backBtn.addEventListener("click", function () { goTo(front - 1); });
    if (nextBtn) nextBtn.addEventListener("click", function () { goTo(front + 1); });
  });
}






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

  
  
  
  
  
  
  var state = { usage: [], usecase: [], budget: [] };

  function canSubmit() {
    return state.usage.length > 0 && state.usecase.length > 0;
  }
  function updateSubmitAvailability() {
    if (submitBtn && !hasShownResult) submitBtn.disabled = !canSubmit();
  }

  
  
  
  
  
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
          if (state[groupName][0] === value) return; 
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
  var hasShownResult = false; 

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
    if (!showingResult) updateSubmitAvailability(); 
  }
  
  
  
  
  
  
  
  function setPillsInteractive(enabled) {
    panel.querySelectorAll(".finder-pill").forEach(function (pill) {
      pill.disabled = !enabled;
    });
  }
  var mq = window.matchMedia("(max-width: 700px)");
  var isMobile = mq.matches;
  
  
  
  
  
  var wizardStep = 0;

  function updateWizardView() {
    
    
    
    
    
    
    
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
  else mq.addListener(handleMqChange); 

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
    
  }

  updateWizardView();

  
  
  
  
  
  var USAGE_FILTERS = {
    phone: function (item) { return item.category === "power-banks" || item.effective_wh <= 300; },
    laptop: function (item) { return item.effective_wh >= 300 && item.effective_wh <= 1000; },
    fridge: function (item) { return item.effective_wh >= 1000 && item.output_w >= 1000; },
  };

  
  
  
  
  
  
  
  var USECASE_FILTERS = {
    traveling: function (item) { return item.weight_kg != null && item.weight_kg <= 1.5; },
    camping: function (item) { return item.weight_kg != null && item.weight_kg <= 25 && item.effective_wh >= 300; },
    offgrid: function (item) { return item.category === "power-stations" && item.effective_wh >= 500; },
  };
  var BUDGET_RANGES = { micro: [0, 100], low: [100, 400], high: [400, Infinity] };

  
  
  
  
  
  var COMBO_RULES = {
    "phone:camping": {
      
      
      
      filter: function (item) { return item.category === "power-banks"; },
      score: function (item) { return item.reliability * 10 + (item.is_rugged ? 2 : 0); }
    },
    "laptop:camping": {
      
      
      
      filter: function (item) { return item.category === "power-banks"; },
      score: function (item) { return -Math.abs(item.output_w - 100); }
    },
    "fridge:traveling": {
      
      
      
      
      
      
      filter: function (item) { return item.category === "power-stations" && USAGE_FILTERS.fridge(item); },
      score: function (item) { return item.weight_kg != null ? -item.weight_kg : -Infinity; }
    },
    "fridge:camping": {
      
      
      
      filter: function (item) { return item.category === "power-stations" && USAGE_FILTERS.fridge(item); },
      score: function (item) { return item.power * 10 + (item.is_rugged ? 5 : 0) - Math.abs(item.output_w - 1200) / 100; }
    },
    "fridge:offgrid": {
      
      
      
      
      filter: function (item) { return item.category === "power-stations" && USAGE_FILTERS.fridge(item); },
      score: function (item) { return item.effective_wh + (item.is_ups_10ms ? 200 : 0); }
    }
  };


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

    var usage = state.usage[0], usecase = state.usecase[0];
    var combo = (usage && usecase) ? COMBO_RULES[usage + ":" + usecase] : null;

    var narrowed, scoreFn;

    if (combo) {
      var afterCombo = pool.filter(combo.filter);
      narrowed = afterCombo.length ? afterCombo : pool;
      if (!afterCombo.length) usedFallback = true;
      scoreFn = combo.score;
    } else {
      var usageFn = state.usage.length ? USAGE_FILTERS[state.usage[0]] : null;
      var usecaseFn = state.usecase.length ? USECASE_FILTERS[state.usecase[0]] : null;

      var afterUsage = usageFn ? pool.filter(usageFn) : pool;
      if (!afterUsage.length) { afterUsage = pool; usedFallback = true; } 

      narrowed = afterUsage;
      if (usecaseFn) {
        var afterUsecase = afterUsage.filter(usecaseFn);
        if (afterUsecase.length) {
          narrowed = afterUsecase;
        } else {
          usedFallback = true; 
        }
      }
      scoreFn = function (item) { return item.rating; };
    }

    if (state.budget.length) {
      var ranges = state.budget.map(function (b) { return BUDGET_RANGES[b]; });
      var inBudget = narrowed.filter(function (item) {
        return ranges.some(function (r) { return item.price_eur >= r[0] && item.price_eur <= r[1]; });
      });
      if (inBudget.length) {
        narrowed = inBudget;
      } else {
        usedFallback = true; 
      }
    }

    
    
    
    
    
    
    var withOffer = narrowed.filter(function (item) { return item.has_offer; });
    var rankPool = withOffer.length ? withOffer : narrowed;
    if (!withOffer.length && narrowed.length) usedFallback = true;

    rankPool = rankPool.slice().sort(function (a, b) { return scoreFn(b) - scoreFn(a); });
    return { best: rankPool[0], usedFallback: usedFallback };
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

  setSubmitButtonState(false); 
}
