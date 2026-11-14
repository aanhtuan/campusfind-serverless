// Timestamp displays use the campus timezone consistently in SSR and browsers.
// Date-only event_date values are calendar dates and must not pass through this helper.
const campusDate = new Intl.DateTimeFormat("vi-VN", {
  timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric",
});
export function formatCampusDate(timestamp: string): string {
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? "—" : campusDate.format(date);
}
