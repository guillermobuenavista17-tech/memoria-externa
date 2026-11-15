'use strict';

const byId = id => document.getElementById(id);
const draft = byId('draft');
const help = byId('capture-help');
const types = { idea: 'Idea', link: 'Enlace', task: 'Tarea' };
const tabs = [byId('tab-capture'), byId('tab-inbox')];
const key = 'memoria-externa:v1:' + location.pathname.replace(/index\.html$/, '');
const dates = new Intl.DateTimeFormat('es', {
  year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
});
const coarse = matchMedia('(pointer: coarse)');
let entries = [];
let filter = 'all';
let selectedTab = 0;
let feedbackTimer;
let storageReadable = true;

function urls(text) {
  return Array.from(text.matchAll(/\bhttps?:\/\/[^\s<>"']+/gi), match => {
    let label = match[0].replace(/[.,;:!?]+$/, '');
    for (const [open, close] of [['(', ')'], ['[', ']'], ['{', '}']]) {
      while (label.endsWith(close) && label.split(close).length > label.split(open).length) {
        label = label.slice(0, -1);
      }
    }
    try {
      const url = new URL(label);
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        return { label, url, index: match.index };
      }
    } catch {
      // Una dirección incompleta se conserva como texto.
    }
    return null;
  }).filter(Boolean);
}

function detect(text) {
  if (urls(text).length) return 'link';
  if (/^[-*]/.test(text)) return 'task';
  const first = text.toLocaleLowerCase('es').match(/^\p{L}+/u)?.[0];
  const nonVerbs = /^(?:el|la|un|una|mar|bar|lugar|hogar|solar|pilar|collar|azar|malabar|calamar|caviar|altar|taller|mujer|placer|alquiler|cualquier|ayer|cráter|líder|mártir|zafiro|elixir|faquir|porvenir)$/;
  return first && !nonVerbs.test(first) && /^\p{L}+(?:ar|er|ir)(?:se)?$/u.test(first) ? 'task' : 'idea';
}

function appendText(node, text) {
  let offset = 0;
  for (const { index, label, url } of urls(text)) {
    node.append(text.slice(offset, index));
    const link = document.createElement('a');
    link.href = url.href;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = label;
    node.append(link);
    offset = index + label.length;
  }
  node.append(text.slice(offset));
}

function notify(message) {
  const feedback = byId('feedback');
  clearTimeout(feedbackTimer);
  feedback.textContent = message;
  feedbackTimer = setTimeout(() => { feedback.textContent = ''; }, 2400);
}

function load() {
  try {
    const raw = localStorage.getItem(key);
    const data = raw === null ? [] : JSON.parse(raw);
    if (!Array.isArray(data) || !data.every(entry =>
      entry && typeof entry.id === 'string' && typeof entry.text === 'string' &&
      Object.prototype.hasOwnProperty.call(types, entry.type) && typeof entry.created === 'string' &&
      Number.isFinite(Date.parse(entry.created)) && typeof entry.archived === 'boolean'
    )) {
      throw new Error('Formato de datos no reconocido');
    }
    entries = data;
    storageReadable = true;
    byId('storage').textContent = '';
  } catch {
    storageReadable = false;
    byId('storage').textContent = 'No se pudieron leer los datos locales. Recarga la app para volver a intentarlo.';
  }
}

function persist(change) {
  load();
  if (!storageReadable) return false;
  try {
    const next = change(entries);
    localStorage.setItem(key, JSON.stringify(next));
    entries = next;
    byId('storage').textContent = '';
    return true;
  } catch {
    byId('storage').textContent = 'No se pudo guardar el cambio. Puedes exportar las entradas de la bandeja como copia.';
    return false;
  }
}

function updateDraft() {
  draft.style.height = 'auto';
  draft.style.height = Math.max(draft.offsetHeight, draft.scrollHeight + 2) + 'px';
  const text = draft.value.trim();
  const kind = byId('kind');
  kind.hidden = !text;
  kind.textContent = text ? types[detect(text)] : '';
}

