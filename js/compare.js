(function(){
  "use strict";

  var strings = window.WB_COMPARE_TOOL_STRINGS || {};
  var indexPromise = null;
  function loadIndex(){
    if (!indexPromise) {
      indexPromise = fetch(window.WB_ROOT + "compare-index.json").then(function(r){ return r.json(); });
    }
    return indexPromise;
  }

  // ---- searchable combobox picker, replacing the old native <select>.
  // Two things forced this rebuild, not just a styling tweak: native
  // <option> elements can't be reliably restyled for dark mode across
  // browsers, and there was no way to restrict the second product to
  // the first one's category with a plain <select> without a jarring
  // full repopulation. This owns its own tabs (filtering by category,
  // same visual component as the homepage's mobile tabs) and its own
  // results list (sorted by rating, filtered by the typed query and by
  // whatever the other slot already has selected, so a product can't
  // be compared to itself). ----
  function initCombo(comboEl, products, byId, onSelect){
    var slot = comboEl.getAttribute("data-compare-slot");
    var input = comboEl.querySelector(".compare-combo-input");
    var panel = comboEl.querySelector(".compare-combo-panel");
    var resultsEl = comboEl.querySelector(".compare-combo-results");
    var tabs = Array.prototype.slice.call(comboEl.querySelectorAll(".recent-tab"));
    var activeCategory = tabs.length ? tabs[0].getAttribute("data-category-tab") : null;
    var selectedId = null;
    var excludeId = null;

    function setActiveTab(cat){
      activeCategory = cat;
      tabs.forEach(function(t){
        var isActive = t.getAttribute("data-category-tab") === cat;
        t.classList.toggle("active", isActive);
        t.setAttribute("aria-selected", isActive ? "true" : "false");
      });
    }

    var searchQuery = "";

    function renderResults(){
      var pool = products.filter(function(p){
        if (p.category !== activeCategory) return false;
        if (excludeId && p.id === excludeId) return false;
        if (searchQuery && (p.brand + " " + p.model).toLowerCase().indexOf(searchQuery) === -1) return false;
        return true;
      }).sort(function(a, b){ return b.overall_score - a.overall_score; });

      if (!pool.length) {
        resultsEl.innerHTML = '<div class="compare-combo-empty">' + strings.placeholder + '</div>';
        return;
      }
      resultsEl.innerHTML = pool.map(function(p){
        return '<button type="button" class="compare-combo-result" data-id="' + p.id + '">' +
          '<span class="r-title">' + p.brand + ' ' + p.model + '</span>' +
          '<span class="compare-combo-score ' + scoreClass(p.overall_score) + '">' + p.overall_score + '</span>' +
          '</button>';
      }).join("");
      Array.prototype.slice.call(resultsEl.querySelectorAll(".compare-combo-result")).forEach(function(btn){
        btn.addEventListener("click", function(){ select(btn.getAttribute("data-id")); });
      });
    }

    function select(id){
      var p = byId[id];
      if (!p) return;
      if (excludeId && id === excludeId) return; // never allow comparing a product to itself
      selectedId = id;
      input.value = p.brand + " " + p.model;
      closePanel();
      onSelect(p, slot);
    }

    function openPanel(){ panel.classList.add("open"); renderResults(); }
    function closePanel(){ panel.classList.remove("open"); }

    tabs.forEach(function(tab){
      tab.addEventListener("click", function(){
        if (tab.disabled) return;
        setActiveTab(tab.getAttribute("data-category-tab"));
        renderResults();
      });
    });
    input.addEventListener("focus", function(){
      searchQuery = "";
      input.select();
      openPanel();
    });
    input.addEventListener("input", function(){
      searchQuery = input.value.trim().toLowerCase();
      openPanel();
    });
    document.addEventListener("click", function(e){
      if (!comboEl.contains(e.target)) closePanel();
    });

    return {
      // Resets this combo back to no selection -- called by the OTHER
      // slot's onChange when a category mismatch is detected, so
      // picking a different category on one side clears the other
      // side's now-invalid pairing instead of being blocked from
      // happening in the first place.
      clear: function(){
        selectedId = null;
        input.value = "";
      },
      setExcludeId: function(id){ excludeId = id; },
      setSelected: function(id){
        var p = byId[id];
        if (!p) return;
        selectedId = id;
        input.value = p.brand + " " + p.model;
        setActiveTab(p.category);
      },
      getSelectedId: function(){ return selectedId; }
    };
  }

  // ---- spec rows: mirrors COMPARE_SPEC_ROWS / compare_row_display() /
  // compare_row_raw() in build.py field-for-field -- same row ids, same
  // category applicability, same higher-is-better direction, same
  // formatting per field. Keeping this list identical to the Python
  // side (not just similar) is the actual point of shipping raw values
  // in compare-index.json rather than pre-formatted text: one canonical
  // ruleset, expressed twice because Python and JS can't literally
  // share code, not two independently-drifting ones. ----
  var SPEC_ROWS = [
    { id: "price_eur", cats: ["power-stations", "power-banks", "chargers"], higherBetter: false },
    { id: "capacity_wh", cats: ["power-stations"], higherBetter: true },
    { id: "capacity_mah", cats: ["power-banks"], higherBetter: true },
    { id: "total_output_w", cats: ["power-stations", "power-banks", "chargers"], higherBetter: true },
    { id: "total_input_w", cats: ["power-stations", "power-banks", "chargers"], higherBetter: true },
    { id: "weight_g", cats: ["power-stations", "power-banks", "chargers"], higherBetter: false },
    { id: "charge_time_minutes", cats: ["power-stations", "power-banks"], higherBetter: false },
    { id: "battery", cats: ["power-stations", "power-banks"], higherBetter: null },
    { id: "cycles", cats: ["power-stations", "power-banks"], higherBetter: null },
    { id: "warranty_months", cats: ["power-stations", "power-banks", "chargers"], higherBetter: true },
    { id: "is_rugged", cats: ["power-stations", "power-banks", "chargers"], higherBetter: true },
    { id: "is_ups_10ms", cats: ["power-stations"], higherBetter: true }
  ];

  function rowLabel(id){
    return {
      price_eur: strings.rowPrice, capacity_wh: strings.rowCapacity, capacity_mah: strings.rowCapacity,
      total_output_w: strings.rowOutput, total_input_w: strings.rowInput, weight_g: strings.rowWeight,
      charge_time_minutes: strings.rowChargeTime, battery: strings.rowBattery, cycles: strings.rowCycles,
      warranty_months: strings.rowWarranty, is_rugged: strings.rowRugged, is_ups_10ms: strings.rowUps
    }[id];
  }

  function formatWeight(g){
    if (!g) return null;
    return g < 1000 ? Math.round(g) + " g" : (g / 1000).toFixed(1) + " kg";
  }
  function formatChargeTime(min){
    if (!min) return null;
    return min < 60 ? min + " min" : (min / 60).toFixed(1) + " hours";
  }
  function warrantyYears(months){
    if (!months) return null;
    var years = months / 12;
    return years === Math.trunc(years) ? Math.trunc(years) : Math.round(years * 10) / 10;
  }

  function rowDisplay(id, p){
    switch (id) {
      case "price_eur": return p.price_eur ? "\u20ac" + p.price_eur.toLocaleString() : null;
      case "capacity_wh": return p.capacity_wh ? p.capacity_wh.toLocaleString() + " Wh" : null;
      case "capacity_mah": return p.capacity_mah ? p.capacity_mah.toLocaleString() + " mAh" : null;
      case "total_output_w": return p.total_output_w ? p.total_output_w.toLocaleString() + " W" : null;
      case "total_input_w": return p.total_input_w ? p.total_input_w.toLocaleString() + " W" : null;
      case "weight_g": return formatWeight(p.weight_g);
      case "charge_time_minutes": return formatChargeTime(p.charge_time_minutes);
      case "battery": return p.battery || null;
      case "cycles": return p.cycles || null;
      case "warranty_months":
        var yrs = warrantyYears(p.warranty_months);
        return yrs === null ? null : yrs + " " + strings.yearsWord;
      case "is_rugged": return p.is_rugged ? strings.yes : strings.no;
      case "is_ups_10ms": return p.is_ups_10ms ? strings.yes : strings.no;
    }
    return null;
  }
  function rowRaw(id, p){
    if (id === "is_rugged" || id === "is_ups_10ms") return p[id] ? 1 : 0;
    return p[id] || 0;
  }

  function buildSpecRows(p1, p2){
    var rows = [];
    SPEC_ROWS.forEach(function(row){
      var applies1 = row.cats.indexOf(p1.category) !== -1;
      var applies2 = row.cats.indexOf(p2.category) !== -1;
      if (!applies1 && !applies2) return;
      var d1 = applies1 ? rowDisplay(row.id, p1) : null;
      var d2 = applies2 ? rowDisplay(row.id, p2) : null;
      if (d1 === null && d2 === null) return;
      var winner = null;
      if (row.higherBetter !== null && d1 !== null && d2 !== null) {
        var v1 = rowRaw(row.id, p1), v2 = rowRaw(row.id, p2);
        if (v1 !== v2) winner = (v1 > v2) === row.higherBetter ? 1 : 2;
      }
      rows.push({ label: rowLabel(row.id), value1: d1 === null ? "\u2014" : d1, value2: d2 === null ? "\u2014" : d2, winner: winner });
    });
    return rows;
  }

  function scoreClass(score){
    if (score >= 4) return "compare-score-good";
    if (score >= 3) return "compare-score-mid";
    return "compare-score-low";
  }

  function rubricBars(p){
    var rows = [
      [strings.rubricValue, p.value], [strings.rubricPower, p.power],
      [strings.rubricPortability, p.portability],
      [p.category === "chargers" ? strings.rubricEfficiency : strings.rubricChargeSpeed, p.charge_speed],
      [strings.rubricReliability, p.reliability]
    ];
    var html = '<div class="rubric-viz">';
    rows.forEach(function(pair){
      if (pair[1] == null) return;
      html += '<div class="rubric-bar-row"><span class="rubric-bar-label">' + pair[0] + '</span>' +
        '<div class="rubric-bar-track"><div class="rubric-bar-fill" style="width:' + Math.round(pair[1] / 5 * 100) + '%"></div></div>' +
        '<span class="rubric-bar-pct">' + pair[1] + '/5</span></div>';
    });
    return html + "</div>";
  }

  function buyRow(p){
    var html = '<div class="card-buy-row compare-head-footer">';
    if (p.amazon_url) {
      html += p.amazon_unavailable
        ? '<span class="card-buy-btn card-buy-btn-muted" aria-disabled="true">' + strings.currentlyUnavailable + '</span>'
        : '<a href="' + p.amazon_url + '" class="card-buy-btn" rel="sponsored nofollow" target="_blank">' + strings.buyAmazon + '</a>';
    }
    if (p.brand_buy_url) {
      html += p.awin_unavailable
        ? '<span class="card-buy-btn card-buy-btn-alt card-buy-btn-muted" aria-disabled="true">' + strings.currentlyUnavailable + '</span>'
        : '<a href="' + p.brand_buy_url + '" class="card-buy-btn card-buy-btn-alt" rel="sponsored nofollow" target="_blank">' + p.brand_buy_label + '</a>';
    }
    return html + "</div>";
  }

  function renderComparison(container, p1, p2){
    var winnerId = p1.overall_score >= p2.overall_score ? p1.id : p2.id;
    var headsHtml = [p1, p2].map(function(p){
      var img = p.image
        ? '<img src="' + window.WB_ROOT + p.image + '" alt="' + p.brand + ' ' + p.model + '" loading="lazy">'
        : '<span class="table-thumb-placeholder">\u26a1</span>';
      return '<div class="compare-head">' +
        '<a href="' + window.WB_ROOT + p.url + '" class="compare-head-photo">' + img + '</a>' +
        '<span class="brand">' + p.brand + '</span>' +
        '<h2><a href="' + window.WB_ROOT + p.url + '">' + p.model + '</a></h2>' +
        '<div class="compare-score-wrap">' +
        '<span class="compare-score ' + scoreClass(p.overall_score) + '">' + p.overall_score + '</span>' +
        (p.id === winnerId ? '<span class="compare-winner-badge">' + strings.winnerBadge + '</span>' : '') +
        '</div>' +
        rubricBars(p) +
        '<a class="compare-full-review-link" href="' + window.WB_ROOT + p.url + '">' + strings.viewFullReview + ' \u2192</a>' +
        '<div class="compare-head-footer">' + buyRow(p) + '</div>' +
        '</div>';
    }).join("");

    var rows = buildSpecRows(p1, p2);
    var rowsHtml = rows.map(function(r){
      return '<tr><td>' + r.label + '</td>' +
        '<td class="' + (r.winner === 1 ? "compare-winner-cell" : "") + '">' + r.value1 + '</td>' +
        '<td class="' + (r.winner === 2 ? "compare-winner-cell" : "") + '">' + r.value2 + '</td></tr>';
    }).join("");

    container.innerHTML =
      '<div class="compare-heads">' + headsHtml + '</div>' +
      '<h2>' + strings.specTableH2 + '</h2>' +
      '<div class="table-scroll"><table class="spec-table compare-spec-table"><thead><tr><th></th><th>' +
      p1.brand + ' ' + p1.model + '</th><th>' + p2.brand + ' ' + p2.model + '</th></tr></thead>' +
      '<tbody>' + rowsHtml + '</tbody></table></div>';
  }

  function init(){
    var comboA = document.querySelector('.compare-combo[data-compare-slot="a"]');
    var comboB = document.querySelector('.compare-combo[data-compare-slot="b"]');
    if (!comboA || !comboB) return;

    var resultEl = document.getElementById("compare-tool-result"); // present on the dynamic tool only
    var current = window.WB_COMPARE_CURRENT; // present on a static pair page only

    loadIndex().then(function(products){
      var byId = {};
      products.forEach(function(p){ byId[p.id] = p; });

      var params = new URLSearchParams(location.search);
      var initialA = (current && current.a) || params.get("a") || "";
      var initialB = (current && current.b) || params.get("b") || "";
      // A query-string pair from a stale/hand-edited link could name the
      // same product twice, or two different categories -- neither is a
      // valid pair under the same-category, no-self-compare rules, so
      // only trust initialB if it's actually a different product in the
      // same category as initialA.
      if (initialA && initialB && byId[initialA] && byId[initialB] &&
          (initialA === initialB || byId[initialA].category !== byId[initialB].category)) {
        initialB = "";
      }

      function renderIfReady(pushUrl){
        var a = byId[ctrlA.getSelectedId()], b = byId[ctrlB.getSelectedId()];
        if (!a || !b || a.id === b.id || !resultEl) return;
        resultEl.innerHTML = '<div class="finder-loading"><div class="finder-loading-spinner"></div><p>' + strings.loadingText + '</p></div>';
        setTimeout(function(){
          renderComparison(resultEl, a, b);
          if (pushUrl) {
            var url = new URL(location.href);
            url.searchParams.set("a", a.id);
            url.searchParams.set("b", b.id);
            history.replaceState(null, "", url);
          }
        }, 650);
      }

      function onChange(p, changedSlot){
        if (p) {
          var otherCtrl = changedSlot === "a" ? ctrlB : ctrlA;
          var otherId = otherCtrl.getSelectedId();
          if (otherId && byId[otherId] && byId[otherId].category !== p.category) {
            otherCtrl.clear();
          }
        }
        var aId = ctrlA.getSelectedId(), bId = ctrlB.getSelectedId();
        ctrlA.setExcludeId(bId);
        ctrlB.setExcludeId(aId);

        if (resultEl) {
          renderIfReady(true);
        } else if (aId && bId && aId !== bId) {
          // Static pair page -- any two same-category products can
          // always be compared on the dynamic tool, so that's the one
          // destination that's always valid to send a changed
          // selection to, rather than guessing whether a matching
          // static page happens to exist.
          var compareRoot = window.WB_ROOT + "compare/index.html";
          location.href = compareRoot + "?a=" + encodeURIComponent(aId) + "&b=" + encodeURIComponent(bId);
        }
      }

      var ctrlA = initCombo(comboA, products, byId, onChange);
      var ctrlB = initCombo(comboB, products, byId, onChange);

      if (initialA) ctrlA.setSelected(initialA);
      if (initialB) ctrlB.setSelected(initialB);
      onChange(null, null);

      if (resultEl && initialA && initialB) renderIfReady(false);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
