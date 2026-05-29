type CountdownProps = {
  seconds: number;
  total: number;
};

export default function Countdown({ seconds, total }: CountdownProps) {
  const percent = total > 0 ? Math.max(0, Math.min(100, (seconds / total) * 100)) : 0;
  return (
    <div className="countdown">
      <div>
        <span>倒计时</span>
        <b>{seconds}s</b>
      </div>
      <div className="timerTrack">
        <span style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
