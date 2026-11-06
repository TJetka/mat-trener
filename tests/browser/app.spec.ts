import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { fixtureBank } from '../fixtures/bank.ts';
import type { Bank } from '../../src/types.ts';

const origin = 'http://mat-trener.test';
const base = '/mat-trener/';
const storageKey = 'mat-trener:attempt:v1';
const image = '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="160" viewBox="0 0 240 160"><rect x="40" y="20" width="120" height="120" fill="#dce7c9" stroke="#176854" stroke-width="3"/><path d="M40 20L160 140M160 20L40 140" stroke="#176854" stroke-width="3"/></svg>';

/** Fulfil every request locally: no HTTP server and no external services. */
async function serve(page: Page, bank: Bank = fixtureBank()): Promise<void> {
  const mime: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2' };
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) throw new Error(`Unexpected external request: ${url.origin}`);
    if (url.pathname.endsWith('/favicon.ico')) return route.fulfill({ status: 204 });
    if (url.pathname === base + 'bank.json') return route.fulfill({ json: bank });
    if (url.pathname.endsWith('figure.svg')) return route.fulfill({ contentType: 'image/svg+xml', body: image });
    const relative = url.pathname === base ? 'index.html' : url.pathname.slice(base.length);
    const file = resolve('dist', relative);
    if (!file.startsWith(resolve('dist') + '/')) throw new Error('Unsafe asset request');
    await route.fulfill({ body: await readFile(file), contentType: mime[extname(file)] ?? 'application/octet-stream' });
  });
}

