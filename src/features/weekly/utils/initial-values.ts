import { weeklyDefaultValues, weeklyDraftSchema } from "../schemas";
import { upcomingPublishDates } from "./publish-dates";

export function initialWeeklyValues(now = new Date()) {
  const date = upcomingPublishDates(now)[1];
  return weeklyDraftSchema.parse({ ...weeklyDefaultValues, date, sermon: { ...weeklyDefaultValues.sermon, date } });
}
