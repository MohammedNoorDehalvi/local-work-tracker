import {
  DatabaseSchema,
  AnalyticsResponse,
  AnalyticsSummary,
  DailyWorkTime,
  ApplicationUsageMetric,
  HourlyActivityMetric,
  FileExtensionMetric,
  FileEventMetric,
} from "./types";
import { DateRangeInterval, formatDateKey, parseISO } from "./date-utils";
import { subDays } from "date-fns";

export function calculateAnalytics(
  db: DatabaseSchema,
  interval: DateRangeInterval
): AnalyticsResponse {
  const fromMs = interval.from.getTime();
  const toMs = interval.to.getTime();

  // Filter application activities in range
  const filteredApps = db.applicationActivity.filter((a) => {
    const start = parseISO(a.startedAt).getTime();
    const end = parseISO(a.endedAt).getTime();
    return end >= fromMs && start <= toMs;
  });

  // Filter sessions in range
  const filteredSessions = db.sessions.filter((s) => {
    const start = parseISO(s.startedAt).getTime();
    const end = s.endedAt ? parseISO(s.endedAt).getTime() : Date.now();
    return end >= fromMs && start <= toMs;
  });

  // Filter input buckets in range
  const filteredInputs = db.inputActivity.filter((i) => {
    const start = parseISO(i.bucketStart).getTime();
    return start >= fromMs && start <= toMs;
  });

  // Filter file events in range
  const filteredFiles = db.fileActivity.filter((f) => {
    const time = parseISO(f.timestamp).getTime();
    return time >= fromMs && time <= toMs;
  });

  // Filter idle periods in range
  const filteredIdles = db.idlePeriods.filter((id) => {
    const start = parseISO(id.startedAt).getTime();
    const end = parseISO(id.endedAt).getTime();
    return end >= fromMs && start <= toMs;
  });

  // 1. Calculate Summary Metrics
  let totalActiveDurationSeconds = 0;
  let totalIdleDurationSeconds = 0;

  for (const app of filteredApps) {
    if (!app.isIdle) {
      totalActiveDurationSeconds += app.durationSeconds;
    }
  }

  for (const idle of filteredIdles) {
    totalIdleDurationSeconds += idle.durationSeconds;
  }

  const totalDurationSeconds = totalActiveDurationSeconds + totalIdleDurationSeconds;
  const productivePercentage =
    totalDurationSeconds > 0
      ? Math.round((totalActiveDurationSeconds / totalDurationSeconds) * 100)
      : 0;

  const sessionCount = filteredSessions.length;
  let longestSessionDurationSeconds = 0;
  let totalSessionDuration = 0;

  for (const s of filteredSessions) {
    const duration = s.activeDurationSeconds;
    totalSessionDuration += duration;
    if (duration > longestSessionDurationSeconds) {
      longestSessionDurationSeconds = duration;
    }
  }

  const averageSessionDurationSeconds =
    sessionCount > 0 ? Math.round(totalSessionDuration / sessionCount) : 0;

  // 2. Application Usage Breakdown & Switches
  const appDurationMap = new Map<string, number>();
  const appSwitchMap = new Map<string, number>();
  let totalApplicationSwitches = 0;
  let lastAppName = "";

  for (const app of filteredApps) {
    if (!app.isIdle) {
      const currentDur = appDurationMap.get(app.appName) || 0;
      appDurationMap.set(app.appName, currentDur + app.durationSeconds);

      if (lastAppName && lastAppName !== app.appName) {
        totalApplicationSwitches++;
        const currentSwitches = appSwitchMap.get(app.appName) || 0;
        appSwitchMap.set(app.appName, currentSwitches + 1);
      }
      lastAppName = app.appName;
    }
  }

  let mostUsedApplication: string | null = null;
  let maxAppDuration = 0;
  const topApplications: ApplicationUsageMetric[] = [];

  for (const [appName, duration] of appDurationMap.entries()) {
    if (duration > maxAppDuration) {
      maxAppDuration = duration;
      mostUsedApplication = appName;
    }
    const percentage =
      totalActiveDurationSeconds > 0
        ? Math.round((duration / totalActiveDurationSeconds) * 100)
        : 0;
    topApplications.push({
      appName,
      durationSeconds: duration,
      percentage,
      switchCount: appSwitchMap.get(appName) || 0,
    });
  }

  topApplications.sort((a, b) => b.durationSeconds - a.durationSeconds);

  // 3. Daily Totals
  const dailyMap = new Map<string, { activeSeconds: number; idleSeconds: number; sessionCount: number }>();

  for (const app of filteredApps) {
    const dateKey = formatDateKey(app.startedAt);
    const existing = dailyMap.get(dateKey) || { activeSeconds: 0, idleSeconds: 0, sessionCount: 0 };
    if (!app.isIdle) {
      existing.activeSeconds += app.durationSeconds;
    }
    dailyMap.set(dateKey, existing);
  }

  for (const idle of filteredIdles) {
    const dateKey = formatDateKey(idle.startedAt);
    const existing = dailyMap.get(dateKey) || { activeSeconds: 0, idleSeconds: 0, sessionCount: 0 };
    existing.idleSeconds += idle.durationSeconds;
    dailyMap.set(dateKey, existing);
  }

  for (const session of filteredSessions) {
    const dateKey = formatDateKey(session.startedAt);
    const existing = dailyMap.get(dateKey) || { activeSeconds: 0, idleSeconds: 0, sessionCount: 0 };
    existing.sessionCount += 1;
    dailyMap.set(dateKey, existing);
  }

  const dailyTotals: DailyWorkTime[] = Array.from(dailyMap.entries())
    .map(([date, val]) => ({
      date,
      activeSeconds: Math.round(val.activeSeconds),
      idleSeconds: Math.round(val.idleSeconds),
      sessionCount: val.sessionCount,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Find most active day
  let mostActiveDay: string | null = null;
  let maxDayActive = 0;
  for (const day of dailyTotals) {
    if (day.activeSeconds > maxDayActive) {
      maxDayActive = day.activeSeconds;
      mostActiveDay = day.date;
    }
  }

  // 4. Hourly Distribution (0 to 23)
  const hourlyDistribution: HourlyActivityMetric[] = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    activeSeconds: 0,
    idleSeconds: 0,
    keyPressCount: 0,
    mouseClickCount: 0,
    fileEventsCount: 0,
  }));

  for (const app of filteredApps) {
    const hour = parseISO(app.startedAt).getHours();
    if (hour >= 0 && hour < 24) {
      if (!app.isIdle) {
        hourlyDistribution[hour].activeSeconds += app.durationSeconds;
      }
    }
  }

  for (const idle of filteredIdles) {
    const hour = parseISO(idle.startedAt).getHours();
    if (hour >= 0 && hour < 24) {
      hourlyDistribution[hour].idleSeconds += idle.durationSeconds;
    }
  }

  for (const input of filteredInputs) {
    const hour = parseISO(input.bucketStart).getHours();
    if (hour >= 0 && hour < 24) {
      hourlyDistribution[hour].keyPressCount += input.keyPressCount;
      hourlyDistribution[hour].mouseClickCount += input.mouseClickCount;
    }
  }

  for (const file of filteredFiles) {
    const hour = parseISO(file.timestamp).getHours();
    if (hour >= 0 && hour < 24) {
      hourlyDistribution[hour].fileEventsCount += 1;
    }
  }

  // Find most active hour
  let mostActiveHour: number | null = null;
  let maxHourActive = 0;
  for (const h of hourlyDistribution) {
    if (h.activeSeconds > maxHourActive) {
      maxHourActive = h.activeSeconds;
      mostActiveHour = h.hour;
    }
  }

  // 5. Input metrics
  let totalKeyPressCount = 0;
  let totalMouseClickCount = 0;
  const inputTrends: Array<{ timestamp: string; keyPressCount: number; mouseClickCount: number }> = [];

  for (const input of filteredInputs) {
    totalKeyPressCount += input.keyPressCount;
    totalMouseClickCount += input.mouseClickCount;
    inputTrends.push({
      timestamp: input.bucketStart,
      keyPressCount: input.keyPressCount,
      mouseClickCount: input.mouseClickCount,
    });
  }

  // 6. File metrics
  const extMap = new Map<string, number>();
  const typeMap = new Map<string, number>();

  for (const file of filteredFiles) {
    const ext = file.fileExtension ? `.${file.fileExtension.toLowerCase()}` : "no-ext";
    extMap.set(ext, (extMap.get(ext) || 0) + 1);

    typeMap.set(file.eventType, (typeMap.get(file.eventType) || 0) + 1);
  }

  const byExtension: FileExtensionMetric[] = Array.from(extMap.entries())
    .map(([extension, count]) => ({ extension, count }))
    .sort((a, b) => b.count - a.count);

  const byEventType: FileEventMetric[] = Array.from(typeMap.entries()).map(
    ([eventType, count]) => ({
      eventType: eventType as FileEventMetric["eventType"],
      count,
    })
  );

  // 7. Streak calculation
  const allActiveDates = new Set(
    db.applicationActivity
      .filter((a) => !a.isIdle && a.durationSeconds > 60)
      .map((a) => formatDateKey(a.startedAt))
  );

  const activeDaysCount = allActiveDates.size;
  let currentStreakDays = 0;
  const today = new Date();

  // Check today or yesterday for streak continuity
  const todayKey = formatDateKey(today.toISOString());
  const yesterdayKey = formatDateKey(subDays(today, 1).toISOString());

  const checkDate = allActiveDates.has(todayKey)
    ? today
    : allActiveDates.has(yesterdayKey)
    ? subDays(today, 1)
    : null;

  if (checkDate) {
    let dayCursor = checkDate;
    while (allActiveDates.has(formatDateKey(dayCursor.toISOString()))) {
      currentStreakDays++;
      dayCursor = subDays(dayCursor, 1);
    }
  }

  const summary: AnalyticsSummary = {
    totalActiveDurationSeconds: Math.round(totalActiveDurationSeconds),
    totalIdleDurationSeconds: Math.round(totalIdleDurationSeconds),
    totalDurationSeconds: Math.round(totalDurationSeconds),
    productivePercentage,
    sessionCount,
    averageSessionDurationSeconds,
    longestSessionDurationSeconds: Math.round(longestSessionDurationSeconds),
    mostUsedApplication,
    totalApplicationSwitches,
    totalFileEvents: filteredFiles.length,
    totalKeyPressCount,
    totalMouseClickCount,
    mostActiveDay,
    mostActiveHour,
    activeDaysCount,
    currentStreakDays,
  };

  return {
    dateRange: {
      from: interval.from.toISOString(),
      to: interval.to.toISOString(),
      preset: interval.preset,
    },
    summary,
    dailyTotals,
    topApplications,
    hourlyDistribution,
    inputTrends,
    fileMetrics: {
      byExtension,
      byEventType,
      totalEvents: filteredFiles.length,
    },
  };
}
