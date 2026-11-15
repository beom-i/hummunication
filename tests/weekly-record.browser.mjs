import assert from 'node:assert/strict';

// UI fixtures replace server reads only; saves must never reach a real database.
export async function mockWeeklyRecord(page, data) {
  const origin = new URL(await page.url()).origin;
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(origin).hostname), 'Use a local app only');
  const record = { id: data.date, data, ref: { id: '00000000-0000-4000-8000-000000000010', sermon: null }, updatedAt: `${data.date}T00:00:00.000Z` };
  const { identifier } = await page.cdp('Page.addScriptToEvaluateOnNewDocument', { source: `
    sessionStorage.setItem('hummunication.weekly.edit.' + ${JSON.stringify(record.id)}, '1');
    const fetchOriginal = window.fetch;
    window.fetch = async (...args) => {
      if (!new Headers(args[1]?.headers).has('Next-Action')) return fetchOriginal(...args);
      const [input] = JSON.parse(args[1].body);
      if (input === undefined) return fetchOriginal(...args);
      if (input !== ${JSON.stringify(record.id)}) throw new Error('This UI fixture permits server reads only');
      return new Response('0:{"a":"$@1","f":"","b":"test"}\\n1:' + JSON.stringify({ ok: true, data: ${JSON.stringify(record)} }) + '\\n', { headers: { 'content-type': 'text/x-component' } });
    };
  ` });
  return {
    goto: path => page.goto(origin + path.replace('/weekly?', `/weekly?bulletin=${record.id}&`), { timeout: 60000 }),
    dispose: () => page.cdp('Page.removeScriptToEvaluateOnNewDocument', { identifier }),
  };
}
