// CORE LOGIC - avoid editing unless assigned

export function semesterLabelFromDate(date: Date = new Date()): string {
  const month = date.getUTCMonth() + 1;
  const year = date.getUTCFullYear();
  const semester = month <= 5 ? "spring" : month <= 8 ? "summer" : "fall";
  return `${semester}-${year}`;
}
