import assert from "node:assert/strict";

export async function verifyWeeklyFeedback(page) {
  const state = await page.evaluate(() => {
    const main = document.querySelector('.weekly-workspace');
    const summary = document.querySelector('#weekly-form-errors');
    const rect = summary.getBoundingClientRect();
    return {
      oneSummary: document.querySelectorAll('#weekly-form-errors').length === 1,
      insideFooter: !!summary.closest('.weekly-footer'),
      inlineErrors: main.querySelectorAll('[data-slot="field-error"]').length,
      visible: rect.top >= 0 && rect.bottom <= innerHeight,
      buttonsVisible: [...document.querySelectorAll('.weekly-footer button')].every(button => button.getBoundingClientRect().bottom <= innerHeight),
      oldStatus: /브라우저에 보관|팀원 로그인/.test(main.textContent),
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
    };
  });
  assert.deepEqual(state, { oneSummary: true, insideFooter: true, inlineErrors: 0, visible: true, buttonsVisible: true, oldStatus: false, horizontalOverflow: false });
  return state;
}
