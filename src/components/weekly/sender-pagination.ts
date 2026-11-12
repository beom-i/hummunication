export function senderPrayerPages(prayer: string) {
  const lines: { number: number; text: string }[] = [];
  prayer.split(/\n+/).filter(line => line.trim()).forEach((paragraph, index) => {
    let text = "";
    let width = 0;
    for (const character of paragraph) {
      const size = /[\u0000-\u00ff]/.test(character) ? 0.55 : 1;
      if (width + size > 24) { lines.push({ number: index + 1, text }); text = ""; width = 0; }
      text += character;
      width += size;
    }
    if (text) lines.push({ number: index + 1, text });
  });
  const pages = [];
  for (let offset = 0; offset < lines.length; offset += 11) pages.push(lines.slice(offset, offset + 11));
  return pages.length ? pages : [[{ number: 1, text: "기도제목을 입력해 주세요" }]];
}
