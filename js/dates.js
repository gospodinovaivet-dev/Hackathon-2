// Date helpers. Days are stored as local "YYYY-MM-DD" strings so they don't shift with time zones.
const Dates = {
  iso(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  },
  today() {
    return Dates.iso(new Date());
  },
  // A real calendar day within a sensible range (one year back, three years ahead)
  valid(iso) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || "")) return false;
    const d = Dates.parse(iso);
    if (Dates.iso(d) !== iso) return false;
    const days = Dates.daysUntil(iso);
    return days > -365 && days < 1095;
  },
  parse(iso) {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d);
  },
  addDays(iso, n) {
    const d = Dates.parse(iso);
    d.setDate(d.getDate() + Math.round(n));
    return Dates.iso(d);
  },
  daysUntil(iso) {
    return Math.round((Dates.parse(iso) - Dates.parse(Dates.today())) / 86400000);
  },
  format(iso) {
    return Dates.parse(iso).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
  },
  // "14:32" for today, "Mon 20 Oct, 14:32" for older timestamps
  stamp(isoDateTime) {
    const d = new Date(isoDateTime);
    const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return Dates.iso(d) === Dates.today() ? time : `${Dates.format(Dates.iso(d))}, ${time}`;
  }
};
