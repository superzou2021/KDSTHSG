import type { OfficeTop3Group } from "@/types";

type OfficeTop3PanelProps = {
  data: OfficeTop3Group[];
};

export default function OfficeTop3Panel({ data }: OfficeTop3PanelProps) {
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
