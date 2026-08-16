import {
  startOfDay,
  endOfDay,
  subDays,
  format,
  parseISO,
  differenceInSeconds,
  isWithinInterval,
} from "date-fns";

export interface DateRangeInterval {
  from: Date;
  to: Date;
  preset: string;
}

/**
 * Calculates start and end Date objects for preset or custom date ranges.
 */
export function calculateDateRange(
  preset: string = "today",
  customFrom?: string,
  customTo?: string,
  now: Date = new Date()
): DateRangeInterval {
  switch (preset) {
    case "yesterday": {
      const yesterday = subDays(now, 1);
      return {
        from: startOfDay(yesterday),
        to: endOfDay(yesterday),
        preset: "yesterday",
      };
    }
    case "7d": {
      return {
        from: startOfDay(subDays(now, 6)),
        to: endOfDay(now),
        preset: "7d",
      };
    }
    case "30d": {
      return {
        from: startOfDay(subDays(now, 29)),
        to: endOfDay(now),
        preset: "30d",
      };
    }
    case "custom": {
      if (customFrom && customTo) {
        return {
          from: new Date(customFrom),
          to: new Date(customTo),
          preset: "custom",
        };
      }
      return {
        from: startOfDay(now),
        to: endOfDay(now),
        preset: "today",
      };
    }
    case "today":
    default: {
      return {
        from: startOfDay(now),
        to: endOfDay(now),
        preset: "today",
      };
    }
  }
}

/**
 * Formats seconds into human readable "Xh Ym Zs" or "Xm Ys"
 */
export function formatDuration(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "0s";
  const rounded = Math.round(seconds);
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const secs = rounded % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
}

/**
 * Formats seconds to precise "HH:MM:SS" for timers
 */
export function formatDurationDigital(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "00:00:00";
  const rounded = Math.round(seconds);
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const secs = rounded % 60;

  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
}

/**
 * Formats ISO date to localized date string YYYY-MM-DD
 */
export function formatDateKey(isoString: string): string {
  try {
    return format(parseISO(isoString), "yyyy-MM-dd");
  } catch {
    return isoString.slice(0, 10);
  }
}

/**
 * Formats ISO date to human readable timestamp
 */
export function formatDisplayDateTime(isoString: string): string {
  try {
    return format(parseISO(isoString), "MMM d, yyyy HH:mm:ss");
  } catch {
    return isoString;
  }
}

/**
 * Checks if a timestamp falls within a Date interval
 */
export function isTimestampInInterval(timestamp: string, interval: { from: Date; to: Date }): boolean {
  try {
    const date = parseISO(timestamp);
    return isWithinInterval(date, { start: interval.from, end: interval.to });
  } catch {
    return false;
  }
}

export { parseISO, differenceInSeconds };
