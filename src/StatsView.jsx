import React, { useEffect, useMemo, useState } from 'react';
import { useAppData } from './AppData';
import { useTranslation, usePlural } from './i18n';
import { computeStats, sessionsToCsv, dayKey, DAILY_GOALS, DEFAULT_DAILY_GOAL } from './stats';

const StatCard = ({ label, minutes, sessions }) => {
  const { t } = useTranslation();
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-minutes">
        {minutes}
        <span className="stat-unit">{t('stats.minutes')}</span>
      </div>
      <div className="stat-sessions">{t('stats.sessions')}: {sessions}</div>
    </div>
  );
};

const StreakCard = ({ label, days }) => {
  const plural = usePlural();
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-minutes">
        {days}
        <span className="stat-unit">{plural('stats.dayUnit', days)}</span>
      </div>
    </div>
  );
};

// The last 30 days as bars (minutes per day), with the daily goal as a
// dashed line. Days that met the goal are green; today is outlined. The SVG
// stretches to the width (bars only); the labels are text around it, so they
// stay readable on a phone.
const CHART = { width: 600, height: 120, top: 4, gap: 4 };

const DaysChart = ({ days, goal }) => {
  const { t, locale } = useTranslation();
  const plural = usePlural();
  const dateFormat = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' });
  const minutes = days.map((day) => day.seconds / 60);
  const max = Math.max(goal * 1.5, ...minutes);
  const plotHeight = CHART.height - CHART.top;
  const y = (value) => CHART.top + plotHeight * (1 - value / max);
  const slot = CHART.width / days.length;
  const goalDays = days.filter((day) => day.met).length;
  const caption = plural('stats.chartCaption', goalDays).replace('{goal}', goal);

  return (
    <figure className="days-chart">
      <div className="days-chart-plot">
        <svg
          viewBox={`0 0 ${CHART.width} ${CHART.height}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={`${t('stats.last30')}. ${caption}`}
        >
          {days.map((day, i) => {
            const value = minutes[i];
            const top = value > 0 ? Math.min(y(value), CHART.height - 2) : CHART.height - 1;
            const today = i === days.length - 1;
            return (
              <g key={dayKey(day.date)} className={`day-bar ${day.met ? 'met' : value > 0 ? 'some' : 'none'} ${today ? 'today' : ''}`}>
                <title>{`${dateFormat.format(day.date)}: ${Math.round(value)} min`}</title>
                {/* full-height hit area, so short bars are easy to hover */}
                <rect x={i * slot} y="0" width={slot} height={CHART.height} className="day-bar-hit" />
                <rect
                  x={i * slot + CHART.gap / 2}
                  y={top}
                  width={slot - CHART.gap}
                  height={CHART.height - top}
                  vectorEffect="non-scaling-stroke"
                />
              </g>
            );
          })}
          <line x1="0" x2={CHART.width} y1={y(goal)} y2={y(goal)} className="days-chart-goal" vectorEffect="non-scaling-stroke" />
        </svg>
        <span className="days-chart-goal-label" style={{ top: `${(y(goal) / CHART.height) * 100}%` }} aria-hidden="true">
          {goal} min
        </span>
      </div>
      <div className="days-chart-axis" aria-hidden="true">
        <span>{dateFormat.format(days[0].date)}</span>
        <span>{t('stats.today')}</span>
      </div>
      <figcaption className="settings-hint">{caption}</figcaption>
    </figure>
  );
};

// Display only; `stats` is null while loading
export const StatsContent = ({ stats, goal, onGoalChange, onExport, exportState }) => {
  const { t, locale, exerciseText } = useTranslation();
  const plural = usePlural();
  const { exercises, device } = useAppData();

  // Current (translated) name if the exercise still exists, else the name it had then
  const nameOf = (group) => {
    const exercise = exercises.find((e) => e.id === group.exerciseId);
    return exercise ? exerciseText(exercise, 'name') : group.exerciseName;
  };

  const longDate = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="settings-view">
      <div className="settings-content">
        <h2 className="settings-title">{t('stats.title')}</h2>

        {device.recordSessions === false && (
          <p className="settings-warning stats-off">{t('stats.historyOff')}</p>
        )}

        {stats && stats.allTime.sessions === 0 && (
          <section className="settings-section">
            <p className="stats-empty">{t('stats.empty')}</p>
          </section>
        )}

        {stats && stats.allTime.sessions > 0 && (
          <>
            <div className="stat-cards">
              <StatCard label={t('stats.thisWeek')} {...stats.week} />
              <StatCard label={t('stats.thisMonth')} {...stats.month} />
              <StatCard label={t('stats.allTime')} {...stats.allTime} />
            </div>

            <section className="settings-section">
              <div className="stats-section-header">
                <h3>{t('stats.daily')}</h3>
                <label className="daily-goal">
                  <span>{t('stats.goal')}</span>
                  <select value={goal} onChange={(e) => onGoalChange(Number(e.target.value))}>
                    {DAILY_GOALS.map((minutes) => (
                      <option key={minutes} value={minutes}>{minutes} min</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="stat-cards streak-cards">
                <StreakCard label={t('stats.currentStreak')} days={stats.streak.current} />
                <StreakCard label={t('stats.longestStreak')} days={stats.streak.longest} />
              </div>

              <p className="stats-since">
                {plural('stats.since', stats.since.days)
                  .replace('{date}', longDate.format(stats.since.firstDay))
                  .replace('{goal}', goal)
                  .replace('{done}', stats.since.goalDays)
                  .replace('{total}', stats.since.days)}
              </p>

              <h4 className="stats-subtitle">{t('stats.last30')}</h4>
              <DaysChart days={stats.last30} goal={goal} />
            </section>

            <section className="settings-section">
              <h3>{t('stats.perExercise')}</h3>
              <table className="stats-table">
                <thead>
                  <tr>
                    <th>{t('stats.exercise')}</th>
                    <th>{t('stats.sessions')}</th>
                    <th>{t('stats.minutesColumn')}</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.byExercise.map((group) => (
                    <tr key={group.exerciseId}>
                      <td>{nameOf(group)}</td>
                      <td>{group.sessions}</td>
                      <td>{group.minutes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="settings-section">
              <h3>{t('stats.export')}</h3>
              <p className="settings-hint">{t('stats.exportHint')}</p>
              <div className="stats-export">
                <button type="button" className="btn btn-secondary" onClick={onExport} disabled={exportState === 'saving'}>
                  {t('stats.exportButton')}
                </button>
                {exportState === 'saved' && <span className="settings-success" role="status">{t('stats.exported')}</span>}
                {exportState?.error && (
                  <span className="settings-warning" role="alert">
                    {t('stats.exportError').replace('{error}', exportState.error)}
                  </span>
                )}
              </div>
            </section>

            <p className="settings-hint">
              {t('stats.note')}
              {stats.devices > 1 && ` ${t('stats.devices').replace('{n}', stats.devices)}`}
            </p>
          </>
        )}
      </div>
    </div>
  );
};

const StatsView = () => {
  const { getSessions, settings, updateSettings, saveTextFile } = useAppData();
  const [sessions, setSessions] = useState(null);
  const [exportState, setExportState] = useState(null); // null, 'saving', 'saved', { error }
  const goal = settings.dailyGoal ?? DEFAULT_DAILY_GOAL;

  // Read fresh every time the screen opens, so newly synced sessions count
  useEffect(() => {
    let cancelled = false;
    getSessions().then((list) => {
      if (!cancelled) setSessions(list);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => (sessions ? computeStats(sessions, new Date(), goal) : null), [sessions, goal]);

  const handleExport = async () => {
    setExportState('saving');
    try {
      const saved = await saveTextFile(
        `breath-compass-sessions-${dayKey(new Date())}.csv`,
        sessionsToCsv(sessions),
        { name: 'CSV', extensions: ['csv'], mimeType: 'text/csv' }
      );
      setExportState(saved ? 'saved' : null);
    } catch (e) {
      setExportState({ error: String(e?.message ?? e) });
    }
  };

  return (
    <StatsContent
      stats={stats}
      goal={goal}
      onGoalChange={(dailyGoal) => updateSettings({ dailyGoal })}
      onExport={handleExport}
      exportState={exportState}
    />
  );
};

export default StatsView;
