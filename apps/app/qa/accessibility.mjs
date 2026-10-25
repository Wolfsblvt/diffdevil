// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/** Browser-exposed semantics and real keyboard transitions on the common App, not spoken screen-reader output. */
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export async function accessibilityJourney({ page, check, go, settled, shot, OUT, ORIGIN, qualifyFrame }) {
  const session = await page.context().newCDPSession(page);
  await session.send('Accessibility.enable');
  const trees = [];
  const tree = async label => {
    const { nodes } = await session.send('Accessibility.getFullAXTree');
    trees.push({ label, nodes });
    return nodes.filter(node => !node.ignored);
  };
  const liveContains = (nodes, text) => {
    const byId = new Map(nodes.map(node => [node.nodeId, node]));
    const contains = node => Boolean(node && (node.name?.value?.includes(text) || node.childIds?.some(id => contains(byId.get(id)))));
    return Boolean(text) && nodes.some(node => node.properties?.some(property => property.name === 'live' && property.value.value === 'polite') && contains(node));
  };
  try {
    for (const [label, path] of [['Overview', '/'], ['Pull requests', '/prs'], ['History', '/history'], ['Files', '/files'], ['PR detail', '/pr/parser-guild/parser-lab/452?per=90d']]) {
      await go(path); await settled();
      const nodes = await tree(label);
      check(`${label}: Chromium exposes one main, a named navigation and a level-one heading`,
        nodes.filter(node => node.role?.value === 'main').length === 1
          && nodes.some(node => node.role?.value === 'navigation' && node.name?.value)
          && nodes.some(node => node.role?.value === 'heading' && node.properties?.some(property => property.name === 'level' && property.value.value === 1)));
      const ids = await page.locator('[data-chart]:not([data-chart="hero"])').evaluateAll(hosts => hosts.map(host => host.dataset.chartId));
      for (const id of ids) {
        const host = page.locator(`[data-chart-id="${id}"]`);
        if (!await host.locator('[data-plot]').count()) continue;
        const plot = host.locator('[data-plot]');
        await plot.focus(); await page.keyboard.press('Home');
        const keyed = await host.locator('[data-announce]').textContent();
        const keyedTree = await tree(`${label}/${id}/keyboard`);
        check(`${label}/${id}: keyboard values are exposed through a polite browser live region`, liveContains(keyedTree, keyed?.trim()));
        await page.keyboard.press('Enter');
        // History's retained bucket pin starts a page swap; do not race the neighboring frame's controls.
        await settled();
        check(`${label}/${id}: pin state is announced`, /pinned/u.test(await host.locator('[data-announce]').textContent()));
        const clear = host.locator('.fr-clear');
        if (await clear.count()) {
          // A drill link may come between the plot and its clear button.
          const stops = [];
          for (let step = 0; step < 3; step++) {
            await page.keyboard.press('Shift+Tab');
            stops.push(await page.evaluate(() => ({ tag: document.activeElement?.tagName, name: document.activeElement?.textContent?.trim().slice(0, 50) })));
            if (await clear.evaluate(element => element === document.activeElement)) break;
          }
          const reached = await clear.evaluate(element => element === document.activeElement);
          check(`${label}/${id}: the pinned clear button is reachable before the plot`, reached, JSON.stringify(stops));
          if (reached) {
            await page.keyboard.press('Enter');
            check(`${label}/${id}: clearing a pin keeps keyboard focus in the chart`, await plot.evaluate(element => element === document.activeElement));
          } else await plot.focus();
        } else await page.keyboard.press('Escape');
        const tableButton = host.getByRole('button', { name: 'Table', exact: true });
        await tableButton.focus(); await page.keyboard.press('Enter');
        const tableTree = await tree(`${label}/${id}/table`);
        const caption = await host.locator('caption').textContent();
        check(`${label}/${id}: Table exposes its caption, column headers and data rows in the browser tree`,
          tableTree.some(node => node.role?.value === 'table' && node.name?.value === caption)
          && tableTree.some(node => node.role?.value === 'columnheader')
          && await host.locator('tbody tr').count() > 0);
        const plotName = await plot.getAttribute('aria-label');
        check(`${label}/${id}: the chart is absent from the accessibility tree in Table view`,
          !tableTree.some(node => node.role?.value === 'application' && node.name?.value === plotName));
        await host.getByRole('button', { name: 'Chart', exact: true }).focus(); await page.keyboard.press('Enter');
      }
    }
    // Pointer inspection can preselect the keyboard's entry date without ever touching its live region.
    // Entry and a boundary arrow still owe that date's values, even when no visual update is needed.
    for (const reducedMotion of ['no-preference', 'reduce']) {
      await page.emulateMedia({ reducedMotion });
      await go('/'); await settled();
      const stage = page.locator('[data-hero-plot]');
      const live = page.locator('[data-chart="hero"] [data-announce]');
      await page.locator('[data-period] a').last().focus();
      await stage.scrollIntoViewIfNeeded();
      const point = await stage.evaluate(element => {
        const host = element.closest('[data-chart]');
        const model = JSON.parse(host.querySelector('[data-chart-model]').textContent);
        const last = model.rows.length - 1;
        const [x, y] = host.__hero.chart.convertToPixel({ gridIndex: 0 }, [last, model.rows[last].cur]);
        const box = element.getBoundingClientRect();
        return { x: box.left + x, y: box.top + y };
      });
      const before = await live.innerText();
      await page.mouse.move(point.x - 8, point.y); await page.mouse.move(point.x, point.y);
      const pointer = await page.locator('[data-hero-dl]').innerText();
      const readout = page.locator('[data-hero-dl]');
      const visual = await readout.boundingBox();
      const visualNode = await readout.locator('span').first().elementHandle();
      check(`Hero ${reducedMotion}: pointer selects a date without announcing it`, /^by /u.test(pointer) && await live.innerText() === before, pointer);
      for (let step = 0; step < 8 && !await stage.evaluate(element => element === document.activeElement); step++) await page.keyboard.press('Tab');
      check(`Hero ${reducedMotion}: Tab reaches the pointer-selected date and announces it`,
        await stage.evaluate(element => element === document.activeElement) && await live.innerText() === pointer, await live.innerText());
      await page.keyboard.press('ArrowRight');
      const boundary = await page.locator('[data-hero-dl]').innerText();
      check(`Hero ${reducedMotion}: the right boundary arrow retains the date and its announcement`, boundary === pointer && await live.innerText() === boundary, JSON.stringify({ pointer, boundary, live: await live.innerText() }));
      check(`Hero ${reducedMotion}: the same-date handoff retains the visual readout and its geometry`,
        await visualNode.evaluate(element => element.isConnected) && JSON.stringify(await readout.boundingBox()) === JSON.stringify(visual));
      await visualNode.dispose();
      const nodes = await tree(`hero/pointer-keyboard/${reducedMotion}`);
      check(`Hero ${reducedMotion}: the handoff values reach the browser's polite region`, liveContains(nodes, boundary));
    }
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await go('/'); await settled();
    const hero = page.locator('[data-hero-plot]');
    await hero.focus(); await page.keyboard.press('ArrowLeft');
    const heroText = await page.locator('[data-hero-dl]').innerText();
    const heroNodes = await tree('hero/keyboard');
    const heroLive = await page.locator('[data-chart="hero"] [data-announce]').count();
    check('Hero: the keyboard date and values have a dedicated polite announcement', heroLive > 0 && /by /u.test(heroText)
      && (heroLive ? (await page.locator('[data-chart="hero"] [data-announce]').innerText()).includes(heroText) : false)
      && liveContains(heroNodes, heroText), heroText);
    if (heroLive) {
      await page.keyboard.press('Escape');
      check('Hero: Escape exposes the restored summary', /Period summary/u.test(await page.locator('[data-chart="hero"] [data-announce]').innerText()));
      const prior = await page.locator('[data-chart="hero"] [data-announce]').innerText();
      await hero.hover(); await page.mouse.move(0, 0);
      check('Hero: pointer movement does not write a live announcement', await page.locator('[data-chart="hero"] [data-announce]').innerText() === prior);
    }
    await qualifyFrame('accessible Overview', '[data-chart-id="volume"]');
    await page.getByRole('link', { name: '7 days', exact: true }).focus(); await page.keyboard.press('Enter');
    await page.waitForURL(url => url.searchParams.get('per') === '7d'); await settled();
    await hero.focus(); await page.keyboard.press('ArrowLeft');
    check('Hero: keyboard announcements survive an in-place period change', await page.locator('[data-chart="hero"] [data-announce]').count() > 0
      && (await page.locator('[data-chart="hero"] [data-announce]').innerText()).includes(await page.locator('[data-hero-dl]').innerText()));
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await go('/'); await settled();
    await page.locator('[data-chart-id="volume"] [data-plot]').focus(); await page.keyboard.press('ArrowLeft');
    check('Reduced motion: keyboard values remain exposed', Boolean(await page.locator('[data-chart-id="volume"] [data-announce]').innerText()));
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await shot('keyboard-overview');
    for (const path of ['/manage', '/manage/repositories', '/manage/repositories/parser-guild/parser-lab', '/manage/defaults', '/manage/plan', '/manage/account']) {
      await go(path);
      const nodes = await tree(path);
      const current = page.locator('.m-tabs [aria-current="page"]');
      const href = new URL(await current.getAttribute('href'), ORIGIN).href;
      check(`${path}: browser navigation exposes Manage and its current link`, nodes.some(node => node.role?.value === 'navigation' && node.name?.value === 'Manage')
        && nodes.some(node => node.role?.value === 'link' && node.name?.value && node.properties?.some(property => property.name === 'url' && property.value.value === href)));
      const unnamed = nodes.filter(node => ['button', 'textbox', 'combobox', 'checkbox', 'radio'].includes(node.role?.value) && !node.name?.value);
      check(`${path}: browser-exposed form controls have names`, unnamed.length === 0, JSON.stringify(unnamed));
    }
    await go('/manage/repositories/parser-guild/parser-lab?confirm=delete');
    const confirmation = await tree('Manage/history-confirmation');
    check('History confirmation: Chromium exposes the named alertdialog and confirmation textbox', confirmation.some(node => node.role?.value === 'alertdialog' && /Delete parser-lab/u.test(node.name?.value ?? ''))
      && confirmation.some(node => node.role?.value === 'textbox' && node.name?.value));
    await page.locator('[data-confirm="delete"] a.m-btn.ghost').focus(); await page.keyboard.press('Enter');
    await page.waitForURL(url => !url.searchParams.has('confirm'));
    let release;
    const held = new Promise(resolve => { release = resolve; });
    const intercept = async route => {
      if (route.request().headers()['x-diffdevil-render'] !== 'page') return route.continue();
      await held;
      await route.fulfill({ status: 503, body: 'Synthetic unavailable analytical read' });
    };
    await page.route(`${ORIGIN}/**`, intercept);
    try {
      await page.goto(`${ORIGIN}/history?per=90d`, { waitUntil: 'domcontentloaded' });
      await page.locator('[data-analytical-region][aria-busy="true"]').waitFor();
      const pending = await tree('History/pending');
      check('Pending data: Chromium exposes busy standing and a truthful loading status with navigation available',
        pending.some(node => node.properties?.some(property => property.name === 'busy' && [true, 1].includes(property.value.value)))
          && await page.getByRole('link', { name: 'Pull requests', exact: true }).count() > 0
          && /Loading current data/u.test(await page.locator('[data-loading-status]').innerText()));
      release();
      await page.locator('[data-loading-retry]:visible').waitFor();
      const failed = await tree('History/unavailable');
      check('Unavailable data: browser text and live status distinguish it from zero and expose Retry',
        failed.some(node => /Data could not load/u.test(node.name?.value ?? ''))
          && /unavailable, not zero/u.test(await page.locator('[data-loading-status]').innerText())
          && /Retry is available/u.test(await page.locator('[data-live-region]').innerText()));
      await shot('keyboard-unavailable');
    } finally { release(); await page.unroute(`${ORIGIN}/**`, intercept); }
    await page.locator('[data-loading-retry]').focus(); await page.keyboard.press('Enter');
    await page.locator('[data-analytical-loading]').waitFor({ state: 'detached' }); await settled();
    check('Retry: Enter loads the data and restores keyboard focus to main', await page.locator('#main').evaluate(element => element === document.activeElement)
      && /Data loaded/u.test(await page.locator('[data-live-region]').innerText()));
    await tree('History/recovered');
  } finally {
    await writeFile(join(OUT, 'accessibility-trees.json'), JSON.stringify(trees, null, 2));
    await session.detach();
  }
}
