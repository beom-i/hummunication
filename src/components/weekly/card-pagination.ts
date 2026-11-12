export type CardTextRow = { label: string; text: string };
export const cardLabelSize = (label: string) => Math.min(24, Math.max(10, 600 / Math.max(1, Array.from(label).length)));

// The measuring element uses the same row CSS and width as the exported card.
export function paginateCardRows(rows: CardTextRow[], measure: HTMLElement, maxHeight: number) {
  const pages: CardTextRow[][] = [];
  let page: CardTextRow[] = [];
  const fits = (candidate: CardTextRow[]) => {
    measure.replaceChildren(...candidate.map(row => {
      const element = document.createElement("div");
      element.className = "card-text-row";
      const label = document.createElement("span"), text = document.createElement("p");
      label.textContent = row.label; text.textContent = row.text;
      label.style.fontSize = `${cardLabelSize(row.label)}px`;
      element.append(label, text);
      return element;
    }));
    return measure.getBoundingClientRect().height <= maxHeight + 0.01;
  };
  for (const row of rows) {
    if (fits([...page, row])) { page.push(row); continue; }
    if (page.length) { pages.push(page); page = []; }
    let remaining = Array.from(row.text);
    while (remaining.length && !fits([{ ...row, text: remaining.join("") }])) {
      let low = 0, high = remaining.length;
      while (low < high) {
        const mid = Math.ceil((low + high) / 2);
        if (fits([{ ...row, text: remaining.slice(0, mid).join("") }])) low = mid;
        else high = mid - 1;
      }
      if (!low) throw new Error("카드 본문의 높이를 확인해 주세요");
      pages.push([{ ...row, text: remaining.slice(0, low).join("") }]);
      remaining = remaining.slice(low);
    }
    page.push({ ...row, text: remaining.join("") });
  }
  if (page.length) pages.push(page);
  return pages.length ? pages : [[]];
}
