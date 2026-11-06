import './style.css';
import './vendor/katex/katex.min.css';
import { answer, completeEditions, durationForMode, expire, finish, formatPoints, isCorrect, LETTERS,
  navigate, score, startAttempt, unavailableReason } from './domain.ts';
import { base, button, content, element, zoom } from './render.ts';
import { restore, save, STORAGE_KEY } from './storage.ts';
import type { Attempt, Bank, ContentNode, Mode, Points, Task } from './types.ts';

const app = document.querySelector<HTMLDivElement>('#app')!;
const profileId = 'alfik/4-sp';
let bank: Bank | null = null;
let attempt: Attempt | null = null;
let trainingPoints: Points = 3;
let selectedYear = 'random';
let storageWarning = '';
let loadError = '';
let shownWarning = false;

try {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (raw) {
    attempt = restore(raw);
    if (!attempt) {
      sessionStorage.removeItem(STORAGE_KEY);
      storageWarning = 'Nie udało się odczytać poprzedniej próby. Możesz zacząć nową.';
    }
  }
} catch { storageWarning = 'Przeglądarka blokuje zapis. Odświeżenie może przerwać próbę.'; }

function persist(): void {
  if (!attempt) return;
  try {
    if (!save(sessionStorage, attempt)) storageWarning = 'Nie udało się zapisać próby. Nie odświeżaj strony.';
  } catch { storageWarning = 'Przeglądarka blokuje zapis. Nie odświeżaj strony.'; }
  const warning = document.querySelector<HTMLElement>('#storage-warning');
  if (warning && storageWarning) { warning.textContent = storageWarning; warning.hidden = false; }
}

function start(mode: Mode): void {
  if (!bank) return;
  try {
    attempt = startAttempt(bank, profileId, mode);
    shownWarning = false;
    persist();
    render(true);
  } catch (error) { loadError = error instanceof Error ? error.message : 'Nie udało się rozpocząć próby.'; render(); }
}

function home(): void {
  attempt = null;
  try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* Current in-memory state remains usable. */ }
  render(true);
}

