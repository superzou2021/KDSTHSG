import type { OfficeTop3Group } from "@/types";

type OfficeTop3PanelProps = {
  data: OfficeTop3Group[];
  variant?: "default" | "ranking";
};

export default function OfficeTop3Panel({ data, variant = "default" }: OfficeTop3PanelProps) {
  if (variant === "ranking") {
    return (
      <div className="rankingOfficeTopList">
        {data.map((group) => (
          <section className="rankingOfficeGroup" key={group.office}>
            <div className="rankingOfficeGroupHeader">{group.office}TOP3</div>
            {group.players.map((player) => (
              <div className="rankingRow compact" key={player.playerId}>
                <span className="rankingRankCircle">{player.rank}</span>
                <b className="rankingRowName">{player.name}</b>
                <strong>{player.totalScore}</strong>
              </div>
            ))}
          </section>
        ))}
      </div>
    );
  }

  return (
    <div className="officeTopGrid">
      {data.map((group) => (
        <section className="demoCard" key={group.office}>
          <h3>{group.office} TOP3</h3>
          {group.players.map((player) => (
            <div className="miniRank" key={player.playerId}>
              <span>#{player.rank}</span>
              <b>{player.name}</b>
              <strong>{player.totalScore}</strong>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
