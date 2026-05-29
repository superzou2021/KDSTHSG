import test from "node:test";
import assert from "node:assert/strict";
import { getOfficeAverageRanking, getOfficeTop3, getPlayerRank, getTop10Ranking } from "./ranking.ts";
import type { Player } from "../types/index.ts";

const players: Player[] = [
  { id: "a", name: "A", phone: "13900000001", office: "北京", team: "Alpha", totalScore: 300, completedGames: [], finalSubmitted: false, created: "2026-01-01T09:00:00.000Z", updated: "2026-01-01T09:10:00.000Z", finalCompletedAt: "2026-01-01T09:10:00.000Z" },
  { id: "b", name: "B", phone: "13900000002", office: "北京", team: "Beta", totalScore: 300, completedGames: [], finalSubmitted: false, created: "2026-01-01T09:01:00.000Z", updated: "2026-01-01T09:09:00.000Z", finalCompletedAt: "2026-01-01T09:09:00.000Z" },
  { id: "c", name: "C", phone: "13900000003", office: "上海", team: "Gamma", totalScore: 180, completedGames: [], finalSubmitted: false, created: "2026-01-01T09:02:00.000Z", updated: "2026-01-01T09:12:00.000Z" }
];

test("ranking sorts by score then completion time", () => {
  const top = getTop10Ranking(players);
  assert.equal(top[0].playerId, "b");
  assert.equal(getPlayerRank(players, "a"), 2);
});

test("office rankings are calculated from grouped players", () => {
  const averages = getOfficeAverageRanking(players);
  assert.equal(averages[0].office, "北京");
  assert.equal(averages[0].averageScore, 300);

  const officeTop3 = getOfficeTop3(players);
  assert.equal(officeTop3.find((group) => group.office === "北京")?.players.length, 2);
});
