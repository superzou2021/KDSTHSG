"use client";

import Image from "next/image";
import OfficeAverageTable from "@/components/OfficeAverageTable";
import OfficeTop3Panel from "@/components/OfficeTop3Panel";
import RankingTable from "@/components/RankingTable";
import { useRanking } from "@/hooks/use-game-data";

export default function ScreenPage() {
  const { ranking, loading } = useRanking(null, 3000);

  return (
    <main className="screenPage">
      <div className="screenPageBg" aria-hidden="true">
        <Image
          className="screenPageBgImage"
          src="/image/source/screen/page-bg.png"
          alt=""
          fill
          priority
          sizes="100vw"
        />
        <div className="screenPageBgGradient" />
      </div>

      <div className="screenPageContent">
        <div className="screenPageInner">
        <header className="screenHeader">
          <div className="screenHeaderMain">
            <span className="screenEyebrow">LIVE SCREEN REFRESH 3S</span>
            <div className="screenTitleRow">
              <h1 className="screenTitle">活动实时数据大屏</h1>
              <Image
                className="screenLogo"
                src="/image/source/screen/logo-icon.png"
                alt=""
                width={79}
                height={79}
                priority
              />
            </div>
            <p className="screenParticipantCount">
              <strong>{loading || !ranking ? "—" : ranking.players.length || 0}</strong>
              <span>人参与</span>
            </p>
          </div>

          <div className="screenQrBlock">
            <div className="screenQrFrame">
              <Image
                className="screenQrImage"
                src="/image/source/screen/qr-code.png"
                alt="微信扫码参加游戏"
                width={136}
                height={136}
                priority
              />
            </div>
            <p>微信扫一扫参加游戏</p>
          </div>
        </header>

        {loading || !ranking ? (
          <div className="screenLoading">
            <div className="loadingSpinner">
              <div className="spinner"></div>
              <p>加载中...</p>
            </div>
          </div>
        ) : (
          <section className="screenGrid">
            <section className="screenPanel top10Panel">
              <div className="screenPanelHeader">
                <h2>总排行榜</h2>
                <Image
                  className="screenTop10Watermark"
                  src="/image/source/ranking/top10-watermark.png"
                  alt=""
                  width={163}
                  height={40}
                  aria-hidden="true"
                />
              </div>
              <RankingTable data={ranking.top10 || []} variant="ranking" />
            </section>

            <div className="screenSideColumn">
              <section className="screenPanel">
                <h2>地区平均分排行榜</h2>
                <OfficeAverageTable data={ranking.officeAverage || []} variant="ranking" />
              </section>

              <section className="screenPanel">
                <h2>各地区TOP3</h2>
                <OfficeTop3Panel data={ranking.officeTop3 || []} variant="ranking" />
              </section>
            </div>
          </section>
        )}
        </div>
      </div>
    </main>
  );
}
