/* Vision Digital — Tickets. Everything is stored in this device's local storage. */
(() => {
  'use strict';

  const STORE_KEY = 'vd-tickets-v1';
  // Ordered so the first few clients get the most distinct colors.
  const PALETTE = ['#0A84FF', '#FF8A00', '#2DA44E', '#A855F7', '#EC4899', '#0EA5B7', '#F5C400', '#5856D6', '#EF4444', '#84CC16', '#A27B5C', '#64748B'];
  const DAY = 86400000;
  const finePointer = matchMedia('(pointer: fine)');

  const svg = (paths) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
  const ICON = {
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.2 4.2L19 7"/></svg>',
    chevron: '<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>',
    inbox: svg('<path d="M3.5 13.5 6 5.5h12l2.5 8V18a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 18z"/><path d="M3.5 13.5H8l1.5 2.5h5l1.5-2.5h4.5"/>'),
    done: svg('<circle cx="12" cy="12" r="8.5"/><path d="M8.2 12.3l2.6 2.6 5-5.4"/>'),
    users: svg('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 19.5c.8-3.3 3.4-5 6.5-5s5.7 1.7 6.5 5"/><path d="M16 4.8a3.3 3.3 0 0 1 0 6.4M18 14.6c1.9.6 3.1 2.2 3.5 4.9"/>'),
  };

  const $ = (id) => document.getElementById(id);
  const el = {
    topbar: document.querySelector('.topbar'),
    title: $('viewTitle'),
    meta: $('headerMeta'),
    ticketsView: $('ticketsView'),
    clientsView: $('clientsView'),
    segButtons: document.querySelectorAll('.segmented button'),
    openCount: $('openCount'),
    doneCount: $('doneCount'),
    filter: $('clientFilter'),
    ticketList: $('ticketList'),
    clientList: $('clientList'),
    tabs: document.querySelectorAll('.tab'),
    ticketSheet: $('ticketSheet'),
    ticketForm: $('ticketForm'),
    ticketTitle: $('ticketSheetTitle'),
    ticketSave: $('ticketSaveBtn'),
    clientInput: $('clientInput'),
    clientDot: $('clientDot'),
    clientHint: $('clientHint'),
    clientChoices: $('clientChoices'),
    taskInput: $('taskInput'),
    dueQuick: $('dueQuick'),
    dueField: $('dueField'),
    dueInput: $('dueInput'),
    dueDisplay: $('dueDisplay'),
    stamp: $('ticketStamp'),
    ticketActions: $('ticketActions'),
    toggleDone: $('toggleDoneBtn'),
    deleteTicket: $('deleteTicketBtn'),
    clientSheet: $('clientSheet'),
    clientForm: $('clientForm'),
    clientTitle: $('clientSheetTitle'),
    clientSave: $('clientSaveBtn'),
    clientAvatar: $('clientAvatar'),
    clientName: $('clientNameInput'),
    clientNameError: $('clientNameError'),
    swatches: $('swatches'),
    clientActions: $('clientActions'),
    viewClientTickets: $('viewClientTicketsBtn'),
    deleteClient: $('deleteClientBtn'),
    toast: $('toast'),
    toastText: $('toastText'),
    toastAction: $('toastAction'),
    importInput: $('importInput'),
  };

  /* ---------- Helpers ---------- */

  const now = () => new Date().toISOString();
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2, 10));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = (s) => s.trim().replace(/\s+/g, ' ');
  const byName = (a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });

  function initials(name) {
    const words = name.trim().split(/\s+/).filter(Boolean);
    if (!words.length) return '?';
    const first = Array.from(words[0]);
    const second = words.length > 1 ? Array.from(words[words.length - 1])[0] : first[1] || '';
    return (first[0] + second).toUpperCase();
  }

  // Dark text on light client colors (yellow, lime), white on the rest.
  function onColor(hex) {
    const n = parseInt(hex.slice(1), 16);
    const [r, g, b] = [n >> 16, (n >> 8) & 255, n & 255].map((v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.36 ? '#1c1c1e' : '#ffffff';
  }
  const clientVars = (c) => `--c:${c.color};--on-c:${onColor(c.color)}`;

  const toDateStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const parseDateStr = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  function dateStrFromToday(offset) { const d = new Date(); d.setDate(d.getDate() + offset); return toDateStr(d); }
  function daysUntil(dateStr) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.round((parseDateStr(dateStr) - today) / DAY);
  }

  const fmt = (opts) => new Intl.DateTimeFormat(undefined, opts);
  const fmtDay = fmt({ month: 'short', day: 'numeric' });
  const fmtDayYear = fmt({ month: 'short', day: 'numeric', year: 'numeric' });
  const fmtWeekday = fmt({ weekday: 'long' });
  const fmtLong = fmt({ weekday: 'long', month: 'long', day: 'numeric' });
  const fmtLongYear = fmt({ weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const fmtTime = fmt({ hour: 'numeric', minute: '2-digit' });
  const fmtFull = fmt({ weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });

  const thisYear = (d) => d.getFullYear() === new Date().getFullYear();
  const shortDate = (d) => (thisYear(d) ? fmtDay : fmtDayYear).format(d);

  function createdLabel(iso) {
    const d = new Date(iso);
    const n = daysUntil(toDateStr(d));
    const day = n === 0 ? 'Today' : n === -1 ? 'Yesterday' : shortDate(d);
    return `${day} · ${fmtTime.format(d)}`;
  }

  function dueBadge(t) {
    if (t.done) return { cls: 'done', text: `Done · ${shortDate(new Date(t.doneAt))}` };
    if (!t.due) return null;
    const n = daysUntil(t.due);
    const d = parseDateStr(t.due);
    if (n < 0) return { cls: 'overdue', text: `Overdue · ${shortDate(d)}` };
    if (n === 0) return { cls: 'today', text: 'Due today' };
    if (n === 1) return { cls: 'soon', text: 'Due tomorrow' };
    if (n < 7) return { cls: '', text: `Due ${fmtWeekday.format(d)}` };
    return { cls: '', text: `Due ${shortDate(d)}` };
  }

  /* ---------- Data ---------- */

  const isoOrNow = (s) => (typeof s === 'string' && !isNaN(Date.parse(s)) ? new Date(s).toISOString() : now());

  // Accepts anything (local storage or a backup file) and returns clean data, or throws.
  function sanitize(data) {
    if (!data || !Array.isArray(data.clients) || !Array.isArray(data.tickets)) throw new Error('Not a tickets backup');
    const hex = /^#[0-9a-f]{6}$/i;
    const clients = data.clients
      .filter((c) => c && typeof c.id === 'string' && typeof c.name === 'string' && c.name.trim())
      .map((c) => ({ id: c.id, name: norm(c.name), color: hex.test(c.color) ? c.color : PALETTE[0], createdAt: isoOrNow(c.createdAt) }));
    const ids = new Set(clients.map((c) => c.id));
    const tickets = data.tickets
      .filter((t) => t && typeof t.id === 'string' && ids.has(t.clientId) && typeof t.task === 'string')
      .map((t) => ({
        id: t.id,
        clientId: t.clientId,
        task: t.task,
        createdAt: isoOrNow(t.createdAt),
        due: /^\d{4}-\d{2}-\d{2}$/.test(t.due) ? t.due : null,
        done: !!t.done,
        doneAt: t.done ? isoOrNow(t.doneAt) : null,
      }));
    return { clients, tickets };
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) return sanitize(JSON.parse(raw));
    } catch (e) { /* start fresh */ }
    return { clients: [], tickets: [] };
  }

  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
    catch (e) { showToast('Could not save on this device'); }
  }

  // Returns a function that puts everything back the way it is right now.
  function snapshot() {
    const saved = JSON.stringify(state);
    return () => { state = JSON.parse(saved); save(); render(); };
  }

  let state = load();
  const ui = { view: 'tickets', status: 'open', clientFilter: null, editingTicketId: null, editingClientId: null };

  const clientById = (id) => state.clients.find((c) => c.id === id);
  const ticketById = (id) => state.tickets.find((t) => t.id === id);
  function findClientByName(name) {
    const key = norm(name).toLowerCase();
    return key ? state.clients.find((c) => c.name.toLowerCase() === key) : undefined;
  }

  // The palette color fewest clients are using, so colors stay as distinct as possible.
  function nextColor() {
    const counts = new Map(PALETTE.map((c) => [c, 0]));
    for (const c of state.clients) if (counts.has(c.color)) counts.set(c.color, counts.get(c.color) + 1);
    return PALETTE.reduce((best, c) => (counts.get(c) < counts.get(best) ? c : best), PALETTE[0]);
  }

  function setDone(t, done) {
    t.done = done;
    t.doneAt = done ? now() : null;
  }

  /* ---------- Rendering ---------- */

  function render() {
    const isTickets = ui.view === 'tickets';
    el.ticketsView.hidden = !isTickets;
    el.clientsView.hidden = isTickets;
    el.tabs.forEach((tab) => {
      const on = tab.dataset.view === ui.view;
      tab.classList.toggle('is-active', on);
      tab.setAttribute('aria-current', on ? 'page' : 'false');
    });
    el.title.textContent = isTickets ? 'Tickets' : 'Clients';
    const openTotal = state.tickets.filter((t) => !t.done).length;
    const clientTotal = state.clients.length;
    el.meta.textContent = isTickets
      ? (openTotal ? `${openTotal} open` : '')
      : (clientTotal ? `${clientTotal} client${clientTotal === 1 ? '' : 's'}` : '');
    if (isTickets) renderTickets(); else renderClients();
  }

  function renderTickets() {
    if (ui.clientFilter && !clientById(ui.clientFilter)) ui.clientFilter = null;
    const inFilter = (t) => !ui.clientFilter || t.clientId === ui.clientFilter;
    const open = state.tickets.filter((t) => !t.done && inFilter(t));
    const done = state.tickets.filter((t) => t.done && inFilter(t));

    el.openCount.textContent = open.length;
    el.doneCount.textContent = done.length;
    el.segButtons.forEach((b) => b.setAttribute('aria-selected', String(b.dataset.status === ui.status)));

    const withTickets = new Set(state.tickets.map((t) => t.clientId));
    const filterClients = state.clients.filter((c) => withTickets.has(c.id) || c.id === ui.clientFilter).sort(byName);
    el.filter.hidden = filterClients.length < 2 && !ui.clientFilter;
    el.filter.innerHTML =
      `<button type="button" class="chip" data-filter="" aria-pressed="${!ui.clientFilter}">All</button>` +
      filterClients.map((c) => `<button type="button" class="chip" data-filter="${esc(c.id)}" aria-pressed="${c.id === ui.clientFilter}" style="${clientVars(c)}"><span class="dot"></span><span class="chip-label">${esc(c.name)}</span></button>`).join('');

    const list = ui.status === 'open' ? open : done;
    if (!list.length) {
      el.ticketList.innerHTML = emptyTickets();
      return;
    }

    if (ui.status === 'done') {
      list.sort((a, b) => b.doneAt.localeCompare(a.doneAt));
      el.ticketList.innerHTML = `<div class="cards">${list.map(ticketCard).join('')}</div>`;
      return;
    }

    const groups = { overdue: [], today: [], upcoming: [], none: [] };
    for (const t of list) {
      if (!t.due) { groups.none.push(t); continue; }
      const n = daysUntil(t.due);
      groups[n < 0 ? 'overdue' : n === 0 ? 'today' : 'upcoming'].push(t);
    }
    const byDue = (a, b) => a.due.localeCompare(b.due) || b.createdAt.localeCompare(a.createdAt);
    const newestFirst = (a, b) => b.createdAt.localeCompare(a.createdAt);
    const sections = [
      ['Overdue', groups.overdue.sort(byDue), 'overdue'],
      ['Due today', groups.today.sort(byDue), ''],
      ['Upcoming', groups.upcoming.sort(byDue), ''],
      ['No due date', groups.none.sort(newestFirst), ''],
    ];
    el.ticketList.innerHTML = sections
      .filter(([, items]) => items.length)
      .map(([label, items, cls]) => `
        <section class="list-section">
          <h2 class="section-label ${cls}"><span>${label}</span><span>${items.length}</span></h2>
          <div class="cards">${items.map(ticketCard).join('')}</div>
        </section>`)
      .join('');
  }

  function ticketCard(t) {
    const c = clientById(t.clientId) || { name: 'Unknown client', color: '#8E8E93' };
    const due = dueBadge(t);
    return `
      <article class="ticket${t.done ? ' is-done' : ''}" data-id="${esc(t.id)}" style="${clientVars(c)}">
        <button type="button" class="check" data-action="toggle" aria-label="${t.done ? 'Reopen ticket' : 'Mark as done'}">
          <span class="check-ring">${ICON.check}</span>
        </button>
        <button type="button" class="ticket-main" data-action="edit">
          <span class="ticket-top">
            <span class="client-tag"><span class="dot"></span><span class="client-name">${esc(c.name)}</span></span>
            ${due ? `<span class="due ${due.cls}">${due.text}</span>` : ''}
          </span>
          <span class="ticket-task">${esc(t.task)}</span>
          <span class="ticket-meta">Created ${createdLabel(t.createdAt)}</span>
        </button>
      </article>`;
  }

  function emptyState(icon, title, text, withButton = false) {
    return `
      <div class="empty">
        <div class="empty-icon">${icon}</div>
        <h3>${title}</h3>
        <p>${text}</p>
        ${withButton ? '<button type="button" class="empty-btn" data-action="new">New ticket</button>' : ''}
      </div>`;
  }

  function emptyTickets() {
    const c = ui.clientFilter && clientById(ui.clientFilter);
    const who = c ? ` for ${esc(c.name)}` : '';
    if (!state.tickets.length) return emptyState(ICON.inbox, 'No tickets yet', 'When a client asks you for something, tap + to log it.', true);
    if (ui.status === 'open') return emptyState(ICON.done, 'All caught up', `No open tickets${who}.`);
    return emptyState(ICON.inbox, 'Nothing done yet', `Finished tickets${who} will show up here.`);
  }

  function renderClients() {
    if (!state.clients.length) {
      el.clientList.innerHTML = emptyState(ICON.users, 'No clients yet', 'Clients are saved automatically when you create a ticket. You can also add one here.');
      return;
    }
    const rows = [...state.clients].sort(byName).map((c) => {
      const tickets = state.tickets.filter((t) => t.clientId === c.id);
      const open = tickets.filter((t) => !t.done).length;
      return `
        <button type="button" class="group-row" data-client="${esc(c.id)}" style="${clientVars(c)}">
          <span class="avatar">${esc(initials(c.name))}</span>
          <span class="row-text">
            <span class="row-title">${esc(c.name)}</span>
            <span class="row-sub">${open} open · ${tickets.length} total</span>
          </span>
          ${ICON.chevron}
        </button>`;
    });
    el.clientList.innerHTML = `<div class="group">${rows.join('')}</div>`;
  }

  /* ---------- Sheets ---------- */

  let activeSheet = null;
  let returnFocus = null;

  function openSheet(layer, focusTarget) {
    activeSheet = layer;
    returnFocus = document.activeElement;
    layer.hidden = false;
    document.documentElement.classList.add('sheet-open');
    void layer.offsetWidth; // start the slide-up from the off-screen position
    layer.classList.add('is-open');
    // On phones, skip auto-focus so the keyboard doesn't cover the client chips.
    if (focusTarget && finePointer.matches) setTimeout(() => focusTarget.focus({ preventScroll: true }), 60);
  }

  function closeSheet() {
    const layer = activeSheet;
    if (!layer) return;
    activeSheet = null;
    if (layer.contains(document.activeElement)) document.activeElement.blur();
    layer.classList.remove('is-open');
    document.documentElement.classList.remove('sheet-open');
    setTimeout(() => { if (!layer.classList.contains('is-open')) layer.hidden = true; }, 420);
    if (returnFocus && finePointer.matches) returnFocus.focus({ preventScroll: true });
  }

  // Drag a sheet down by its header to dismiss it, like a native iOS sheet.
  function enableSheetDrag(layer) {
    const sheet = layer.querySelector('.sheet');
    const handle = layer.querySelector('.sheet-header');
    let pointerId = null, startY = 0, lastY = 0, lastT = 0, offset = 0, velocity = 0, dragging = false;

    const move = (e) => {
      if (e.pointerId !== pointerId) return;
      const dy = e.clientY - startY;
      if (!dragging) {
        if (dy < 6) return;
        dragging = true;
        sheet.style.transition = 'none';
      }
      offset = Math.max(0, dy);
      velocity = (e.clientY - lastY) / Math.max(1, e.timeStamp - lastT);
      lastY = e.clientY;
      lastT = e.timeStamp;
      sheet.style.transform = `translateY(${offset}px)`;
    };

    const end = (e) => {
      if (e.pointerId !== pointerId) return;
      pointerId = null;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
      if (!dragging) return;
      dragging = false;
      sheet.style.transition = '';
      sheet.style.transform = '';
      if (offset > 120 || velocity > 0.6) closeSheet();
      // A drag that ends over Cancel/Save shouldn't count as a tap on it.
      const swallow = (ev) => { ev.preventDefault(); ev.stopPropagation(); };
      handle.addEventListener('click', swallow, { capture: true, once: true });
      setTimeout(() => handle.removeEventListener('click', swallow, { capture: true }), 0);
    };

    // Track on window so the drag keeps up even when the finger outruns the header.
    handle.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      pointerId = e.pointerId;
      startY = lastY = e.clientY;
      lastT = e.timeStamp;
      offset = velocity = 0;
      dragging = false;
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', end);
      window.addEventListener('pointercancel', end);
    });
  }

  /* ---------- Ticket sheet ---------- */

  function clientsByRecentUse() {
    const lastUsed = new Map();
    for (const t of state.tickets) if ((lastUsed.get(t.clientId) || '') < t.createdAt) lastUsed.set(t.clientId, t.createdAt);
    return [...state.clients].sort((a, b) => (lastUsed.get(b.id) || b.createdAt).localeCompare(lastUsed.get(a.id) || a.createdAt));
  }

  function openTicketSheet(ticketId = null) {
    const t = ticketId ? ticketById(ticketId) : null;
    ui.editingTicketId = t ? t.id : null;
    el.ticketTitle.textContent = t ? 'Edit Ticket' : 'New Ticket';

    const preset = t ? clientById(t.clientId) : ui.clientFilter && clientById(ui.clientFilter);
    el.clientInput.value = preset ? preset.name : '';
    el.taskInput.value = t ? t.task : '';
    setDue(t && t.due ? t.due : '');

    if (t) {
      el.stamp.textContent = `Created ${fmtFull.format(new Date(t.createdAt))}` + (t.done ? ` · Done ${fmtFull.format(new Date(t.doneAt))}` : '');
      el.toggleDone.textContent = t.done ? 'Reopen ticket' : 'Mark as done';
    } else {
      el.stamp.textContent = 'Date and time are stamped automatically when you save.';
    }
    el.ticketActions.hidden = !t;

    updateClientField();
    validateTicket();
    openSheet(el.ticketSheet, preset ? el.taskInput : el.clientInput);
  }

  function updateClientField() {
    const name = norm(el.clientInput.value);
    const match = findClientByName(name);
    const color = match ? match.color : name ? nextColor() : null;

    el.clientDot.classList.toggle('is-empty', !color);
    if (color) el.clientDot.style.setProperty('--c', color);

    if (name && !match) {
      el.clientHint.innerHTML = `<span class="swatch-inline" style="--c:${color}">New client</span> — saved automatically for next time.`;
    } else if (!state.clients.length) {
      el.clientHint.textContent = 'Type a name. New clients are saved automatically.';
    } else {
      el.clientHint.textContent = '';
    }

    const query = name.toLowerCase();
    let choices = clientsByRecentUse();
    if (query && !match) choices = choices.filter((c) => c.name.toLowerCase().includes(query));
    el.clientChoices.innerHTML = choices.slice(0, 16).map((c) => `
      <button type="button" class="chip" data-pick="${esc(c.id)}" aria-pressed="${!!match && match.id === c.id}" style="${clientVars(c)}">
        <span class="dot"></span><span class="chip-label">${esc(c.name)}</span>
      </button>`).join('');
  }

  function validateTicket() {
    el.ticketSave.disabled = !(norm(el.clientInput.value) && el.taskInput.value.trim());
  }

  function setDue(dateStr) {
    el.dueInput.value = dateStr;
    if (dateStr) {
      const d = parseDateStr(dateStr);
      el.dueDisplay.textContent = (thisYear(d) ? fmtLong : fmtLongYear).format(d);
    } else {
      el.dueDisplay.textContent = 'Pick a date';
    }
    el.dueField.classList.toggle('has-value', !!dateStr);
    el.dueQuick.querySelectorAll('[data-due]').forEach((chip) => {
      const v = chip.dataset.due;
      const on = v === 'none' ? !dateStr : dateStr === dateStrFromToday(Number(v));
      chip.setAttribute('aria-pressed', String(on));
    });
  }

  // Saves the form into state. Returns { ticket, isNew } or null if the form isn't complete.
  function commitTicketForm() {
    const name = norm(el.clientInput.value);
    const task = el.taskInput.value.trim();
    if (!name || !task) return null;

    let client = findClientByName(name);
    if (!client) {
      client = { id: uid(), name, color: nextColor(), createdAt: now() };
      state.clients.push(client);
    }
    const due = el.dueInput.value || null;

    let ticket = ui.editingTicketId && ticketById(ui.editingTicketId);
    const isNew = !ticket;
    if (ticket) {
      Object.assign(ticket, { clientId: client.id, task, due });
    } else {
      ticket = { id: uid(), clientId: client.id, task, createdAt: now(), due, done: false, doneAt: null };
      state.tickets.push(ticket);
    }
    return { ticket, isNew };
  }

  /* ---------- Client sheet ---------- */

  let draftColor = PALETTE[0];

  function openClientSheet(clientId = null) {
    const c = clientId ? clientById(clientId) : null;
    ui.editingClientId = c ? c.id : null;
    el.clientTitle.textContent = c ? 'Edit Client' : 'New Client';
    el.clientName.value = c ? c.name : '';
    draftColor = c ? c.color : nextColor();
    el.clientActions.hidden = !c;
    renderSwatches();
    updateClientPreview();
    openSheet(el.clientSheet, el.clientName);
  }

  function renderSwatches() {
    el.swatches.innerHTML = PALETTE.map((col) =>
      `<button type="button" class="swatch" role="radio" aria-checked="${col === draftColor}" aria-label="Color ${col}" data-color="${col}" style="--c:${col}"></button>`
    ).join('');
  }

  function updateClientPreview() {
    const name = norm(el.clientName.value);
    el.clientAvatar.textContent = initials(name);
    el.clientAvatar.style.cssText = clientVars({ color: draftColor });
    const dupe = findClientByName(name);
    const isDupe = !!dupe && dupe.id !== ui.editingClientId;
    el.clientNameError.textContent = isDupe ? 'You already have a client with this name.' : '';
    el.clientSave.disabled = !name || isDupe;
  }

  /* ---------- Toast ---------- */

  let toastTimer = null;
  let toastUndo = null;

  function showToast(text, undo = null) {
    el.toastText.textContent = text;
    toastUndo = undo;
    el.toastAction.hidden = !undo;
    el.toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, undo ? 5000 : 2200);
  }

  function hideToast() {
    el.toast.classList.remove('is-visible');
    toastUndo = null;
  }

  /* ---------- Backup ---------- */

  async function exportBackup() {
    const json = JSON.stringify({ app: 'vision-digital-tickets', version: 1, exportedAt: now(), ...state }, null, 2);
    const name = `vd-tickets-backup-${dateStrFromToday(0)}.json`;
    const file = new File([json], name, { type: 'application/json' });

    // On iPhone this opens the share sheet, where "Save to Files" keeps a copy.
    if (!finePointer.matches && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'Tickets backup' });
        return;
      } catch (e) {
        if (e.name === 'AbortError') return;
      }
    }
    const url = URL.createObjectURL(file);
    const a = Object.assign(document.createElement('a'), { href: url, download: name });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function importBackup(file) {
    let data;
    try {
      data = sanitize(JSON.parse(await file.text()));
    } catch (e) {
      showToast("That file isn't a tickets backup");
      return;
    }
    const summary = `${data.clients.length} client${data.clients.length === 1 ? '' : 's'} and ${data.tickets.length} ticket${data.tickets.length === 1 ? '' : 's'}`;
    if (!confirm(`Replace everything on this phone with the backup (${summary})?`)) return;
    const undo = snapshot();
    state = data;
    save();
    render();
    showToast('Backup restored', undo);
  }

  /* ---------- Events ---------- */

  function setView(view) {
    ui.view = view;
    render();
    window.scrollTo(0, 0);
  }

  el.tabs.forEach((tab) => tab.addEventListener('click', () => setView(tab.dataset.view)));
  $('newTicketBtn').addEventListener('click', () => openTicketSheet());

  el.segButtons.forEach((b) => b.addEventListener('click', () => {
    ui.status = b.dataset.status;
    render();
  }));

  el.filter.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-filter]');
    if (!chip) return;
    ui.clientFilter = chip.dataset.filter || null;
    render();
  });

  el.ticketList.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const card = btn.closest('.ticket');
    if (btn.dataset.action === 'new') openTicketSheet();
    else if (btn.dataset.action === 'edit') openTicketSheet(card.dataset.id);
    else if (btn.dataset.action === 'toggle') toggleFromCard(card);
  });

  function toggleFromCard(card) {
    if (card.classList.contains('is-busy')) return;
    const t = ticketById(card.dataset.id);
    if (!t) return;
    const undo = snapshot();
    card.classList.add('is-busy', t.done ? 'reopening' : 'completing');
    // Let the check fill in before the card moves to the other list.
    setTimeout(() => {
      setDone(t, !t.done);
      save();
      render();
      showToast(t.done ? 'Marked as done' : 'Ticket reopened', undo);
    }, 300);
  }

  el.clientList.addEventListener('click', (e) => {
    const row = e.target.closest('[data-client]');
    if (row) openClientSheet(row.dataset.client);
  });
  $('addClientBtn').addEventListener('click', () => openClientSheet());

  $('exportBtn').addEventListener('click', exportBackup);
  el.importInput.addEventListener('change', () => {
    const file = el.importInput.files[0];
    el.importInput.value = '';
    if (file) importBackup(file);
  });

  document.querySelectorAll('[data-close]').forEach((x) => x.addEventListener('click', closeSheet));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheet(); });
  enableSheetDrag(el.ticketSheet);
  enableSheetDrag(el.clientSheet);

  // Ticket form
  el.clientInput.addEventListener('input', () => { updateClientField(); validateTicket(); });
  el.clientInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); el.taskInput.focus(); }
  });
  el.clientChoices.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-pick]');
    if (!chip) return;
    const c = clientById(chip.dataset.pick);
    const alreadyPicked = chip.getAttribute('aria-pressed') === 'true';
    el.clientInput.value = alreadyPicked ? '' : c.name;
    updateClientField();
    validateTicket();
    // New ticket: jump straight to typing the request.
    if (!alreadyPicked && !ui.editingTicketId && !el.taskInput.value.trim()) el.taskInput.focus();
  });
  el.taskInput.addEventListener('input', validateTicket);
  el.dueQuick.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-due]');
    if (!chip) return;
    setDue(chip.dataset.due === 'none' ? '' : dateStrFromToday(Number(chip.dataset.due)));
  });
  el.dueInput.addEventListener('change', () => setDue(el.dueInput.value));
  el.dueInput.addEventListener('click', () => {
    // Desktop browsers only open the calendar from the icon; phones open it on tap already.
    if (finePointer.matches && el.dueInput.showPicker) {
      try { el.dueInput.showPicker(); } catch (e) { /* not allowed here */ }
    }
  });

  el.ticketForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const result = commitTicketForm();
    if (!result) return;
    const { ticket, isNew } = result;
    save();
    closeSheet();
    if (isNew) {
      ui.view = 'tickets';
      ui.status = 'open';
      if (ui.clientFilter && ui.clientFilter !== ticket.clientId) ui.clientFilter = null;
    }
    render();
    if (isNew) {
      const card = el.ticketList.querySelector(`[data-id="${CSS.escape(ticket.id)}"]`);
      if (card) {
        card.classList.add('just-added');
        card.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
    showToast(isNew ? 'Ticket saved' : 'Ticket updated');
  });

  el.toggleDone.addEventListener('click', () => {
    const undo = snapshot();
    const result = commitTicketForm();
    const t = result ? result.ticket : ticketById(ui.editingTicketId);
    if (!t) return;
    setDone(t, !t.done);
    save();
    closeSheet();
    render();
    showToast(t.done ? 'Marked as done' : 'Ticket reopened', undo);
  });

  el.deleteTicket.addEventListener('click', () => {
    const undo = snapshot();
    state.tickets = state.tickets.filter((t) => t.id !== ui.editingTicketId);
    save();
    closeSheet();
    render();
    showToast('Ticket deleted', undo);
  });

  // Client form
  el.clientName.addEventListener('input', updateClientPreview);
  el.swatches.addEventListener('click', (e) => {
    const sw = e.target.closest('[data-color]');
    if (!sw) return;
    draftColor = sw.dataset.color;
    el.swatches.querySelectorAll('.swatch').forEach((s) => s.setAttribute('aria-checked', String(s === sw)));
    updateClientPreview();
  });

  el.clientForm.addEventListener('submit', (e) => {
    e.preventDefault();
    updateClientPreview();
    if (el.clientSave.disabled) return;
    const name = norm(el.clientName.value);
    const existing = ui.editingClientId && clientById(ui.editingClientId);
    if (existing) Object.assign(existing, { name, color: draftColor });
    else state.clients.push({ id: uid(), name, color: draftColor, createdAt: now() });
    save();
    closeSheet();
    render();
    showToast(existing ? 'Client updated' : 'Client added');
  });

  el.viewClientTickets.addEventListener('click', () => {
    ui.clientFilter = ui.editingClientId;
    ui.status = 'open';
    closeSheet();
    setView('tickets');
  });

  el.deleteClient.addEventListener('click', () => {
    const c = clientById(ui.editingClientId);
    if (!c) return;
    const count = state.tickets.filter((t) => t.clientId === c.id).length;
    const question = count
      ? `Delete ${c.name} and their ${count} ticket${count === 1 ? '' : 's'}?`
      : `Delete ${c.name}?`;
    if (!confirm(question)) return;
    const undo = snapshot();
    state.clients = state.clients.filter((x) => x.id !== c.id);
    state.tickets = state.tickets.filter((t) => t.clientId !== c.id);
    save();
    closeSheet();
    render();
    showToast('Client deleted', undo);
  });

  el.toastAction.addEventListener('click', () => {
    const undo = toastUndo;
    hideToast();
    if (undo) undo();
  });

  // Hairline under the header once the list scrolls under it.
  window.addEventListener('scroll', () => el.topbar.classList.toggle('is-scrolled', window.scrollY > 2), { passive: true });

  // "Due today" / "Overdue" labels stay right if the app was left open overnight.
  document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });

  /* ---------- Start ---------- */

  render();

  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
