import { weeklyDefaultValues, weeklyDraftSchema, type WeeklyFormData } from "../schemas";
import { upcomingPublishDates } from "./publish-dates";

export function initialWeeklyValues(draft?: WeeklyFormData, now = new Date()): WeeklyFormData {
  const date = upcomingPublishDates(now)[1];
  const values = draft ?? weeklyDraftSchema.parse({ ...weeklyDefaultValues, date, sermon: { ...weeklyDefaultValues.sermon, date } });
  const sermonDate = !values.sermon.date || values.sermon.date === values.date ? date : values.sermon.date;
  return { ...values, date, sermon: { ...values.sermon, date: sermonDate } };
}