function showTab(index) {
  selectedTab = index;
  tabs.forEach((tab, i) => {
    tab.setAttribute('aria-selected', String(i === index));
    tab.tabIndex = i === index ? 0 : -1;
    byId(tab.getAttribute('aria-controls')).hidden = i !== index;
  });
  if (index === 0) updateDraft();
}

function button(label, action) {
  const element = document.createElement('button');
  element.type = 'button';
  element.textContent = label;
  element.addEventListener('click', action);
  return element;
}

function copyManually(text) {
  const field = byId('manual-text');
  field.value = text;
  byId('manual').showModal();
  field.focus();
  field.select();
}

async function copy(text) {
  try {
    await navigator.clipboard.writeText(text);
    notify('¡Copiado!');
  } catch {
    copyManually(text);
  }
}

async function share(text) {
  try {
    if (navigator.share) {
      await navigator.share({ text });
      return;
    }
  } catch (error) {
    if (error.name === 'AbortError') return;
  }
  await copy(text);
}

function makeCard(entry) {
  const card = document.createElement('li');
  card.className = 'card entry';
  const header = document.createElement('div');
  header.className = 'row';
  const type = document.createElement('select');
  type.setAttribute('aria-label', 'Cambiar tipo de entrada');
  for (const [value, label] of Object.entries(types)) {
    type.add(new Option(label, value, false, entry.type === value));
  }
  type.addEventListener('change', () => {
    if (persist(list => list.map(item => item.id === entry.id ? { ...item, type: type.value } : item))) {
      entry.type = type.value;
      if (filter !== 'all' && filter !== type.value) {
        render();
        byId('filters').querySelector('[aria-pressed="true"]').focus();
      }
    } else {
      type.value = entry.type;
    }
  });
  const time = document.createElement('time');
  time.dateTime = entry.created;
  time.textContent = dates.format(new Date(entry.created));
  header.append(type, time);
  const body = document.createElement('p');
  appendText(body, entry.text);
  const actions = document.createElement('div');
  actions.className = 'row';
  const archive = button('Archivar / Listo', () => {
    if (!persist(list => list.map(item => item.id === entry.id ? { ...item, archived: true } : item))) return;
    const hadFocus = card.contains(document.activeElement);
    card.classList.add('leaving');
    archive.disabled = true;
    updateCount();
    notify('Archivado');
    setTimeout(() => {
      const moveFocus = hadFocus && (document.activeElement === document.body || card.contains(document.activeElement));
      render();
      if (moveFocus && selectedTab === 1) byId('filters').querySelector('[aria-pressed="true"]').focus();
    }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 160);
  });
  actions.append(button('Copiar', () => copy(entry.text)), button('Compartir', () => share(entry.text)), archive);
  card.append(header, body, actions);
  return card;
}

function updateCount() {
  const count = entries.filter(entry => !entry.archived).length;
  byId('count').textContent = count;
  byId('clear').disabled = !count && !entries.length;
  return count;
}

function render() {
  const count = updateCount();
  const visible = entries.filter(entry => !entry.archived && (filter === 'all' || entry.type === filter));
  const cards = document.createDocumentFragment();
  for (const entry of visible) cards.append(makeCard(entry));
  byId('entries').replaceChildren(cards);
  byId('empty').textContent = visible.length || !storageReadable ? '' : count
    ? 'No hay entradas pendientes de este tipo.'
    : 'Mente despejada. Nada pendiente por procesar.';
  byId('download').disabled = !entries.length;
  byId('copy-all').disabled = !entries.length;
}

function markdown() {
  const sections = entries.map(entry => {
    const ticks = entry.text.match(/`+/g) || [];
    const fence = '`'.repeat(ticks.reduce((max, run) => Math.max(max, run.length), 2) + 1);
    return [
      '## ' + types[entry.type] + ' · ' + (entry.archived ? 'Archivada' : 'Pendiente'),
      '', 'Capturada: ' + entry.created, '', fence, entry.text, fence
    ].join('\n');
  });
  return ['# Memoria Externa', ...sections].join('\n\n') + '\n';
}

tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => {
    showTab(index);
    if (index === 0 && !coarse.matches) draft.focus();
  });
  tab.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? 1 : 1 - index;
    showTab(next);
    tabs[next].focus();
  });
});

