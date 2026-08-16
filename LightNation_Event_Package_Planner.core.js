// Currency formatting (XCD)
  const money = (n) => new Intl.NumberFormat(undefined, {
    style:"currency", currency:"XCD", maximumFractionDigits:0
  }).format(isFinite(n)?n:0);
  const pct = (n) => (isFinite(n)?(n*100).toFixed(0):"0")+"%";
  const todayStr = () => new Date().toISOString().slice(0,10);
  const $ = (id) => document.getElementById(id);

    const RULES = {
    tiers: [
      { name: "Small",  maxBudget: 900,  reserve: 0, minProfit: 450 },
      { name: "Medium", maxBudget: 1500, reserve: 0, minProfit: 900 },
      { name: "Large",  maxBudget: Infinity, reserve: 0, minProfit: 1500 },
    ],
  };

  // Inventory updated July 7, 2026
  // Notes:
  // - BSW200 count corrected to 4.
  // - Betopper LC002-HB COB PAR count added/corrected to 4.
  // - RockBeam DC classified as Moving Head.
  // - Betopper L1015 classified as Moving Bar, not a standard moving head.
  // - LEKO qty corrected = 1 and used as followspot/profile.
  // Inventory source: LightNation master fixture inventory (Aug 2026). Fixtures and Hurricane fogger only.
  const DEFAULT_FIXTURES = [
    // Moving Heads / Intelligent Fixtures
    { sku:"MH-BETOPPER-BSW200", category:"Moving Head", name:"Betopper BSW200 200W Hybrid Spot/Beam/Wash", qty:4, rate:175, tags:["premium","hybrid","beam"], suggested:{Small:0, Medium:2, Large:4} },
    { sku:"MH-SHEHDS-7R", category:"Moving Head", name:"SHEHDS 230W 7R Beam Moving Head", qty:2, rate:150, tags:["premium","beam"], suggested:{Small:0, Medium:1, Large:2} },
    { sku:"MH-ROCKVILLE-ROCKBEAMDC", category:"Moving Head", name:"Rockville RockBeam DC Moving Head Beam", qty:2, rate:60, tags:["beam","motion"], suggested:{Small:0, Medium:2, Large:2} },
    { sku:"MH-DJWORLD-19x15", category:"Moving Head", name:"DJ World LED Beam+Wash 19×15W RGBW Zoom Moving Head", qty:2, rate:110, tags:["wash","motion","zoom"], suggested:{Small:0, Medium:2, Large:2} },
    { sku:"MH-RIUKOE-7x12", category:"Moving Head", name:"RIUKOE 7×12 Mini Moving Head", qty:2, rate:75, tags:["motion"], suggested:{Small:1, Medium:2, Large:2} },
    { sku:"MH-BETOPPER-BEE", category:"Moving Head", name:"Betopper Mini 7×40W RGBW Bee Eye Moving Head", qty:1, rate:95, tags:["motion","eye candy"], suggested:{Small:0, Medium:1, Large:1} },

    // Moving Bars / Pixel / Matrix / Strobe Effects
    { sku:"BAR-BETOPPER-L1015", category:"Moving Bar", name:"Betopper L1015 10×15W RGBW Moving Beam Bar", qty:2, rate:85, tags:["motion","bar"], suggested:{Small:0, Medium:2, Large:2} },
    { sku:"PIX-ROCKVILLE-STM36", category:"Pixel/Matrix", name:"Rockville STAGEMATRIX 36 RGB 6×6 Pixel Matrix", qty:3, rate:35, tags:["pixel","matrix"], suggested:{Small:1, Medium:3, Large:3} },
    { sku:"STR-SHEHDS-8SEG-200W", category:"Strobe/Pixel", name:"SHEHDS 200W RGB Strobe Light — 8-Segment", qty:8, rate:60, tags:["strobe","pixel","fx"], suggested:{Small:2, Medium:4, Large:8} },
    { sku:"FX-OPPSK-STROBE", category:"Strobe/FX", name:"OPPSK Stage Strobe", qty:2, rate:60, tags:["strobe","fx"], suggested:{Small:0, Medium:2, Large:2} },
    { sku:"BAR-LALUCENATZ", category:"LED Bar", name:"LaluceNatz 40in 100W 12-LED RGB Light Bar", qty:2, rate:65, tags:["coverage","bar"], suggested:{Small:1, Medium:2, Large:2} },
    { sku:"BAR-OPPSK-120W", category:"LED Bar", name:"OPPSK 120W 36LED Light Bar", qty:2, rate:65, tags:["coverage","bar"], suggested:{Small:1, Medium:2, Large:2} },

    // COB / PAR / Wash / Key / Front-Light Fixtures
    { sku:"COB-BETOPPER-LC002HB", category:"COB/Front", name:"Betopper LC002-HB 200W COB LED PAR", qty:4, rate:90, tags:["key","front","cob"], suggested:{Small:2, Medium:4, Large:4} },
    { sku:"COB-SHEHDS-200W-ZOOM-CW", category:"COB/Front", name:"SHEHDS 200W COB Zoom PAR Cool/Warm White with Barndoors", qty:2, rate:100, tags:["key","front","zoom"], suggested:{Small:2, Medium:2, Large:2} },
    { sku:"BL-DJWORLD-2EYES", category:"Blinder/Key", name:"DJ World 2 Eyes 200W LED COB CCT Warm/Cool", qty:2, rate:90, tags:["key","punch","cct"], suggested:{Small:0, Medium:1, Large:2} },
    { sku:"PR-SHEHDS-LEKO350", category:"Profile/Followspot", name:"SHEHDS LED 350W Optical Zoom LEKO Warm/Cool", qty:1, rate:200, tags:["key","profile","followspot"], suggested:{Small:0, Medium:1, Large:1} },
    { sku:"PAR-SHEHDS-18x18", category:"Wash/PAR", name:"SHEHDS 18×18W Aluminum Alloy LED Flat PAR", qty:4, rate:40, tags:["fill","wash"], suggested:{Small:4, Medium:4, Large:4} },
    { sku:"W-RF-WEDGE", category:"Wash/PAR", name:"RF WEDGE 54W RGBWA+UV", qty:4, rate:45, tags:["fill","uv","wedge"], suggested:{Small:2, Medium:4, Large:4} },
    { sku:"PAR-MONOPRICE-UV", category:"Wash/PAR", name:"Monoprice PAR StageLight RGBAW-UV", qty:2, rate:40, tags:["fill","uv"], suggested:{Small:0, Medium:2, Large:2} },
    { sku:"W-RIUKOE-PLW0124", category:"Wash/PAR", name:"RIUKOE PL-W0124 Wash Fixture", qty:2, rate:40, tags:["fill","wash"], suggested:{Small:0, Medium:2, Large:2} },

    // Atmosphere
    { sku:"FX-CHAUVET-1800", category:"Atmosphere", name:"Chauvet Hurricane 1800 Flex Fogger", qty:1, rate:100, tags:["atmosphere","fog","multiplier"], suggested:{Small:1, Medium:1, Large:1}, keepMin:1 },
  ];

  let state = {
    clientName:"", eventType:"",
    budget:2500, costs:700,
    costMode:"CALC",
    fitMode:"YES", target:"BUILD",
    tierOverride:"AUTO", tier:"Small",
    reserve:0, buildBudget:0,
    fixtures:[], editMode:"NO", log:[],
    dc: { assistCount:1, assistRate:300, operator:0, fuel:200, consumables:80, rentals:0, maint:120, misc:0 }
  };

  // ---- Storage ----
  function loadLog(){ try{ const raw=localStorage.getItem("ln269_log_xcd_current_inventory_20260707"); state.log = raw?JSON.parse(raw):[]; }catch{ state.log=[]; } }
  function saveLog(){ localStorage.setItem("ln269_log_xcd_current_inventory_20260707", JSON.stringify(state.log)); }

  function loadFixtureOverrides(){ try{ const raw=localStorage.getItem("ln269_fixture_overrides_xcd_current_inventory_20260707"); return raw?JSON.parse(raw):{}; }catch{ return {}; } }
  function saveFixtureOverrides(o){ localStorage.setItem("ln269_fixture_overrides_xcd_current_inventory_20260707", JSON.stringify(o)); }
  function resetFixtureOverrides(){ localStorage.removeItem("ln269_fixture_overrides_xcd_current_inventory_20260707"); }

  function loadDc(){ try{ const raw=localStorage.getItem("ln269_dc_xcd_current_inventory_20260707"); return raw?JSON.parse(raw):null; }catch{ return null; } }
  function saveDc(){ localStorage.setItem("ln269_dc_xcd_current_inventory_20260707", JSON.stringify(state.dc)); }

  // ---- Rules / init ----
  function computeTier(budget){ for(const t of RULES.tiers){ if(budget<=t.maxBudget) return t.name; } return "Large"; }
  function tierRules(name){ return RULES.tiers.find(t=>t.name===name) || RULES.tiers[1]; }

  function initFixtures(){
    const overrides = loadFixtureOverrides();
    state.fixtures = DEFAULT_FIXTURES.map(f=>{
      const o = overrides[f.sku] || {};
      const qty = Number.isFinite(o.qty) ? o.qty : f.qty;
      const rate = Number.isFinite(o.rate) ? o.rate : f.rate;
      return {...f, qty, rate, keepMin:f.keepMin||0, suggestedQty:0, finalQty:0, lineTotal:0};
    });
  }

  function initDc(){
    const saved = loadDc();
    if(saved && typeof saved === "object"){
      state.dc = {...state.dc, ...saved};
    }
    $("dcAssistCount").value = state.dc.assistCount;
    $("dcAssistRate").value = state.dc.assistRate;
    $("dcOperator").value = state.dc.operator;
    $("dcFuel").value = state.dc.fuel;
    $("dcConsumables").value = state.dc.consumables;
    $("dcRentals").value = state.dc.rentals;
    $("dcMaint").value = state.dc.maint;
    $("dcMisc").value = state.dc.misc;
  }

  // ---- Direct costs breakdown ----
  function labourTotal(){
    const dc = state.dc;
    return (dc.assistCount||0) * (dc.assistRate||0) + (dc.operator||0);
  }
  function transportTotal(){
    return (state.dc.fuel||0);
  }
  function otherDirectCostsTotal(){
    const dc = state.dc;
    return (dc.consumables||0) + (dc.rentals||0) + (dc.maint||0) + (dc.misc||0);
  }
  function directCostTotal(){
    return labourTotal() + transportTotal() + otherDirectCostsTotal();
  }

  function applyCostMode(){
    const total = directCostTotal();
    $("dcTotalPill").textContent = "Total: " + money(total);
    if(state.costMode === "CALC"){
      state.costs = Math.round(total);
      $("costs").value = state.costs;
      $("costs").disabled = true;
    } else {
      $("costs").disabled = false;
      state.costs = Number($("costs").value || 0);
    }
  }

  // ---- Fixture plan ----
  function computeSuggested(){
    for(const f of state.fixtures){
      f.suggestedQty = f.suggested?.[state.tier] ?? 0;
      f.suggestedQty = Math.min(f.qty, Math.max(0, f.suggestedQty));
    }
  }
  function sumSuggestedTotal(){
    return state.fixtures.reduce((acc,f)=> acc + (f.rate * (f.suggestedQty||0)), 0);
  }
  function applyFitToBudget(){
    const targetBudget = state.target==="CLIENT" ? state.budget : state.buildBudget;
    const suggestedTotal = sumSuggestedTotal();
    const scale = (state.fitMode==="YES" && suggestedTotal>0) ? Math.min(1, targetBudget/suggestedTotal) : 1;

    for(const f of state.fixtures){
      const base = f.suggestedQty || 0;
      if(state.fitMode==="YES"){
        let scaled = Math.round(base * scale);
        if(base>0 && f.keepMin) scaled = Math.max(f.keepMin, scaled);
        scaled = Math.min(f.qty, Math.max(0, scaled));
        f.finalQty = scaled;
      }else{
        f.finalQty = Math.min(f.qty, Math.max(0, base));
      }
    }
  }

  // ---- Totals / status ----
  function fixtureRentalTotal(){
    return state.fixtures.reduce((acc,f)=> acc + ((f.rate||0)*(f.finalQty||0)), 0);
  }

  function recomputeTotals(){
    applyCostMode();

    const autoTier = computeTier(state.budget);
    state.tier = (state.tierOverride==="AUTO") ? autoTier : state.tierOverride;

    const tr = tierRules(state.tier);
    state.reserve = tr.reserve;
    state.buildBudget = Math.max(0, state.budget - state.reserve);

    computeSuggested();
    applyFitToBudget();

    let quoteTotal = 0;
    for(const f of state.fixtures){
      f.lineTotal = (f.rate||0)*(f.finalQty||0);
      quoteTotal += f.lineTotal;
    }

    const profit = quoteTotal - state.costs;
    const margin = quoteTotal>0 ? (profit/quoteTotal) : 0;
    const targetBudget = (state.target==="CLIENT" ? state.budget : state.buildBudget);

    let status = "OK";
    if(quoteTotal > targetBudget) status = "OVER BUDGET";
    else if(profit < tr.minProfit) status = "BELOW TARGET";

    $("tierPill").textContent = `Tier: ${state.tier}`;
    $("reserve").textContent = money(state.reserve);
    $("buildBudget").textContent = money(state.buildBudget);
    $("quoteTotal").textContent = money(quoteTotal);
    $("profit").textContent = money(profit);
    $("margin").textContent = pct(margin);

    const statusEl = $("status");
    statusEl.textContent = status;
    statusEl.className = "v " + (status==="OK" ? "ok" : (status==="OVER BUDGET" ? "warn" : "bad"));

    const profitEl = $("profit");
    profitEl.className = "v " + (profit >= tr.minProfit ? "ok" : "bad");

    renderFixtures();
    renderLog();
    renderTrackerSummary();
  }

  function updateTotalsOnly(){
    applyCostMode();

    let quoteTotal = 0;
    for(const f of state.fixtures){
      f.lineTotal = (f.rate||0)*(f.finalQty||0);
      quoteTotal += f.lineTotal;
    }
    const tr = tierRules(state.tier);
    const profit = quoteTotal - state.costs;
    const margin = quoteTotal>0 ? (profit/quoteTotal) : 0;
    const targetBudget = (state.target==="CLIENT" ? state.budget : state.buildBudget);

    $("quoteTotal").textContent = money(quoteTotal);
    $("profit").textContent = money(profit);
    $("margin").textContent = pct(margin);

    let status="OK";
    if(quoteTotal>targetBudget) status="OVER BUDGET";
    else if(profit<tr.minProfit) status="BELOW TARGET";

    const statusEl=$("status");
    statusEl.textContent=status;
    statusEl.className="v "+(status==="OK"?"ok":(status==="OVER BUDGET"?"warn":"bad"));

    const profitEl=$("profit");
    profitEl.className="v "+(profit>=tr.minProfit?"ok":"bad");
  }
