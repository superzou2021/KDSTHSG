"use client";

import Image from "next/image";
import Link from "next/link";
import Layout from "@/components/Layout";
import OfficeAverageTable from "@/components/OfficeAverageTable";
import OfficeTop3Panel from "@/components/OfficeTop3Panel";
import RankingTable from "@/components/RankingTable";
import { useCurrentPlayer, useRanking } from "@/hooks/use-game-data";

export default function RankingPage() {
  const { playerId } = useCurrentPlayer();
  const { ranking } = useRanking(playerId, 3000);

  const context = ranking.context;
  const player = context?.player;
  const rank = context?.rank || 0;
  const isInTop10 = rank > 0 && rank <= 10;

  return (
    <Layout title="排行榜" hideHeader>
      <section className="rankingPage">
        <div className="rankingPageBg" aria-hidden="true">
          <Image
            className="rankingPageBgImage"
            src="/image/source/ranking/page-bg.png"
            alt=""
            fill
            priority
            sizes="100vw"
          />
        </div>

        <div className="rankingPageContent">
          <header className="rankingNav">
            <Link className="rankingNavLink" href="/lobby">
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="8" viewBox="0 0 10 8" fill="none" aria-hidden="true">
                <path
                  opacity="0.9"
                  d="M0.513405 0.994867H9.4866C9.77058 0.994867 10 0.772058 10 0.497434C10 0.222938 9.77071 0 9.4866 0H0.513405C0.229945 0 0 0.222809 0 0.497434C0 0.772058 0.229945 0.994867 0.513405 0.994867ZM9.48646 3.48203H0.513405C0.229294 3.48203 0 3.70484 0 3.97947C0 4.25409 0.229294 4.4769 0.513405 4.4769H9.4866C9.77058 4.4769 10 4.25409 10 3.97947C9.99987 3.70484 9.76914 3.48203 9.48646 3.48203ZM9.48646 7.00513H0.513405C0.230075 7.00513 0 7.22794 0 7.50257C0 7.77719 0.229945 8 0.513405 8H9.4866C9.77058 8 10 7.77719 10 7.50257C9.99987 7.22807 9.77058 7.00513 9.48646 7.00513Z"
                  fill="white"
                />
              </svg>
              活动大厅
            </Link>
            <h1>排行榜</h1>
          </header>

          {player && (
            <section className="rankingProfile">
              <div className="rankingProfileBadge" aria-hidden="true">
                <Image
                  className="rankingProfileStar"
                  src="/image/source/ranking/star-badge.png"
                  alt=""
                  width={119}
                  height={119}
                />
              </div>
              <div className="rankingProfileBg" aria-hidden="true">
                <svg xmlns="http://www.w3.org/2000/svg" width="327" height="149" viewBox="0 0 327 149" fill="none" className="rankingProfileBgSvg">
                  <foreignObject x="-2" y="-2" width="331" height="153">
                    <div
                      xmlns="http://www.w3.org/1999/xhtml"
                      style={{
                        backdropFilter: "blur(1px)",
                        clipPath: "url(#rankingProfileBgClip)",
                        height: "100%",
                        width: "100%",
                      }}
                    />
                  </foreignObject>
                  <path
                    d="M327 38.4176C327 31.7902 321.627 26.4176 315 26.4176H202.872C198.615 26.4176 194.677 24.1621 192.522 20.4903L183.978 5.92733C181.823 2.25553 177.885 0 173.628 0H12C5.37259 0 0 5.37258 0 12V137C0 143.627 5.37259 149 12 149H315C321.627 149 327 143.627 327 137L327 38.4176Z"
                    fill="#0CF6BD"
                    fillOpacity="0.1"
                  />
                  <defs>
                    <clipPath id="rankingProfileBgClip" transform="translate(2 2)">
                      <path d="M327 38.4176C327 31.7902 321.627 26.4176 315 26.4176H202.872C198.615 26.4176 194.677 24.1621 192.522 20.4903L183.978 5.92733C181.823 2.25553 177.885 0 173.628 0H12C5.37259 0 0 5.37258 0 12V137C0 143.627 5.37259 149 12 149H315C321.627 149 327 143.627 327 137L327 38.4176Z" />
                    </clipPath>
                  </defs>
                </svg>
              </div>
              <h2 className="rankingProfileName">{player.name}</h2>
              <span className="rankingOfficeBadge">{player.office}</span>
              <p className="rankingProfileStatus">{isInTop10 ? `第 ${rank} 名` : "未上榜"}</p>
              <div className="rankingProfileScore">
                <span>TOTAL SCORE</span>
                <b>{player.totalScore}</b>
              </div>
            </section>
          )}

          <section className="rankingSection">
            <div className="rankingSectionHeader">
              <h2>总排行榜</h2>
              <Image
                className="rankingTop10Watermark"
                src="/image/source/ranking/top10-watermark.png"
                alt=""
                width={163}
                height={40}
                aria-hidden="true"
              />
            </div>
            <RankingTable data={ranking.top10} currentPlayerId={playerId || undefined} variant="ranking" />
          </section>

          <section className="rankingSection">
            <h2>地区平均分排行榜</h2>
            <OfficeAverageTable data={ranking.officeAverage} variant="ranking" />
          </section>

          <section className="rankingSection">
            <h2>各地区TOP3</h2>
            <OfficeTop3Panel data={ranking.officeTop3} variant="ranking" />
          </section>
        </div>
      </section>
    </Layout>
  );
}