draft.addEventListener('input', () => {
  help.textContent = '';
  draft.removeAttribute('aria-invalid');
  updateDraft();
});
draft.addEventListener('keydown', event => {
  if (!event.isComposing && event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
    event.preventDefault();
    byId('capture-form').requestSubmit();
  }
});
byId('paste').addEventListener('click', async () => {
  const original = draft.value;
  const start = draft.selectionStart;
  const end = draft.selectionEnd;
  draft.focus();
  try {
    const text = await navigator.clipboard.readText();
    if (draft.value !== original) {
      help.textContent = 'El texto cambió mientras se accedía al portapapeles. Vuelve a pulsar Pegar o pega manualmente.';
    } else if (text) {
      draft.setRangeText(text, start, end, 'end');
      draft.dispatchEvent(new Event('input'));
    } else {
      help.textContent = 'No hay texto en el portapapeles.';
    }
  } catch {
    help.textContent = 'No se pudo leer el portapapeles. Mantén pulsado el campo y elige Pegar, o usa Ctrl + V / ⌘ + V.';
  }
});
byId('capture-form').addEventListener('submit', event => {
  event.preventDefault();
  const text = draft.value.trim();
  if (!text) {
    help.textContent = 'Escribe o pega algo antes de guardar.';
    draft.setAttribute('aria-invalid', 'true');
    draft.focus();
    return;
  }
  const entry = {
    id: crypto.randomUUID?.() || Date.now() + '-' + Math.random(),
    text, type: detect(text), created: new Date().toISOString(), archived: false
  };
  if (!persist(list => [entry, ...list])) return;
  draft.value = '';
  draft.removeAttribute('aria-invalid');
  help.textContent = '';
  updateDraft();
  render();
  notify('Guardado en bandeja');
  if (!coarse.matches) draft.focus();
});
byId('filters').addEventListener('click', event => {
  const value = event.target.dataset.filter;
  if (!value) return;
  filter = value;
  for (const control of byId('filters').querySelectorAll('button')) {
    control.setAttribute('aria-pressed', String(control.dataset.filter === filter));
  }
  render();
});
byId('download').addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([markdown()], { type: 'text/markdown;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'memoria-externa.md';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
});
byId('copy-all').addEventListener('click', () => copy(markdown()));
byId('clear').addEventListener('click', () => {
  const dialog = byId('confirm');
  dialog.returnValue = '';
  dialog.showModal();
});
byId('confirm').addEventListener('close', event => {
  if (event.target.returnValue === 'delete' && persist(() => [])) {
    render();
    byId('filters').querySelector('[aria-pressed="true"]').focus();
    notify('Entradas borradas');
  }
});
window.addEventListener('storage', event => {
  if (event.key === key || event.key === null) {
    load();
    render();
  }
});
window.addEventListener('resize', () => {
  if (selectedTab === 0) updateDraft();
});

load();
render();
byId('loading').hidden = true;
showTab(0);
if (!coarse.matches && document.activeElement === document.body) draft.focus();

const offline = byId('offline');
if ('serviceWorker' in navigator) {
  offline.textContent = 'Preparando el acceso sin conexión…';
  const timeout = setTimeout(() => {
    offline.textContent = 'El acceso sin conexión sigue pendiente. Vuelve a abrir la app con conexión.';
  }, 12000);
  navigator.serviceWorker.register('./sw.js')
    .then(() => navigator.serviceWorker.ready)
    .then(() => { offline.textContent = 'Disponible sin conexión en este dispositivo.'; })
    .catch(() => { offline.textContent = 'No se pudo preparar el acceso sin conexión. Recarga la app para volver a intentarlo.'; })
    .finally(() => clearTimeout(timeout));
} else {
  offline.textContent = 'El acceso sin conexión requiere un navegador compatible y una dirección HTTPS o localhost.';
}
