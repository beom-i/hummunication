import assert from "node:assert/strict";
import { upcomingPublishDates } from "../src/features/weekly/utils/publish-dates.ts";

assert.deepEqual(upcomingPublishDates(new Date("2026-11-13T00:00:00Z")), ["2026-11-08", "2026-11-15", "2026-11-22", "2026-11-29", "2026-12-06"]);
assert.equal(upcomingPublishDates(new Date("2026-11-14T15:00:00Z"))[1], "2026-11-15", "Korean Sunday begins while UTC is still Saturday");
assert.equal(upcomingPublishDates(new Date("2026-11-15T14:59:59Z"))[1], "2026-11-15", "Sunday remains the current week until midnight in Korea");
assert.equal(upcomingPublishDates(new Date("2026-11-15T15:00:00Z"))[1], "2026-11-22", "Korean Monday advances the current Sunday regardless of server timezone");
assert.deepEqual(upcomingPublishDates(new Date("2026-12-31T12:00:00Z")), ["2026-12-27", "2027-01-03", "2027-01-10", "2027-01-17", "2027-01-24"]);
assert.deepEqual(upcomingPublishDates(new Date("2028-02-29T00:00:00Z")), ["2028-02-27", "2028-03-05", "2028-03-12", "2028-03-19", "2028-03-26"]);
console.log("PASS: publication Sundays follow Korea time, including month/year boundaries and leap years");
