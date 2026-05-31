export default function Home() {
  return (
    <main className="landingPage">
      <section className="landingHero">
        <div className="heroMark">AM</div>
        <span className="eyebrow">ANNUAL GAME DEMO</span>
        <h1>
          Alpha Matrix
          <span>年会互动游戏系统</span>
        </h1>
        <p>手机端四关游戏、自动判分、防重复提交、实时排行榜、大屏和简易后台控制闭环演示。</p>
        <a className="primaryButton landingButton" href="/register">
          开始参与
        </a>
        <div className="landingLinks">
          <a href="/screen">大屏演示</a>
          <a href="/admin-control">后台控制</a>
          <a href="/ranking">排行榜</a>
        </div>
      </section>
    </main>
  );
}