function render(focus = false): void {
  app.replaceChildren();
  const header = element('header', 'site-header');
  const brand = element('div', 'brand');
  brand.append(element('span', 'brand-mark', '+'), element('span', '', 'mat-trener'));
  header.append(brand, element('span', 'class-label', 'Alfik · klasa IV'));
  if (attempt) header.append(button('← Wybierz tryb', confirmHome, 'text-button mode-home'));
  const main = element('main', attempt ? 'workspace' : 'home');
  main.id = 'main';
  const warning = element('p', 'notice', storageWarning);
  warning.id = 'storage-warning'; warning.hidden = !storageWarning;
  warning.setAttribute('role', 'status');
  main.append(warning);
  if (loadError) main.append(element('p', 'notice', loadError));
  if (attempt) {
    if (attempt.status === 'active') renderQuestion(main);
    else renderResult(main);
  } else renderHome(main);
  const footer = element('footer', 'site-footer');
  footer.append(element('span', '', 'Małe kroki. Coraz więcej możliwości.'),
    button('Źródła zadań', showSources, 'text-button'));
  app.append(header, main, footer);
  if (focus) {
    const heading = main.querySelector<HTMLElement>('h1');
    if (heading) { heading.tabIndex = -1; heading.focus(); }
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
}

function renderHome(main: HTMLElement): void {
  const hero = element('section', 'hero');
  const copy = element('div');
  copy.append(element('p', 'eyebrow', 'TWOJA PRZESTRZEŃ DO ĆWICZEŃ'),
    element('h1', '', 'Rozruszaj głowę.\nOdkryj, ile potrafisz.'),
    element('p', 'intro', 'Wybierz swój trening i spróbuj. Możesz wracać do zadań, zmieniać odpowiedzi i sprawdzać się we własnym rytmie.'));
  const drawing = element('div', 'math-art'); drawing.setAttribute('aria-hidden', 'true');
  for (const [className, text] of [['tile tile-grid', ''], ['tile tile-fraction', '½'], ['tile tile-times', '×'], ['tile tile-circle', '']]) {
    drawing.append(element('span', className, text));
  }
  hero.append(copy, drawing); main.append(hero);
  if (!bank) {
    main.append(element('p', 'notice', loadError ? 'Sprawdź połączenie i spróbuj ponownie.' : 'Wczytujemy bank zadań…'));
    if (loadError) main.append(button('Wczytaj ponownie', () => { void loadBank(); }));
    return;
  }
  const profile = bank.profiles.find(p => p.id === profileId);
  if (!profile) { main.append(element('p', 'notice', 'Bank Alfika dla klasy IV nie jest jeszcze dostępny.')); return; }
  const count = bank.tasks.filter(t => bank!.editions.some(e => e.id === t.editionId && e.profileId === profileId)).length;
  const years = completeEditions(bank, profileId);
  const heading = element('div', 'section-heading');
  heading.append(element('h2', '', 'Na co masz dziś ochotę?'), element('span', 'bank-count', `${count} zadań · pełne roczniki: ${years.length}`));
  main.append(heading);
  const cards = element('div', 'mode-grid');
  const training = modeCard('01', 'Krótki trening', 'Jeden poziom, osiem małych wyzwań. Dobry początek albo szybka powtórka.', 'green');
  const levels = element('fieldset', 'levels'); levels.append(element('legend', '', 'Wybierz poziom'));
  for (const points of [3, 4, 5] as Points[]) {
    const label = element('label');
    const input = element('input'); input.type = 'radio'; input.name = 'level'; input.value = String(points);
    input.checked = points === trainingPoints;
    input.addEventListener('change', () => {
      trainingPoints = points; render();
      document.querySelector<HTMLInputElement>(`input[name="level"][value="${points}"]`)?.focus();
    });
    label.append(input, element('span', '', `${points} pkt`)); levels.append(label);
  }
  training.append(levels);
  const trainMode: Mode = { kind: 'training', points: trainingPoints };
  training.append(element('p', 'mode-facts', `8 zadań · ${durationForMode(profile, trainMode) / 60} min · ${trainingPoints * 8} pkt`),
    element('p', 'scoring-note', 'Punkty za dobre odpowiedzi. Bez punktów ujemnych.'));
  addStart(training, trainMode, 'Zacznij trening');
  const mix = modeCard('02', 'Miks', 'Trochę łatwiej, trochę trudniej. Zestaw, w którym wszystko może się zdarzyć.', 'orange');
  const mixBars = element('div', 'mix-bars');
  for (const text of ['3 × 3 pkt', '3 × 4 pkt', '2 × 5 pkt']) mixBars.append(element('span', '', text));
  mix.append(mixBars, element('p', 'mode-facts', `8 zadań · ${durationForMode(profile, { kind: 'mix' }) / 60} min · 31 pkt`),
    element('p', 'scoring-note', 'Punkty za dobre odpowiedzi. Bez punktów ujemnych.'));
  addStart(mix, { kind: 'mix' }, 'Zacznij miks');
  const full = modeCard('03', 'Pełny rocznik', 'Poczuj atmosferę konkursu. Oryginalny arkusz, zadanie po zadaniu.', 'blue');
  const label = element('label', 'year-label', 'Wybierz rocznik'); label.htmlFor = 'year';
  const select = element('select'); select.id = 'year';
  const random = element('option', '', 'Wylosuj rocznik'); random.value = 'random'; select.append(random);
  for (const edition of years) { const option = element('option', '', String(edition.year)); option.value = edition.id; select.append(option); }
  if (selectedYear !== 'random' && !years.some(e => e.id === selectedYear)) selectedYear = 'random';
  select.value = selectedYear;
  select.addEventListener('change', () => { selectedYear = select.value; render(); document.getElementById('year')?.focus(); });
  const selected = years.find(e => e.id === selectedYear) ?? years[0];
  full.append(label, select,
    element('p', 'mode-facts', selected ? `${selected.expected.length} zadań · ${selected.durationSeconds / 60} min · ${formatPoints(selected.startQuarters + selected.expected.reduce((s, q) => s + q.points * 4, 0))} pkt` : 'Arkusze są w przygotowaniu.'),
    element('p', 'scoring-note', selected ? `Start: ${formatPoints(selected.startQuarters)} pkt. Za błąd: −¼ wartości zadania. Puste: 0 pkt.` : 'Wkrótce pojawią się pełne roczniki.'));
  addStart(full, { kind: 'year', editionId: selectedYear }, 'Zacznij arkusz');
  cards.append(training, mix, full); main.append(cards);
  const note = element('aside', 'gentle-note');
  note.append(element('strong', '', 'Spróbuj. Pomyśl. Wróć do zadania.'), element('p', '', 'Wynik aktualizuje się po każdym wyborze. Poprawne odpowiedzi zobaczysz w podsumowaniu. Zapisujemy tylko bieżącą próbę w tej karcie. Bez konta i bez rankingu.'));
  main.append(note);
}

function modeCard(number: string, title: string, description: string, accent: string): HTMLElement {
  const card = element('section', `mode-card ${accent}`);
  card.append(element('span', 'card-number', number), element('h3', '', title), element('p', 'card-description', description));
  return card;
}

function addStart(card: HTMLElement, mode: Mode, label: string): void {
  const reason = unavailableReason(bank!, profileId, mode);
  const startButton = button(label + ' →', () => start(mode), 'button primary');
  startButton.disabled = !!reason;
  if (reason) card.append(element('p', 'pool-warning', reason));
  card.append(startButton);
}

function timerText(): string {
  const seconds = Math.max(0, Math.ceil((attempt!.deadline - Date.now()) / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function taskTags(task: Task): HTMLElement {
  const tags = element('ul', 'task-tags'); tags.setAttribute('aria-label', 'Tematy zadania');
  const dictionary = bank?.dictionary;
  for (const label of [dictionary?.grupy[task.group]?.nazwa ?? task.group,
    dictionary?.tagi[task.tag]?.nazwa ?? task.tag]) {
    tags.append(element('li', '', label.replaceAll('-', ' ')));
  }
  return tags;
}

function updateLiveScore(): void {
  const display = document.getElementById('live-score');
  if (!display || !attempt) return;
  const result = score(attempt);
  display.textContent = `Twój wynik: ${formatPoints(result.quarters)} / ${formatPoints(result.maxQuarters)} pkt`;
}

function outcome(task: Task): 'correct' | 'wrong' | 'blank' {
  const choice = attempt!.answers[task.id];
  return isCorrect(task, choice) ? 'correct' : choice === null ? 'blank' : 'wrong';
}

const outcomeLabels = { correct: 'poprawna odpowiedź', wrong: 'błędna odpowiedź', blank: 'bez odpowiedzi' };

function renderQuestion(main: HTMLElement): void {
  const current = attempt!;
  const task = current.tasks[current.index];
  const top = element('div', 'test-top');
  const name = current.mode.kind === 'mix' ? 'Miks' : current.mode.kind === 'training' ? 'Krótki trening' : `Rocznik ${current.editions[0].year}`;
  top.append(element('p', 'eyebrow', name));
  const clock = element('div', 'timer');
  clock.append(element('span', '', 'Pozostało '));
  const time = element('span', '', timerText()); time.id = 'timer'; time.setAttribute('role', 'timer');
  clock.append(time); top.append(clock); main.append(top);
  const liveScore = element('p', 'live-score'); liveScore.id = 'live-score';
  liveScore.setAttribute('role', 'status'); liveScore.setAttribute('aria-live', 'polite');
  const result = score(current);
  liveScore.textContent = `Twój wynik: ${formatPoints(result.quarters)} / ${formatPoints(result.maxQuarters)} pkt`;
  main.append(liveScore);
  const title = element('div', 'question-heading');
  title.append(element('h1', '', `Zadanie ${current.index + 1} z ${current.tasks.length}`), element('span', 'point-badge', `${task.points} pkt`));
  main.append(title, taskTags(task));
  const edition = current.editions.find(e => e.id === task.editionId)!;
  main.append(element('p', 'source-label', `Alfik ${edition.year} · zadanie ${task.number}. Daty w treści odnoszą się do roku arkusza.`));
  if (task.awardAll) main.append(element('p', 'notice', 'Zadanie anulowane przez organizatora. Pełne punkty są przyznane także bez odpowiedzi.'));
  const progress = element('progress'); progress.max = current.tasks.length;
  progress.value = Object.values(current.answers).filter(v => v !== null).length;
  progress.setAttribute('aria-label', 'Liczba zaznaczonych odpowiedzi'); main.append(progress);
  const card = element('section', 'question-card');
  const stem = element('div', 'question-stem'); stem.id = 'question-stem'; stem.append(content(task.stem)); card.append(stem);
  const options = element('fieldset', 'options');
  options.append(element('legend', 'sr-only', 'Wybierz jedną odpowiedź'));
  for (const letter of LETTERS) {
    const row = element('div', 'option');
    const radio = element('input'); radio.type = 'radio'; radio.name = 'answer'; radio.id = `answer-${letter}`;
    radio.value = letter; radio.checked = current.answers[task.id] === letter;
    const label = element('label'); label.htmlFor = radio.id;
    const text = element('span', 'option-content'); text.append(content(task.options[letter], false));
    label.append(element('span', 'option-letter', letter), text);
    radio.addEventListener('change', () => {
      attempt = answer(attempt!, letter); persist();
      if (attempt.status === 'finished') render(true);
      else {
        updateLiveScore();
        progress.value = Object.values(attempt.answers).filter(v => v !== null).length;
        main.querySelectorAll<HTMLButtonElement>('.question-nav button').forEach((b, i) => {
          const done = attempt!.answers[attempt!.tasks[i].id] !== null;
          b.classList.toggle('answered', done);
          b.setAttribute('aria-label', `Zadanie ${i + 1}, ${done ? 'zaznaczona odpowiedź' : 'bez odpowiedzi'}`);
        });
      }
    });
    row.append(radio, label);
    for (const image of task.options[letter].filter((n): n is Extract<ContentNode, { type: 'image' }> => n.type === 'image')) {
      row.append(button(`Powiększ rysunek ${letter} ↗`, () => zoom(image.file, image.alt), 'text-button option-zoom'));
    }
    options.append(row);
  }
  card.append(options, button('Wyczyść odpowiedź', () => { attempt = answer(attempt!, null); persist(); render(); }, 'text-button'));
  main.append(card);
  const navigation = element('div', 'test-actions');
  const back = button('← Poprzednie', () => move(current.index - 1), 'button secondary'); back.disabled = current.index === 0;
  navigation.append(back);
  if (current.index < current.tasks.length - 1) navigation.append(button('Następne →', () => move(current.index + 1), 'button primary'));
  else navigation.append(button('Przejdź do wyniku →', confirmFinish, 'button primary'));
  main.append(navigation, questionNavigation(), button('Zakończ test', confirmFinish, 'text-button finish-button'));
  const live = element('p', 'sr-only'); live.id = 'timer-announcement'; live.setAttribute('role', 'status'); main.append(live);
}

function move(index: number): void { attempt = navigate(attempt!, index); persist(); render(true); }

function questionNavigation(): HTMLElement {
  const nav = element('nav', 'question-nav'); nav.setAttribute('aria-label', 'Przejdź do zadania');
  attempt!.tasks.forEach((task, index) => {
    const done = attempt!.answers[task.id] !== null;
    const finished = attempt!.status === 'finished';
    const state = outcome(task);
    const symbol = finished ? { correct: '✓', wrong: '×', blank: '–' }[state] : '';
    const item = button(`${index + 1}${symbol ? ` ${symbol}` : ''}`, () => move(index), finished ? state : done ? 'answered' : '');
    item.setAttribute('aria-label', `Zadanie ${index + 1}, ${finished ? outcomeLabels[state] : done ? 'zaznaczona odpowiedź' : 'bez odpowiedzi'}`);
    if (index === attempt!.index) item.setAttribute('aria-current', 'step');
    nav.append(item);
  });
  return nav;
}

function confirmHome(): void {
  if (!attempt || attempt.status === 'finished') { home(); return; }
  const dialog = element('dialog', 'confirmation');
  const heading = element('h2', '', 'Wrócić do wyboru trybu?'); heading.id = 'home-title';
  dialog.setAttribute('aria-labelledby', heading.id);
  dialog.append(heading, element('p', '', 'Bieżąca próba zostanie przerwana. Nowy trening zacznie się od początku.'));
  const actions = element('div', 'dialog-actions');
  actions.append(button('Zostań przy zadaniu', () => dialog.close(), 'button secondary'),
    button('Tak, wybierz tryb', () => { dialog.close(); home(); }, 'button primary'));
  dialog.append(actions); dialog.addEventListener('close', () => dialog.remove());
  document.body.append(dialog); dialog.showModal();
}

function confirmFinish(): void {
  attempt = expire(attempt!);
  if (attempt.status === 'finished') { persist(); render(true); return; }
  const blank = Object.values(attempt.answers).filter(v => v === null).length;
  const dialog = element('dialog', 'confirmation');
  const heading = element('h2', '', 'Kończymy na dziś?'); heading.id = 'finish-title';
  dialog.setAttribute('aria-labelledby', 'finish-title');
  dialog.append(heading, element('p', '', `Liczba pustych odpowiedzi: ${blank}. Po zakończeniu nie będzie można zmieniać wyborów.`));
  const actions = element('div', 'dialog-actions');
  actions.append(button('Wróć do zadań', () => dialog.close(), 'button secondary'),
    button('Tak, zakończ test', () => { attempt = finish(attempt!); persist(); dialog.close(); render(true); }, 'button primary'));
  dialog.append(actions); dialog.addEventListener('close', () => dialog.remove());
  document.body.append(dialog); dialog.showModal();
}

function renderResult(main: HTMLElement): void {
  const current = attempt!; const result = score(current);
  const summary = element('section', 'result-summary');
  summary.append(element('p', 'eyebrow', 'PRÓBA ZAKOŃCZONA'), element('h1', '', 'Kolejny krok za Tobą.'),
    element('p', '', current.finishReason === 'time' ? 'Czas minął. Sprawdź swoje odpowiedzi.' : 'Sprawdź, co już umiesz i do czego warto wrócić.'));
  const totals = element('div', 'result-totals');
  totals.append(element('p', '', `${result.correct} / ${current.tasks.length} poprawnych`),
    element('p', '', `${formatPoints(result.quarters)} / ${formatPoints(result.maxQuarters)} pkt`));
  summary.append(totals);
  const stats = element('div', 'result-stats');
  for (const [label, count, cls] of [['Poprawne', result.correct, 'correct'], ['Błędne', result.wrong, 'wrong'], ['Pominięte', result.blank, 'blank']] as const) {
    stats.append(element('span', cls, `${label}: ${count}`));
  }
  summary.append(stats);
  const awarded = current.tasks.filter(task => task.awardAll).length;
  if (awarded) summary.append(element('p', '', `W tym ${awarded} anulowane zadanie z pełnymi punktami zgodnie z oficjalnym kluczem.`));
  const actions = element('div', 'result-actions');
  const again = button('Spróbuj jeszcze raz →', () => start(current.mode), 'button primary'); again.disabled = !bank;
  actions.append(again, button('Wybierz inny tryb', home, 'button secondary')); summary.append(actions); main.append(summary);
  main.append(element('h2', 'review-title', 'Przejrzyj swoje odpowiedzi'), questionNavigation());
  const task = current.tasks[current.index]; const chosen = current.answers[task.id];
  const edition = current.editions.find(e => e.id === task.editionId)!;
  const card = element('section', `question-card review review-${outcome(task)}`);
  card.append(element('h3', '', `Zadanie ${current.index + 1} · ${task.awardAll ? 'Anulowane — pełne punkty' : chosen === null ? 'Pominięta odpowiedź' : isCorrect(task, chosen) ? 'Poprawna odpowiedź' : 'Błędna odpowiedź'}`),
    element('p', 'source-label', `Alfik ${edition.year} · zadanie ${task.number} · ${task.points} pkt`), taskTags(task));
  const stem = element('div', 'question-stem'); stem.append(content(task.stem)); card.append(stem);
  for (const letter of LETTERS) {
    const row = element('div', `review-option ${isCorrect(task, letter) ? 'correct' : letter === chosen ? 'wrong' : ''}`);
    row.append(element('span', 'option-letter', letter));
    const body = element('div'); body.append(content(task.options[letter]));
    if (isCorrect(task, letter)) body.append(element('strong', 'answer-status', task.awardAll ? 'Odpowiedź uznana — zadanie anulowane' : 'Poprawna odpowiedź z klucza'));
    if (letter === chosen) body.append(element('span', 'answer-status', 'Twój wybór'));
    row.append(body); card.append(row);
  }
  if (outcome(task) === 'wrong' && task.explanation) {
    const guide = element('aside', 'explanation');
    const heading = element('h4', '', 'Jak to rozwiązać?'); heading.id = 'explanation-title';
    guide.setAttribute('aria-labelledby', heading.id);
    guide.append(heading, element('p', '', task.explanation.text),
      element('p', 'source-label', task.explanation.author));
    card.append(guide);
  }
  const source = element('p', 'source-label', `Klucz: ${task.source.key.pozycja}, strona ${task.source.key.strona}. `);
  const doc = edition.documents.find(d => d.id === task.source.key.dokument);
  if (doc) { const link = element('a', '', 'Oficjalny klucz ↗'); link.href = doc.url + `#page=${task.source.key.strona}`; link.target = '_blank'; link.rel = 'noopener'; source.append(link); }
  const paper = edition.documents.find(d => d.id === task.source.paper.dokument);
  if (paper) { const link = element('a', '', 'Arkusz źródłowy ↗'); link.href = paper.url + `#page=${task.source.paper.strony[0]}`; link.target = '_blank'; link.rel = 'noopener'; source.append(document.createTextNode(' · '), link); }
  card.append(source); main.append(card);
}

function showSources(): void {
  const dialog = element('dialog', 'sources-dialog');
  const title = element('h2', '', 'Źródła zadań'); title.id = 'sources-title'; dialog.setAttribute('aria-labelledby', title.id);
  dialog.append(title, element('p', '', 'Zadania i oficjalne klucze: Łowcy Talentów JERSZ, Alfik Matematyczny. Mat-Trener jest niezależnym narzędziem do nauki.'));
  for (const edition of bank?.editions ?? attempt?.editions ?? []) {
    dialog.append(element('h3', '', `Rocznik ${edition.year} · klasa IV`));
    for (const doc of edition.documents) {
      const link = element('a', 'source-link', doc.rodzaj === 'arkusz' ? 'Arkusz konkursowy ↗' : 'Oficjalny klucz ↗');
      link.href = doc.url; link.target = '_blank'; link.rel = 'noopener'; dialog.append(link);
    }
  }
  dialog.append(button('Zamknij', () => dialog.close()));
  dialog.addEventListener('close', () => dialog.remove()); document.body.append(dialog); dialog.showModal();
}

function tick(): void {
  if (!attempt || attempt.status !== 'active') return;
  const next = expire(attempt);
  if (next !== attempt) {
    attempt = next; persist();
    document.querySelectorAll<HTMLDialogElement>('dialog').forEach(d => d.close());
    render(true); return;
  }
  const time = document.getElementById('timer'); if (time) time.textContent = timerText();
  if (!shownWarning && attempt.deadline - Date.now() <= 60000) {
    shownWarning = true;
    const live = document.getElementById('timer-announcement'); if (live) live.textContent = 'Została mniej niż minuta.';
  }
}

async function loadBank(): Promise<void> {
  try {
    const response = await fetch(base + 'bank.json');
    if (!response.ok) throw new Error('Bank zadań jest chwilowo niedostępny.');
    const incoming = await response.json() as Bank;
    if (incoming.schema !== 1 || !Array.isArray(incoming.tasks) || !Array.isArray(incoming.editions)) throw new Error('Nieprawidłowy format banku zadań.');
    bank = incoming; loadError = '';
  } catch (error) { loadError = error instanceof Error ? error.message : 'Nie udało się wczytać banku.'; }
  render();
}

render();
if (attempt) persist();
void loadBank();
setInterval(tick, 250);
document.addEventListener('visibilitychange', tick);
window.addEventListener('pageshow', tick);
