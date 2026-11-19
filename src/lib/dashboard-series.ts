export type Gran = "hour" | "day" | "month";
export type SeriesBlock = { gran: Gran; labels: string[]; nowIndex: number; currentLabel: string; cur: Record<string, number[]> };
