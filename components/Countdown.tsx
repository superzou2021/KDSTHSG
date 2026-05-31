type CountdownProps = {
  seconds: number;
  total: number;
  currentIndex?: number;
  totalQuestions?: number;
};

export default function Countdown({ seconds, total, currentIndex, totalQuestions }: CountdownProps) {
  const percent = total > 0 ? Math.max(0, Math.min(100, (seconds / total) * 100)) : 0;
  return (
    <div className="countdown">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
        {currentIndex !== undefined && totalQuestions !== undefined ? (
          <span style={{ color: 'var(--ink)', fontWeight: 'bold' }}>{currentIndex + 1}/{totalQuestions}</span>
        ) : (
          <span>倒计时</span>
        )}
        <b style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          {seconds}s
        </b>
      </div>
      <div className="timerTrack">
        <span style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
