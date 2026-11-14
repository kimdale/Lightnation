/* GigLedger — zero-build browser app. All accounting amounts are integer cents. */
(() => {
  'use strict';
  const F = window.GigFinance;
  const KEY = 'gigledger-data-v1';
  const CLOUD_KEY = 'gigledger-cloud-config-v1';
  const DEFAULT_CLOUD = Object.freeze({url:"https://ybulpbjlabetlyabaand.supabase.co",key:"sb_publishable_hcBdgss_NgEtuON4K0M1eg_qi-2dvqz"});
  function readCloudConfig(){
    let stored={};
    try{stored=JSON.parse(localStorage.getItem(CLOUD_KEY)||'{}')||{};}catch{}
    return {...DEFAULT_CLOUD,...stored};
  }
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const uuid = () => (crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const dateToday = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
  const e = val => String(val ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const formatDate = s => s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T12:00:00`).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}) : '—';
  const fmt = (cents,currency=activeCurrency) => `${currency} ${new Intl.NumberFormat('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}).format((cents||0)/100)}`;
  const dec = cents => F.dollars(cents);
  const num = val => F.money(val);
  const current = () => state.gigs.find(g => g.id === currentGigId);
  const blank = () => ({version:1,gigs:[]});
  const array = x => Array.isArray(x) ? x : [];
  const string = (s, max=3000) => typeof s === 'string' ? s.slice(0,max) : '';
  const cash = n => Number.isSafeInteger(n) && n>=0 && n <= 100000000000 ? n : 0;
  const validDate = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '';
  const cleanPayment = p => ({id:string(p.id,100)||uuid(),date:validDate(p.date),amountCents:cash(p.amountCents),note:string(p.note),method:string(p.method,120),from:string(p.from,140),destination:p.destination==='self'?'self':'business'});
  const cleanExpense = p => ({id:string(p.id,100)||uuid(),date:validDate(p.date),amountCents:cash(p.amountCents),description:string(p.description,200),paidBy:p.paidBy==='personal'?'personal':'business',note:string(p.note)});
  function normalize(input) {
    if(!input || input.version !== 1 || !Array.isArray(input.gigs) || input.gigs.length > 10000) throw new Error('Not a valid GigLedger v1 backup.');
    const ids = new Set();
    return {version:1, gigs:input.gigs.map(g => {
      if(!g || typeof g !== 'object') throw new Error('Invalid gig in backup.');
      const id=string(g.id,100)||uuid();if(ids.has(id))throw new Error('Duplicate gig ID in backup.');ids.add(id);
      if(array(g.crew).length>500 || array(g.receipts).length>5000 || array(g.expenses).length>5000) throw new Error('Backup exceeds safety limits.');
      return {id,title:string(g.title,140)||'Untitled gig',date:validDate(g.date),dueDate:validDate(g.dueDate),client:string(g.client,140),venue:string(g.venue,140),role:string(g.role,140),notes:string(g.notes),bookingType:g.bookingType==='hired'?'hired':'mine',status:['planned','confirmed','completed','cancelled'].includes(g.status)?g.status:'planned',currency:g.currency==='USD'?'USD':'XCD',feeCents:cash(g.feeCents),selfFeeCents:cash(g.selfFeeCents),createdAt:string(g.createdAt,40),receipts:array(g.receipts).map(cleanPayment),selfPayments:array(g.selfPayments).map(cleanPayment),expenses:array(g.expenses).map(cleanExpense),crew:array(g.crew).map(c=>({id:string(c.id,100)||uuid(),name:string(c.name,140),role:string(c.role,140),feeCents:cash(c.feeCents),payments:array(c.payments).map(cleanPayment)}))};
    })};
  }
  let state = blank();
  try {const raw=localStorage.getItem(KEY);if(raw)state=normalize(JSON.parse(raw));} catch(err){console.warn('GigLedger could not load data',err);}
  let activeCurrency = localStorage.getItem('gigledger-currency') === 'USD' ? 'USD' : 'XCD';
  let view='dashboard', currentGigId=null, editingGigId=null, cloud=null, syncTimeout=null;
  let editingEntry={type:'',gigId:'',crewId:'',entryId:''};

  function toast(message) { const box=$('#toast');box.textContent=message;box.classList.add('visible');clearTimeout(toast.timer);toast.timer=setTimeout(()=>box.classList.remove('visible'),4200); }
  function save() {
    try {localStorage.setItem(KEY,JSON.stringify(state));} catch(err){toast('Local saving failed: '+err.message);return;}
    render();
    if(cloud?.user){ clearTimeout(syncTimeout); syncTimeout=setTimeout(async()=>{
      try{await cloud.save(state);setSyncText('Cloud synced ✓');}catch(err){setSyncText('Cloud sync error: '+err.message);}
    },650);setSyncText('Saving to cloud…'); }
  }
  function setSyncText(message){$('#cloudStatus').textContent=message;$('#storageLabel').textContent=cloud?.user ? message : 'Saved in this browser';}
  function go(next,gigId) {
    view=next;currentGigId=next==='detail'?gigId:null;
    const hash=next==='detail'?`#gig/${encodeURIComponent(gigId)}`:`#${next}`;
    if(location.hash!==hash)history.replaceState(null,'',hash);
    render();window.scrollTo({top:0,behavior:'instant'});
  }
  function routeFromHash(){const h=decodeURIComponent(location.hash.slice(1));if(h.startsWith('gig/')){const id=h.slice(4);if(state.gigs.some(g=>g.id===id)){view='detail';currentGigId=id;return;}}if(['dashboard','gigs','payments','reports','settings'].includes(h)){view=h;currentGigId=null;}}
  function render(){
    $$('.view').forEach(el=>el.classList.toggle('active',el.id===(view==='detail'?'detailView':`${view}View`)));
    $$('.nav').forEach(el=>el.classList.toggle('active',el.dataset.view===view || (view==='detail'&&el.dataset.view==='gigs')));
    $$('.currency').forEach(el=>el.classList.toggle('active',el.dataset.currency===activeCurrency));
    $('#breadcrumbs').innerHTML=({dashboard:'Overview <span>/ Financial snapshot</span>',gigs:'Gigs <span>/ All bookings</span>',detail:'Gigs <span>/ Booking detail</span>',payments:'Transactions <span>/ History</span>',reports:'Reports <span>/ Finance overview</span>',settings:'Settings <span>/ Data and sync</span>'})[view];
    $('#todayTag').textContent=new Date().toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short',year:'numeric'});
    if(view==='dashboard')renderDashboard();
    if(view==='gigs')renderGigs();
    if(view==='detail')renderDetail();
    if(view==='payments')renderPayments();
    if(view==='reports')renderReports();
    if(view==='settings')renderSettings();
  }
  const stat = (name,value,foot,icon,tone='') => `<article class="stat ${tone}"><div class="stat-name">${e(name)} <span class="stat-icon">${e(icon)}</span></div><div class="stat-value">${e(value)}</div><div class="stat-foot">${e(foot)}</div></article>`;
  const empty = (title,detail,button=false) => `<div class="empty"><div class="empty-icon">◇</div><h3>${e(title)}</h3><p>${e(detail)}</p>${button?'<button class="primary" data-action="new-gig">+ Create your first gig</button>':''}</div>`;
  function listRow({label,sub,amount,icon='•',id}){return `<div class="record-row ${id?'clickable':''}" ${id?`data-action="view-gig" data-id="${e(id)}"`:''}><div class="record-symbol">${e(icon)}</div><div class="record-info"><strong>${e(label)}</strong><small>${e(sub)}</small></div><div class="record-amount">${e(amount)}</div></div>`;}
  function renderDashboard(){
    const d=F.dashboard(state.gigs,activeCurrency,dateToday());
    $('#dashboardStats').innerHTML=[
      stat('Clients owe you',fmt(d.receivable),'Uncollected gig fees','↙','amber'),
      stat('Your unpaid share',fmt(d.selfOwed),'Allocated but not paid to you','◉','teal'),
      stat('Crew still owed',fmt(d.crewOwed),'Unpaid commitments to others','↗','red'),
      stat('Gig cash held',fmt(d.cash),'Receipts into business less paid costs','▣')
    ].join('');
    const upcoming=d.upcoming.slice(0,5);
    $('#upcomingList').innerHTML=upcoming.length?`<div class="row-list">${upcoming.map(g=>listRow({label:g.title,sub:`${formatDate(g.date)} · ${g.venue||g.client||'No venue'}`,amount:fmt(g.feeCents,g.currency),icon:'♪',id:g.id})).join('')}</div>`:empty('No upcoming gigs','New planned and confirmed bookings will show here.',true);
    const unsettled=state.gigs.filter(g=>g.currency===activeCurrency && g.status!=='cancelled').filter(g=>{const t=F.totals(g);return t.receivable||t.selfOwed||t.crewOwed;}).sort((a,b)=>F.totals(b).receivable-F.totals(a).receivable).slice(0,5);
    $('#attentionList').innerHTML=unsettled.length?`<div class="row-list">${unsettled.map(g=>{const t=F.totals(g);return listRow({label:g.title,sub:`Client: ${fmt(t.receivable)} · Crew: ${fmt(t.crewOwed)}`,amount:`My pay: ${fmt(t.selfOwed)}`,icon:'!',id:g.id});}).join('')}</div>`:empty('All clear','Nothing outstanding in this currency.');
    const entries=F.ledger(state.gigs).filter(p=>p.currency===activeCurrency).slice(0,6);
    $('#recentPayments').innerHTML=entries.length?`<div class="row-list">${entries.map(p=>listRow({label:`${p.type} · ${p.gigTitle}`,sub:`${formatDate(p.date)} · ${p.party||'—'}`,amount:fmt(p.amountCents,p.currency),icon:p.type==='Client receipt'?'↓':'↑',id:p.gigId})).join('')}</div>`:empty('No payment activity yet','Client deposits, payouts, and expenses will appear here.');
  }
  function gigCard(g){const t=F.totals(g),pct=t.fee?Math.max(0,Math.min(100,100*t.received/t.fee)):0;
    return `<article class="gig-card"><div class="gig-card-top"><div><h2>${e(g.title)}</h2><div class="gig-meta">${e(formatDate(g.date))} · ${e(g.client||'No client')} ${g.venue?`· ${e(g.venue)}`:''}</div><div class="tags"><span class="pill ${e(g.status)}">${e(g.status)}</span><span class="pill">${g.bookingType==='hired'?'Hired gig':'My booking'}</span><span class="pill">${e(g.currency)}</span></div></div><div class="record-amount">${e(fmt(t.fee,g.currency))}<small>Agreed fee</small></div></div>
    <div class="gig-stats"><div><span>Client balance</span><strong>${e(fmt(t.receivable,g.currency))}</strong></div><div><span>My unpaid share</span><strong>${e(fmt(t.selfOwed,g.currency))}</strong></div><div><span>Crew owed</span><strong>${e(fmt(t.crewOwed,g.currency))}</strong></div><div><span>Est. margin</span><strong>${e(fmt(t.margin,g.currency))}</strong></div></div>
    <div class="progress" aria-label="${Math.round(pct)} percent collected"><span style="width:${pct}%"></span></div><div class="actions"><span class="gig-meta">${Math.round(pct)}% collected ${g.role?'· '+e(g.role):''}</span><button class="secondary" data-action="view-gig" data-id="${e(g.id)}">Open gig →</button></div></article>`;
  }
  function renderGigs(){
    const search=$('#gigSearch').value.trim().toLowerCase(),status=$('#gigStatusFilter').value,order=$('#gigOrder').value;
    const gigs=state.gigs.filter(g=>g.currency===activeCurrency && (!status||g.status===status) && [g.title,g.client,g.venue,g.role].join(' ').toLowerCase().includes(search));
    if(order==='date-asc')gigs.sort((a,b)=>a.date.localeCompare(b.date));
    if(order==='date-desc')gigs.sort((a,b)=>b.date.localeCompare(a.date));
    if(order==='outstanding')gigs.sort((a,b)=>F.totals(b).receivable-F.totals(a).receivable);
    $('#gigList').innerHTML=gigs.length?gigs.map(gigCard).join(''):empty(state.gigs.length?'No matching gigs':'No gigs yet',state.gigs.length?'Try switching currencies or clearing filters.':'Start with a booking, then add receipts and payouts.',!state.gigs.length);
  }
  function actionButtons(type,g,c,entryId){return `<div class="table-actions"><button class="icon-button" data-action="edit-entry" data-type="${type}" data-gig="${e(g.id)}" ${c?`data-crew="${e(c)}"`:''} data-entry="${e(entryId)}">Edit</button><button class="icon-button delete" data-action="delete-entry" data-type="${type}" data-gig="${e(g.id)}" ${c?`data-crew="${e(c)}"`:''} data-entry="${e(entryId)}">Delete</button></div>`;}
  function table(columns,rows){return rows.length?`<div class="table-scroll"><table><thead><tr>${columns.map(x=>`<th>${e(x)}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`:'<div class="empty-small">No entries yet.</div>';}
  function renderDetail(){const g=current();if(!g){go('gigs');return;}const t=F.totals(g), m=val=>fmt(val,g.currency);
    const overview=[['Agreed client fee',t.fee],['Total received',t.received],['Client balance',t.receivable],['Your allocation',t.allocation],['Paid to you',t.selfPaid],['Your unpaid share',t.selfOwed],['Crew to pay',t.crewOwed],['Cash held',t.cash]];
    const receiptRows=g.receipts.map(p=>`<tr><td>${e(formatDate(p.date))}</td><td>${e(p.from||g.client||'—')}</td><td>${p.destination==='self'?'Direct to me':'Business'}</td><td>${e(p.method||'—')}</td><td class="amount">${e(m(p.amountCents))}</td><td>${actionButtons('receipt',g,'',p.id)}</td></tr>`);
    const crewRows=g.crew.map(c=>{const paid=(c.payments||[]).reduce((s,p)=>s+p.amountCents,0);return `<tr><td><strong>${e(c.name)}</strong><div class="muted">${e(c.role)}</div></td><td class="amount">${e(m(c.feeCents))}</td><td class="amount">${e(m(paid))}</td><td class="amount">${e(m(Math.max(c.feeCents-paid,0)))}</td><td><div class="two-buttons"><button class="icon-button" data-action="new-entry" data-type="crewPayment" data-gig="${e(g.id)}" data-crew="${e(c.id)}">+ Pay</button><button class="icon-button" data-action="edit-entry" data-type="crew" data-gig="${e(g.id)}" data-entry="${e(c.id)}">Edit</button><button class="icon-button delete" data-action="delete-entry" data-type="crew" data-gig="${e(g.id)}" data-entry="${e(c.id)}">Delete</button></div></td></tr>`;});
    const payoutRows=g.selfPayments.map(p=>`<tr><td>${e(formatDate(p.date))}</td><td>${e(p.note||'Personal payout')}</td><td class="amount">${e(m(p.amountCents))}</td><td>${actionButtons('selfPayment',g,'',p.id)}</td></tr>`);
    const expRows=g.expenses.map(p=>`<tr><td>${e(formatDate(p.date))}</td><td>${e(p.description||'Expense')}</td><td>${p.paidBy==='personal'?'Personal':'Business'}</td><td class="amount">${e(m(p.amountCents))}</td><td>${actionButtons('expense',g,'',p.id)}</td></tr>`);
    const crewPaymentRows=g.crew.flatMap(c=>c.payments.map(p=>`<tr><td>${e(formatDate(p.date))}</td><td>${e(c.name)}</td><td>${e(p.note||'—')}</td><td class="amount">${e(m(p.amountCents))}</td><td>${actionButtons('crewPayment',g,c.id,p.id)}</td></tr>`));
    $('#detailContent').innerHTML=`<div class="detail-header"><div><button class="back-btn" data-action="go-gigs">← All gigs</button><div class="eyebrow">${g.bookingType==='hired'?'HIRED ENGAGEMENT':'OWN BOOKING'} · ${e(g.currency)}</div><h1 id="detailHeading">${e(g.title)}</h1><div class="gig-meta">${e(formatDate(g.date))} · ${e(g.client||'No client')} · ${e(g.venue||'No venue')} · ${e(g.role||'Service unspecified')} · <span class="pill ${e(g.status)}">${e(g.status)}</span></div>${g.dueDate?`<div class="hint">Payment due: ${e(formatDate(g.dueDate))}</div>`:''}</div><div class="detail-actions"><button class="secondary" data-action="edit-gig" data-id="${e(g.id)}">Edit booking</button><button class="danger-ghost" data-action="delete-gig" data-id="${e(g.id)}">Delete</button></div></div>
      <div class="panel"><div class="detail-summary">${overview.map(([name,n])=>`<div class="mini-stat"><span>${e(name)}</span><strong>${e(m(n))}</strong></div>`).join('')}</div>${t.overreceived?`<p class="help alert">Client has paid ${m(t.overreceived)} more than the agreed fee.</p>`:''}${t.selfOverpaid?`<p class="help alert">Recorded personal pay exceeds your allocation by ${m(t.selfOverpaid)}.</p>`:''}<p class="help">Expected unallocated margin after your share, crew agreements, and all expenses: <strong class="${t.margin<0?'negative':'positive'}">${e(m(t.margin))}</strong>. Current business cash balance: <strong>${e(m(t.cash))}</strong>.</p></div>
      <div class="detail-grid"><div>
        <div class="panel"><div class="panel-head"><div><h2>Client receipts / deposits</h2><p>Total received: ${e(m(t.received))}</p></div><button class="primary" data-action="new-entry" data-type="receipt" data-gig="${e(g.id)}">+ Receipt</button></div>${table(['Date','Received from','Paid to','Method','Amount',''],receiptRows)}</div>
        <div class="panel detail-section"><div class="panel-head"><div><h2>Crew & agreed payouts</h2><p>${e(m(t.crewFee))} agreed · ${e(m(t.crewPaid))} paid</p></div><button class="primary" data-action="new-entry" data-type="crew" data-gig="${e(g.id)}">+ Person</button></div>${table(['Person / role','Agreed','Paid','Owed',''],crewRows)}</div>
        <div class="panel detail-section"><div class="panel-head"><div><h2>Crew payment records</h2><p>Partial payouts kept in history</p></div></div>${table(['Date','Person','Note','Amount',''],crewPaymentRows)}</div>
      </div><div>
        <div class="panel"><div class="panel-head"><div><h2>Payments to yourself</h2><p>Direct client receipts also count toward your pay.</p></div><button class="primary" data-action="new-entry" data-type="selfPayment" data-gig="${e(g.id)}">+ Payout</button></div>${table(['Date','Description','Amount',''],payoutRows)}</div>
        <div class="panel detail-section"><div class="panel-head"><div><h2>Expenses</h2><p>${e(m(t.expenses))} recorded</p></div><button class="primary" data-action="new-entry" data-type="expense" data-gig="${e(g.id)}">+ Expense</button></div>${table(['Date','Description','Paid by','Amount',''],expRows)}</div>
        <div class="panel detail-section"><h2>Booking notes</h2><div class="detail-notes muted" style="margin-top:10px">${e(g.notes||'No notes added.')}</div></div>
      </div></div>`;
  }
  function paymentRows(list){return list.map(p=>`<tr><td>${e(formatDate(p.date))}</td><td><button class="link-btn" data-action="view-gig" data-id="${e(p.gigId)}">${e(p.gigTitle)}</button></td><td>${e(p.type)}</td><td>${e(p.party||'—')}</td><td>${e(p.destination==='self'?'Paid directly to me':p.destination==='business'?'Business':p.note||'—')}</td><td class="amount">${e(fmt(p.amountCents,p.currency))}</td></tr>`);}
  function renderPayments(){const search=$('#paymentSearch').value.toLowerCase().trim(),type=$('#paymentType').value;const all=F.ledger(state.gigs).filter(p=>p.currency===activeCurrency && (!type||p.type===type) && [p.gigTitle,p.party,p.type].join(' ').toLowerCase().includes(search));$('#paymentHistory').innerHTML=all.length?table(['Date','Gig','Type','Party','Details','Amount'],paymentRows(all)):empty('No transactions found','Record a receipt, crew payment, personal payout, or expense.');}
  function renderReports(){const d=F.dashboard(state.gigs,activeCurrency,dateToday());
    $('#reportSummary').innerHTML=`<div class="stat-grid">${stat('Gross agreed fees',fmt(d.fee),`${d.gigs} active gigs`,'▥')}${stat('Client receipts',fmt(d.received),'Cash collected from clients','↓','teal')}${stat('Total expenses',fmt(d.expenses),'Recorded business and personal costs','↗','amber')}${stat('Projected margin',fmt(d.margin),'After allocated pay and expenses','◉',d.margin<0?'red':'teal')}</div>`;
    const rows=state.gigs.filter(g=>g.currency===activeCurrency&&g.status!=='cancelled').sort((a,b)=>b.date.localeCompare(a.date)).map(g=>{const t=F.totals(g),m=v=>fmt(v,g.currency);return `<tr><td><button class="link-btn" data-action="view-gig" data-id="${e(g.id)}">${e(g.title)}</button><div class="muted">${e(formatDate(g.date))}</div></td>${[t.fee,t.received,t.receivable,t.selfOwed,t.crewOwed,t.expenses,t.margin].map(v=>`<td class="amount">${e(m(v))}</td>`).join('')}</tr>`;});
    $('#reportTable').innerHTML=table(['Gig','Fee','Received','Client due','My unpaid pay','Crew owed','Expenses','Margin'],rows);
  }
  function renderSettings(){const cfg=readCloudConfig();$('#supabaseUrl').value=cfg.url||'';$('#supabaseKey').value=cfg.key||'';$('#cloudSignOut').disabled=!cloud?.user;if(cloud?.user)setSyncText(`Signed in: ${cloud.user.email}`);}

  function openGig(id){
    editingGigId=id||null;const g=id?state.gigs.find(x=>x.id===id):null,form=$('#gigForm');form.reset();$('#gigModalTitle').textContent=g?'Edit gig':'New gig';
    form.elements.date.value=g?.date||dateToday();form.elements.currency.value=g?.currency||activeCurrency;form.elements.fee.value=g?dec(g.feeCents):'';form.elements.selfFee.value=g?dec(g.selfFeeCents):'';
    for(const field of ['title','dueDate','client','venue','role','bookingType','status','notes'])if(g)form.elements[field].value=g[field]||'';
    $('#gigDialog').showModal();form.elements.title.focus();
  }
  function submitGig(evt){evt.preventDefault();const form=evt.currentTarget;
    try{
      const title=form.elements.title.value.trim(),date=form.elements.date.value;if(!title||!date)throw new Error('Enter the gig name and date.');
      const fee=num(form.elements.fee.value),selfFee=num(form.elements.selfFee.value);if(!form.elements.fee.value||!form.elements.selfFee.value)throw new Error('Enter both the agreed fee and your share, even if zero.');
      const original=editingGigId?state.gigs.find(g=>g.id===editingGigId):null;
      if(original && original.currency!==form.elements.currency.value && (original.receipts.length||original.selfPayments.length||original.expenses.length||original.crew.some(c=>c.payments.length)))throw new Error('You cannot change currency after transactions exist.');
      const g={...(original||{id:uuid(),createdAt:new Date().toISOString(),receipts:[],selfPayments:[],expenses:[],crew:[]}),title,date,dueDate:form.elements.dueDate.value,client:form.elements.client.value.trim(),venue:form.elements.venue.value.trim(),role:form.elements.role.value.trim(),bookingType:form.elements.bookingType.value,status:form.elements.status.value,currency:form.elements.currency.value,feeCents:fee,selfFeeCents:selfFee,notes:form.elements.notes.value.trim()};
      if(original)state.gigs.splice(state.gigs.findIndex(x=>x.id===g.id),1,g);else state.gigs.push(g);
      $('#gigDialog').close();save();go('detail',g.id);toast(original?'Gig updated.':'Gig added.');
    }catch(err){toast(err.message);}
  }
  function formField(label,name,type='text',value='',opts=''){return `<label>${e(label)} <input name="${e(name)}" type="${e(type)}" value="${e(value)}" ${opts}></label>`;}
  function selectField(label,name,options,selected=''){return `<label>${e(label)}<select name="${e(name)}">${options.map(([value,text])=>`<option value="${e(value)}" ${value===selected?'selected':''}>${e(text)}</option>`).join('')}</select></label>`;}
  function getEntry(g,type,crewId,entryId){if(!entryId)return null;if(type==='crew')return g.crew.find(x=>x.id===entryId);if(type==='crewPayment')return g.crew.find(x=>x.id===crewId)?.payments.find(x=>x.id===entryId);const map={receipt:'receipts',selfPayment:'selfPayments',expense:'expenses'};return g[map[type]]?.find(x=>x.id===entryId);}
  function openEntry(type,gigId,crewId='',entryId='') {
    const g=state.gigs.find(x=>x.id===gigId);if(!g)return;editingEntry={type,gigId,crewId,entryId};const old=getEntry(g,type,crewId,entryId),form=$('#entryForm');form.reset();
    let fields='',date=old?.date||dateToday();const amount=old?dec(type==='crew'?old.feeCents:old.amountCents):'';
    if(type==='crew'){
      $('#entryTitle').textContent=old?'Edit crew agreement':'Add crew / payee';
      fields=formField('Person name','name','text',old?.name||'','required maxlength="140"')+formField('Role / task','role','text',old?.role||'','maxlength="140"')+formField(`Agreed payout (${g.currency})`,'amount','number',amount,'required min="0" step="0.01"');
    } else if(type==='receipt'){
      $('#entryTitle').textContent=old?'Edit client receipt':'Record client receipt / deposit';
      fields=formField('Date received','date','date',date,'required')+formField('Received from','from','text',old?.from||g.client,'maxlength="140"')+formField(`Amount (${g.currency})`,'amount','number',amount,'required min="0" step="0.01"')+selectField('Paid to','destination',[['business','Business / gig funds'],['self','Directly to me']],old?.destination||'business')+formField('Method','method','text',old?.method||'','placeholder="Cash, transfer, cheque…" maxlength="120"')+formField('Notes','note','text',old?.note||'','maxlength="500"');
    } else if(type==='selfPayment'){
      $('#entryTitle').textContent=old?'Edit personal payout':'Record payment to myself';
      fields=formField('Date paid','date','date',date,'required')+formField(`Amount (${g.currency})`,'amount','number',amount,'required min="0" step="0.01"')+formField('Notes','note','text',old?.note||'','maxlength="500"');
    } else if(type==='expense'){
      $('#entryTitle').textContent=old?'Edit expense':'Record an expense';
      fields=formField('Expense date','date','date',date,'required')+formField('What was paid for?','description','text',old?.description||'','required maxlength="200"')+formField(`Amount (${g.currency})`,'amount','number',amount,'required min="0" step="0.01"')+selectField('Paid from','paidBy',[['business','Gig / business funds'],['personal','My personal funds']],old?.paidBy||'business')+formField('Notes','note','text',old?.note||'','maxlength="500"');
    } else if(type==='crewPayment'){
      $('#entryTitle').textContent=old?'Edit crew payout':'Record a crew payment';
      fields=selectField('Payee','crewId',g.crew.map(c=>[c.id,c.name]),crewId)+formField('Payment date','date','date',date,'required')+formField(`Amount (${g.currency})`,'amount','number',amount,'required min="0" step="0.01"')+formField('Notes','note','text',old?.note||'','maxlength="500"');
    } else return;
    $('#entryFields').innerHTML=`<div class="form-grid">${fields}</div>`;$('#entryDialog').showModal();
  }
  function submitEntry(evt){evt.preventDefault();const form=evt.currentTarget,{type,gigId,crewId,entryId}=editingEntry,g=state.gigs.find(x=>x.id===gigId);if(!g)return;
    try{
      const f=n=>form.elements[n]?.value||'',amount=num(f('amount'));
      if(f('amount')==='')throw new Error('Enter the amount, even if zero.');
      const old=getEntry(g,type,crewId,entryId);
      if(type==='crew'){
        const name=f('name').trim();if(!name)throw new Error('Enter a crew member name.');
        const record={...(old||{id:uuid(),payments:[]}),name,role:f('role').trim(),feeCents:amount};
        if(old)g.crew[g.crew.findIndex(c=>c.id===old.id)]=record;else g.crew.push(record);
      } else {
        if(!f('date'))throw new Error('Enter the payment date.');
        const p={...(old||{id:uuid()}),date:f('date'),amountCents:amount,note:f('note').trim()};
        if(type==='receipt'){Object.assign(p,{from:f('from').trim(),destination:f('destination'),method:f('method').trim()});upsert(g.receipts,p);}
        if(type==='selfPayment')upsert(g.selfPayments,p);
        if(type==='expense'){if(!f('description').trim())throw new Error('Enter an expense description.');Object.assign(p,{description:f('description').trim(),paidBy:f('paidBy')});upsert(g.expenses,p);}
        if(type==='crewPayment'){
          const selected=f('crewId');const crew=g.crew.find(c=>c.id===selected);if(!crew)throw new Error('Choose a crew member.');
          if(old){const from=g.crew.find(c=>c.id===crewId);from.payments=from.payments.filter(x=>x.id!==old.id);}crew.payments.push(p);
        }
      }
      $('#entryDialog').close();save();go('detail',g.id);toast(old?'Entry updated.':'Entry recorded.');
    }catch(err){toast(err.message);}
  }
  function upsert(items,p){const i=items.findIndex(x=>x.id===p.id);if(i<0)items.push(p);else items[i]=p;}
  function deleteEntry(type,gigId,crewId,entryId){
    const g=state.gigs.find(x=>x.id===gigId);if(!g)return;
    const item=getEntry(g,type,crewId,entryId);if(!item)return;
    if(type==='crew' && item.payments.length && !confirm(`Delete ${item.name} and all ${item.payments.length} recorded payments?`))return;
    if(!confirm('Delete this entry? This cannot be undone.'))return;
    if(type==='crew')g.crew=g.crew.filter(p=>p.id!==entryId);
    else if(type==='crewPayment'){const c=g.crew.find(p=>p.id===crewId);c.payments=c.payments.filter(p=>p.id!==entryId);}
    else {const name={receipt:'receipts',selfPayment:'selfPayments',expense:'expenses'}[type];g[name]=g[name].filter(p=>p.id!==entryId);}
    save();toast('Entry deleted.');
  }
  function csvRow(fields){return fields.map(value=>{let v=String(value??'');if(/^[=+@-]/.test(v) && !/^-\d+(?:\.\d+)?$/.test(v))v="'"+v;return '"'+v.replace(/"/g,'""')+'"';}).join(',');}
  function download(name,content,type){const blob=new Blob([content],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  function exportGigs(){const headings=['Gig ID','Event','Date','Due date','Client','Venue','Role','Booking type','Status','Currency','Agreed fee','Received','Client due','My allocation','Paid to me','My unpaid pay','Crew agreed','Crew paid','Crew due','Expenses','Projected margin','Business cash'];
    const rows=state.gigs.filter(g=>g.currency===activeCurrency).map(g=>{const t=F.totals(g);return [g.id,g.title,g.date,g.dueDate,g.client,g.venue,g.role,g.bookingType,g.status,g.currency,...[t.fee,t.received,t.receivable,t.allocation,t.selfPaid,t.selfOwed,t.crewFee,t.crewPaid,t.crewOwed,t.expenses,t.margin,t.cash].map(dec)];});
    download(`gigledger-gigs-${activeCurrency}.csv`,[csvRow(headings),...rows.map(csvRow)].join('\r\n'),'text/csv;charset=utf-8');
  }
  function exportTransactions(){const headings=['Transaction ID','Date','Gig ID','Gig','Currency','Type','Party','Method','Destination','Amount','Note'];const rows=F.ledger(state.gigs).filter(p=>p.currency===activeCurrency).map(p=>[p.id,p.date,p.gigId,p.gigTitle,p.currency,p.type,p.party,p.method,p.destination,dec(p.amountCents),p.note]);download(`gigledger-payments-${activeCurrency}.csv`,[csvRow(headings),...rows.map(csvRow)].join('\r\n'),'text/csv;charset=utf-8');}
  async function importBackup(file){if(!file)return;try{if(file.size>15*1024*1024)throw new Error('Backup larger than 15 MB.');const parsed=normalize(JSON.parse(await file.text()));if(!confirm(`Replace all current gigs with ${parsed.gigs.length} gigs from this backup?`))return;state=parsed;save();go('dashboard');toast('Backup imported successfully.');}catch(err){toast('Import failed: '+err.message);}finally{$('#importJson').value='';}}

  async function initCloud(){const cfg=readCloudConfig();if(!cfg.url||!cfg.key)return;try{cloud=new GigCloud();const user=await cloud.init(cfg.url,cfg.key);if(user)await onCloudSignedIn();else setSyncText('Cloud configured; please sign in.');}catch(err){setSyncText('Cloud unavailable: '+err.message);}}
  async function onCloudSignedIn(){const remote=await cloud.load();if(remote){const normalized=normalize(remote);if(state.gigs.length&&normalized.gigs.length&&JSON.stringify(state)!==JSON.stringify(normalized)){
      if(confirm('This device has different gig records from the cloud. Press OK to use the cloud records on this device, or Cancel to keep your local records and disconnect without overwriting anything. Export a backup first if unsure.')){
        const oldBackup=JSON.stringify(state);
        try{localStorage.setItem('gigledger-pre-cloud-backup-'+Date.now(),oldBackup);}catch{}
        state=normalized;localStorage.setItem(KEY,JSON.stringify(state));
      }else{
        await cloud.signOut();
        setSyncText('Cloud sync paused: local records differ. Both copies preserved.');
        render();return;
      }
    }else if(!state.gigs.length){state=normalized;localStorage.setItem(KEY,JSON.stringify(state));}else if(!normalized.gigs.length)await cloud.save(state);
    }else await cloud.save(state);
    setSyncText(`Signed in: ${cloud.user.email} · Synced`);render();
  }
  async function cloudCredentials(){const email=$('#cloudEmail').value.trim(),password=$('#cloudPassword').value;if(!email||!password)throw new Error('Enter your email and password.');const cfg=readCloudConfig();if(!cfg.url||!cfg.key)throw new Error('Cloud configuration unavailable.');if(!cloud?.client){cloud=new GigCloud();await cloud.init(cfg.url,cfg.key);}return{email,password};}
  async function cloudAction(type){try{const {email,password}=await cloudCredentials();if(type==='signIn'){await cloud.signIn(email,password);await onCloudSignedIn();toast('Signed in and cloud data loaded.');}else{const data=await cloud.signUp(email,password);if(data.session){await onCloudSignedIn();toast('Account created.');}else setSyncText('Check your email to confirm the account, then sign in.');}}catch(err){setSyncText('Cloud error: '+err.message);toast(err.message);}}
  document.addEventListener('click',ev=>{
    const route=ev.target.closest('[data-route]');if(route){go(route.dataset.route);return;}
    const nav=ev.target.closest('[data-view]');if(nav){go(nav.dataset.view);return;}
    const c=ev.target.closest('[data-currency]');if(c){activeCurrency=c.dataset.currency;localStorage.setItem('gigledger-currency',activeCurrency);if(view==='detail'&&current()?.currency!==activeCurrency)go('gigs');else render();return;}
    const close=ev.target.closest('[data-close]');if(close){document.getElementById(close.dataset.close)?.close();return;}
    const b=ev.target.closest('[data-action]');if(!b)return;const a=b.dataset.action;
    if(a==='new-gig'){openGig();return;}
    if(a==='go-gigs'){go('gigs');return;}
    if(a==='view-gig'){go('detail',b.dataset.id);return;}
    if(a==='edit-gig'){openGig(b.dataset.id);return;}
    if(a==='delete-gig'){const g=state.gigs.find(x=>x.id===b.dataset.id);if(g&&confirm(`Permanently delete "${g.title}" and all its payments?`)){state.gigs=state.gigs.filter(x=>x.id!==g.id);save();go('gigs');toast('Gig deleted.');}return;}
    if(a==='new-entry'){openEntry(b.dataset.type,b.dataset.gig,b.dataset.crew||'');return;}
    if(a==='edit-entry'){openEntry(b.dataset.type,b.dataset.gig,b.dataset.crew||'',b.dataset.entry);return;}
    if(a==='delete-entry'){deleteEntry(b.dataset.type,b.dataset.gig,b.dataset.crew||'',b.dataset.entry);return;}
  });
  $('#newGigBtn').addEventListener('click',()=>openGig());
  $('#gigForm').addEventListener('submit',submitGig);$('#entryForm').addEventListener('submit',submitEntry);
  let touched=false;$('#gigForm').elements.selfFee.addEventListener('input',()=>{touched=true;});
  $('#gigForm').elements.fee.addEventListener('input',()=>{if(!editingGigId&&!touched)$('#gigForm').elements.selfFee.value=$('#gigForm').elements.fee.value;});
  $('#gigDialog').addEventListener('close',()=>{touched=false;});
  for(const el of ['gigSearch','gigStatusFilter','gigOrder','paymentSearch','paymentType'])document.getElementById(el).addEventListener('input',render);
  $('#exportJson').addEventListener('click',()=>download(`gigledger-backup-${dateToday()}.json`,JSON.stringify(state,null,2),'application/json;charset=utf-8'));
  $('#importJson').addEventListener('change',ev=>importBackup(ev.target.files[0]));
  $('#exportGigsCsv').addEventListener('click',exportGigs);$('#exportTransactionsCsv').addEventListener('click',exportTransactions);
  $('#saveCloudConfig').addEventListener('click',()=>{const url=$('#supabaseUrl').value.trim(),key=$('#supabaseKey').value.trim();if(!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(url)||!key){toast('Enter a valid Supabase URL and publishable/anon key.');return;}if(/service_role|sb_secret_/i.test(key)){toast('Never enter a service-role or secret key.');return;}localStorage.setItem(CLOUD_KEY,JSON.stringify({url,key}));cloud=null;setSyncText('Cloud configuration saved. Sign in to connect.');toast('Cloud configuration saved on this device.');});
  $('#cloudSignIn').addEventListener('click',()=>cloudAction('signIn'));$('#cloudSignUp').addEventListener('click',()=>cloudAction('signUp'));
  $('#cloudSignOut').addEventListener('click',async()=>{try{clearTimeout(syncTimeout);if(cloud)await cloud.signOut();setSyncText('Signed out. Local data remains on this device.');render();}catch(err){toast(err.message);}});
  $('#clearData').addEventListener('click',()=>{if(!confirm(`Delete all ${state.gigs.length} gig records${cloud?.user?' including the cloud copy':''}? Export a backup first. This cannot be undone.`))return;state=blank();save();go('dashboard');toast('Gig records cleared.');});
  window.addEventListener('hashchange',()=>{routeFromHash();render();});
  routeFromHash();render();initCloud();
})();