test('three modes, keyboard answers, back/change/clear, reload and final review', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await serve(page); await page.goto(origin + base);
  await expect(page.getByRole('heading', { name: 'Krótki trening' })).toBeVisible();
  await page.getByRole('radio', { name: '4 pkt', exact: true }).check();
  await page.getByRole('button', { name: 'Zacznij trening' }).click();
  await expect(page.getByRole('heading', { name: 'Zadanie 1 z 8' })).toBeVisible();
  await expect(page.getByText('Poprawna odpowiedź z klucza', { exact: true })).toHaveCount(0);
  await page.locator('#answer-A').focus(); await page.keyboard.press('ArrowRight');
  await expect(page.locator('#answer-B')).toBeChecked();
  await page.getByRole('button', { name: 'Następne' }).click();
  await page.getByRole('button', { name: 'Poprzednie' }).click();
  await page.locator('label[for="answer-D"]').click();
  const original = await page.evaluate(key => JSON.parse(sessionStorage.getItem(key)!), storageKey);
  await page.reload();
  await expect(page.locator('#answer-D')).toBeChecked();
  const restored = await page.evaluate(key => JSON.parse(sessionStorage.getItem(key)!), storageKey);
  expect(restored.tasks).toEqual(original.tasks); expect(restored.deadline).toBe(original.deadline);
  await page.getByRole('button', { name: 'Wyczyść odpowiedź' }).click();
  await expect(page.locator('input[name="answer"]:checked')).toHaveCount(0);
  await page.locator('label[for="answer-D"]').click();
  await page.getByRole('button', { name: 'Zakończ test', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Liczba pustych odpowiedzi: 7');
  await page.getByRole('button', { name: 'Tak, zakończ test' }).click();
  await expect(page.getByText('1 / 8 poprawnych', { exact: true })).toBeVisible();
  await expect(page.getByText('4 / 32 pkt', { exact: true })).toBeVisible();
  await expect(page.getByText('Poprawna odpowiedź z klucza', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Spróbuj jeszcze raz' }).click();
  await expect(page.getByRole('heading', { name: 'Zadanie 1 z 8' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('360px image answers, zoom, math and result have no horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  const bank = fixtureBank();
  for (const task of bank.tasks) {
    task.stem = [{ type: 'text', text: 'Która figura ma cztery równe boki? ' }, { type: 'math', text: '\\frac{8}{2}=4', display: false }];
    task.options.C = [{ type: 'image', file: 'rysunki/authored/figure.svg', alt: 'Figura z czterema bokami i dwiema przekątnymi.' }];
  }
  await serve(page, bank); await page.goto(origin + base);
  await page.screenshot({ path: 'test-results/mobile-home.png', fullPage: true });
  await page.getByRole('button', { name: 'Zacznij miks' }).click();
  await expect(page.locator('.katex')).toBeVisible();
  await page.getByRole('button', { name: 'Powiększ rysunek C' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Zamknij rysunek' }).click();
  await page.locator('label[for="answer-C"]').click();
  await page.getByRole('button', { name: 'Następne' }).click();
  await page.getByRole('button', { name: 'Poprzednie' }).click();
  await page.locator('label[for="answer-D"]').click();
  await page.screenshot({ path: 'test-results/mobile-question.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const sizes = await page.locator('.option label').evaluateAll(labels => labels.map(l => l.getBoundingClientRect().height));
  expect(sizes.every(size => size >= 44)).toBe(true);
  await page.getByRole('button', { name: 'Zakończ test', exact: true }).click();
  await page.getByRole('button', { name: 'Tak, zakończ test' }).click();
  await expect(page.getByText('1 / 8 poprawnych', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('expiry during confirmation finalizes once and reload after deadline stays on result', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-01T12:00:00Z') });
  await serve(page); await page.goto(origin + base);
  await page.getByRole('button', { name: 'Zacznij trening' }).click();
  await page.clock.fastForward(180_000);
  await expect(page.getByRole('timer')).toHaveText('9:00');
  await page.getByRole('button', { name: 'Zakończ test', exact: true }).click();
  await page.clock.fastForward(541_000);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByText('Czas minął. Sprawdź swoje odpowiedzi.')).toBeVisible();
  const before = await page.evaluate(key => sessionStorage.getItem(key), storageKey);
  await page.reload();
  await expect(page.getByText('Czas minął. Sprawdź swoje odpowiedzi.')).toBeVisible();
  expect(await page.evaluate(key => sessionStorage.getItem(key), storageKey)).toBe(before);
  await expect(page.locator('input[name="answer"]')).toHaveCount(0);
});

test('full-year official ordering, source attribution and blank score', async ({ page }) => {
  await serve(page); await page.goto(origin + base);
  await page.getByLabel('Wybierz rocznik').selectOption('alfik-2024-4-sp-pl');
  await page.getByRole('button', { name: 'Zacznij arkusz' }).click();
  await expect(page.getByRole('heading', { name: 'Zadanie 1 z 30' })).toBeVisible();
  await expect(page.getByRole('timer')).toHaveText(/7[45]:\d{2}/);
  await page.getByRole('button', { name: 'Zakończ test', exact: true }).click();
  await page.getByRole('button', { name: 'Tak, zakończ test' }).click();
  await expect(page.getByText('30 / 150 pkt', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Oficjalny klucz' })).toHaveAttribute('href', /#page=1$/);
});

test('all historical tasks render exact text and options from the compiled bank', async ({ page }) => {
  const bank = JSON.parse(await readFile('public/bank.json', 'utf8')) as Bank;
  await serve(page, bank); await page.goto(origin + base);
  await page.screenshot({ path: 'test-results/desktop-home.png', fullPage: true });
  for (const edition of bank.editions) {
    await page.getByLabel('Wybierz rocznik').selectOption(edition.id);
    await page.getByRole('button', { name: 'Zacznij arkusz' }).click();
    const tasks = bank.tasks.filter(t => t.editionId === edition.id).sort((a, b) => a.number - b.number);
    for (const task of tasks) {
      await expect(page.locator('#question-stem')).toHaveText(task.stem.map(n => n.type === 'text' ? n.text : '').join(''));
      for (const letter of ['A', 'B', 'C', 'D', 'E'] as const) {
        await expect(page.locator(`label[for="answer-${letter}"] .option-content`)).toHaveText(task.options[letter].map(n => n.type === 'text' ? n.text : '').join(''));
      }
      if (task.number < tasks.length) await page.getByRole('button', { name: 'Następne' }).click();
    }
    await page.getByRole('button', { name: 'Zakończ test', exact: true }).click();
    await page.getByRole('button', { name: 'Tak, zakończ test' }).click();
    await page.getByRole('button', { name: 'Wybierz inny tryb' }).click();
  }
});
