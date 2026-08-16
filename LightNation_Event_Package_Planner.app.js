// ---- Rendering ----
  function chipClass(tag){ return (tag==="premium"||tag==="beam"||tag==="hybrid") ? "premium" : "ok"; }

  function persistFixtureOverrides(){
    const o = {};
    state.fixtures.forEach(f => { o[f.sku] = { rate:f.rate, qty:f.qty }; });
    saveFixtureOverrides(o);
  }

  function renderFixtures(){
    const tbody = $("fixtureTable").querySelector("tbody");
    tbody.innerHTML = "";

    state.fixtures.forEach((f, idx) => {
      const tr = document.createElement("tr");
      const tags = (f.tags||[]).map(t=>`<span class="chip ${chipClass(t)}">${t}</span>`).join("");

      const rateCell = state.editMode==="YES"
        ? `<input class="mini" type="number" min="0" step="1" value="${f.rate}" data-kind="rate" data-idx="${idx}" />`
        : `${money(f.rate)}`;

      const availCell = state.editMode==="YES"
        ? `<input class="qty" type="number" min="0" step="1" value="${f.qty}" data-kind="qty" data-idx="${idx}" />`
        : `${f.qty}`;

      tr.innerHTML = `
        <td>${f.category}</td>
        <td><div style="font-weight:600">${f.name}</div><small>${f.sku}</small></td>
        <td class="num">${rateCell}</td>
        <td class="center">${availCell}</td>
        <td class="center">${f.suggestedQty}</td>
        <td class="center"><input class="qty" type="number" min="0" step="1" value="${f.finalQty}" data-kind="final" data-idx="${idx}" /></td>
        <td class="num">${money(f.lineTotal)}</td>
        <td>${tags}</td>
      `;

      if(f.finalQty > f.qty) tr.style.background = "rgba(239,68,68,.10)";
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll("input").forEach(inp => {
      inp.addEventListener("input", (e) => {
        const idx = Number(e.target.dataset.idx);
        const kind = e.target.dataset.kind;
        let v = Number(e.target.value || 0);
        if(!isFinite(v) || v < 0) v = 0;
        v = Math.round(v);

        if(kind === "final"){
          v = Math.min(state.fixtures[idx].qty, v);
          state.fixtures[idx].finalQty = v;
        } else if(kind === "rate"){
          state.fixtures[idx].rate = v;
          persistFixtureOverrides();
        } else if(kind === "qty"){
          state.fixtures[idx].qty = v;
          state.fixtures[idx].finalQty = Math.min(state.fixtures[idx].finalQty, v);
          persistFixtureOverrides();
        }
        updateTotalsOnly();
        renderFixtures();
      });
    });
  }

  function renderLog(){
    const tbody = $("logTable").querySelector("tbody");
    tbody.innerHTML = "";
    state.log.slice().reverse().forEach(item => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${item.date}</td><td>${item.client||""}</td><td>${item.type||""}</td>
        <td class="num">${money(item.revenue)}</td><td class="num">${money(item.costs)}</td>
        <td class="num">${money(item.profit)}</td><td class="center">${pct(item.margin)}</td><td>${item.notes||""}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  function renderTrackerSummary(){
    const n = state.log.length;
    const totalRev = state.log.reduce((a,x)=>a+(x.revenue||0),0);
    const totalProfit = state.log.reduce((a,x)=>a+(x.profit||0),0);
    const avgMargin = totalRev>0 ? totalProfit/totalRev : 0;
    $("trackerSummary").textContent = `Tracker: ${n} event${n===1?"":"s"} • Total Rev ${money(totalRev)} • Total Profit ${money(totalProfit)} • Avg Margin ${pct(avgMargin)}`;
  }

  // ---- Quote page ----
  let quoteCache = null;

  function applyQuoteMode(mode){
    const isInternal = (mode === "INTERNAL");
    // Internal shows profit/margin + other/direct-costs; Client hides them.
    $("internalOnlyProfit").style.display = isInternal ? "block" : "none";
    $("internalOnlyMargin").style.display = isInternal ? "block" : "none";
    if($("qOtherBox")) $("qOtherBox").style.display = isInternal ? "block" : "none";
    if($("qCostsBox")) $("qCostsBox").style.display = isInternal ? "block" : "none";
    renderQuoteSummary(mode);
  }

  function renderQuoteSummary(mode){
    if(!quoteCache) return;

    const { rental, labour, transport, otherCosts, costs } = quoteCache;
    const isInternal = (mode === "INTERNAL");

    // Internal grand total includes "Other Direct Costs" line item.
    // Client grand total excludes it (since it's hidden), per your request.
    const grandTotal = isInternal ? (rental + labour + transport + otherCosts) : (rental + labour + transport);

    // Profit view (internal)
    const profit = grandTotal - costs;
    const margin = grandTotal > 0 ? profit / grandTotal : 0;

    $("qRental").textContent = money(rental);
    $("qLabour").textContent = money(labour);
    $("qTransport").textContent = money(transport);
    $("qOtherCosts").textContent = money(otherCosts);
    $("qCosts").textContent = money(costs);
    $("qGrandTotal").textContent = money(grandTotal);
    $("qProfit").textContent = money(profit);
    $("qMargin").textContent = pct(margin);

    if($("qGrandNote")){
      $("qGrandNote").textContent = isInternal
        ? "Rental + Labour + Transport + Other"
        : "Rental + Labour + Transport";
    }
  }

  function openQuoteView(){
    // cache current values
    quoteCache = {
      rental: fixtureRentalTotal(),
      labour: labourTotal(),
      transport: transportTotal(),
      otherCosts: otherDirectCostsTotal(),
      costs: state.costs
    };

    const metaLines = [
      `Date: ${todayStr()}`,
      `Client: ${state.clientName || "—"}`,
      `Event: ${state.eventType || "—"}`,
      `Tier: ${state.tier}`,
      `Client Budget: ${money(state.budget)}`
    ];
    $("quoteMeta").innerHTML = metaLines.join("<br/>");

    // rental items table: only items with qty>0
    const tbody = $("quoteItems").querySelector("tbody");
    tbody.innerHTML = "";
    const items = state.fixtures.filter(f => (f.finalQty||0) > 0);
    if(items.length === 0){
      const tr = document.createElement("tr");
      tr.innerHTML = `<td colspan="4" style="color:var(--muted)">No fixtures selected.</td>`;
      tbody.appendChild(tr);
    } else {
      items.forEach(f => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${f.name}</td>
          <td class="num">${money(f.rate)}</td>
          <td class="center">${f.finalQty}</td>
          <td class="num">${money(f.rate * f.finalQty)}</td>
        `;
        tbody.appendChild(tr);
      });
    }

    // switch views
    $("builderView").style.display = "none";
    $("quoteView").style.display = "block";

    // apply current mode
    const mode = ($("quoteMode")?.value) || "INTERNAL";
    applyQuoteMode(mode);

    window.scrollTo(0,0);
  }

function closeQuoteView(){
    $("quoteView").style.display = "none";
    $("builderView").style.display = "block";
    window.scrollTo(0,0);
  }

  // ---- Actions ----
  function resetQuantities(){ recomputeTotals(); }

  function logEvent(){
    const rental = Math.round(fixtureRentalTotal());
    const labour = Math.round(labourTotal());
    const transportation = Math.round(transportTotal());
    const other = Math.round(otherDirectCostsTotal());
    const revenue = rental + labour + transportation + other;
    const profit = revenue - state.costs;
    const margin = revenue>0 ? profit/revenue : 0;
    state.log.push({date:todayStr(), client:state.clientName, type:state.eventType, revenue, costs:Math.round(state.costs), profit:Math.round(profit), margin, notes:"Logged from Event Package Planner"});
    saveLog(); renderLog(); renderTrackerSummary();
  }

  function exportQuoteJSON(){
    const rental = Math.round(fixtureRentalTotal());
    const labour = Math.round(labourTotal());
    const transportation = Math.round(transportTotal());
    const other = Math.round(otherDirectCostsTotal());
    const revenue = rental + labour + transportation + other;
    const payload = {
      currency:"XCD",
      client: state.clientName, eventType: state.eventType, budget: state.budget,
      tier: state.tier, reserve: state.reserve, buildBudget: state.buildBudget,
      fitMode: state.fitMode, scalingTarget: state.target,
      fixtureRentalTotal: rental,
      directCosts: state.costs,
      directCostBreakdown: {
        labour: labourTotal(),
        transportation: transportTotal(),
        other: otherDirectCostsTotal(),
        detail: {...state.dc},
      },
      profit: revenue - state.costs,
      items: state.fixtures.map(f => ({ sku:f.sku, name:f.name, rate:f.rate, avail:f.qty, suggested:f.suggestedQty, qty:f.finalQty, lineTotal:(f.rate||0)*(f.finalQty||0) }))
    };
    const blob = new Blob([JSON.stringify(payload,null,2)], {type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `LightNation_quote_${todayStr()}_XCD.json`; a.click();
    URL.revokeObjectURL(url);
  }

  function clearLog(){
    if(!confirm("Clear all logged events on this browser?")) return;
    state.log = []; saveLog(); renderLog(); renderTrackerSummary();
  }

  function resetRatesAvail(){
    if(!confirm("Reset rates/availability back to defaults?")) return;
    resetFixtureOverrides(); initFixtures(); recomputeTotals();
  }

  // ---- Wiring ----
  function wireDc(){
    const bindNum = (id, key) => {
      $(id).addEventListener("input", e => {
        state.dc[key] = Math.max(0, Math.round(Number(e.target.value || 0)));
        saveDc();
        recomputeTotals();
      });
    };
    bindNum("dcAssistCount", "assistCount");
    bindNum("dcAssistRate", "assistRate");
    bindNum("dcOperator", "operator");
    bindNum("dcFuel", "fuel");
    bindNum("dcConsumables", "consumables");
    bindNum("dcRentals", "rentals");
    bindNum("dcMaint", "maint");
    bindNum("dcMisc", "misc");
  }

  function wire(){
    $("clientName").addEventListener("input", e => { state.clientName = e.target.value; });
    $("eventType").addEventListener("input", e => { state.eventType = e.target.value; });

    $("budget").addEventListener("input", e => { state.budget = Math.max(0, Math.round(Number(e.target.value || 0))); recomputeTotals(); });

    $("costMode").addEventListener("change", e => { state.costMode = e.target.value; recomputeTotals(); });
    $("costs").addEventListener("input", e => { state.costs = Math.max(0, Math.round(Number(e.target.value || 0))); updateTotalsOnly(); });

    $("fitMode").addEventListener("change", e => { state.fitMode = e.target.value; recomputeTotals(); });
    $("target").addEventListener("change", e => { state.target = e.target.value; recomputeTotals(); });
    $("tierOverride").addEventListener("change", e => { state.tierOverride = e.target.value; recomputeTotals(); });
    $("editMode").addEventListener("change", e => { state.editMode = e.target.value; renderFixtures(); });

    $("quoteBtn").addEventListener("click", openQuoteView);
    $("backBtn").addEventListener("click", closeQuoteView);
    $("printBtn").addEventListener("click", () => window.print());

    $("quoteMode").addEventListener("change", (e) => applyQuoteMode(e.target.value));

    $("resetBtn").addEventListener("click", resetQuantities);
    $("logBtn").addEventListener("click", logEvent);
    $("exportBtn").addEventListener("click", exportQuoteJSON);
    $("clearLogBtn").addEventListener("click", clearLog);
    $("resetRatesBtn").addEventListener("click", resetRatesAvail);

    wireDc();
  }

  (function init(){
    loadLog();
    initFixtures();

    // seed state from UI
    state.budget = Math.max(0, Math.round(Number($("budget").value || 0)));
    state.costMode = $("costMode").value;
    state.fitMode = $("fitMode").value;
    state.target = $("target").value;
    state.tierOverride = $("tierOverride").value;
    state.editMode = $("editMode").value;

    initDc();
    wire();
    recomputeTotals();
  })();
