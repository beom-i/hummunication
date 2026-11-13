export function upcomingPublishDates(now = new Date()) {
  const korea = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const sunday = new Date(Date.UTC(korea.getUTCFullYear(), korea.getUTCMonth(), korea.getUTCDate()));
  sunday.setUTCDate(sunday.getUTCDate() + (7 - sunday.getUTCDay()) % 7);
  return Array.from({ length: 4 }, (_, index) => {
    const date = new Date(sunday);
    date.setUTCDate(date.getUTCDate() + index * 7);
    return date.toISOString().slice(0, 10);
  });
}
