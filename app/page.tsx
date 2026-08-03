const principles = [
  {
    index: "01",
    name: "本源",
    english: "ORIGIN",
    detail: "圆环象征初心与本源，提醒我们回归本质。",
  },
  {
    index: "02",
    name: "光",
    english: "LIGHT",
    detail: "光芒代表能量，也承载智慧与希望。",
  },
  {
    index: "03",
    name: "人",
    english: "HUMAN",
    detail: "坚持以人为本，让技术真正服务于人。",
  },
  {
    index: "04",
    name: "AI",
    english: "FUTURE",
    detail: "以科技向前的力量，持续创造未来。",
  },
];

export default function Home() {
  return (
    <main id="top">
      <header className="site-header">
        <a className="brand-lockup" href="#top" aria-label="Origyuan 原光初心首页">
          <img
            src="/brand-standard.png"
            alt=""
            aria-hidden="true"
            width="1254"
            height="1254"
          />
        </a>
        <div className="site-status">
          <span className="status-dot" aria-hidden="true" />
          ORIGYUAN.COM
        </div>
      </header>

      <section className="hero">
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-copy">
          <p className="eyebrow">上海原光初心科技有限公司</p>
          <h1>
            让人类回归本源，
            <span>用 AI 创造未来。</span>
          </h1>
          <p className="hero-intro">
            从人的真实需求出发，连接智慧、创造与未来。
            <br />
            原光初心，让技术的每一次向前都更有意义。
          </p>
          <a className="hero-link" href="#principles">
            认识原光初心 <span aria-hidden="true">↘</span>
          </a>
        </div>

        <div className="origin-system" aria-hidden="true">
          <div className="origin-halo halo-one" />
          <div className="origin-halo halo-two" />
          <div className="origin-halo halo-three" />
          <div className="origin-center">
            <span>人</span>
            <small>HUMAN</small>
          </div>
          <span className="system-node node-origin">ORIGIN</span>
          <span className="system-node node-light">LIGHT</span>
          <span className="system-node node-future">FUTURE</span>
        </div>
      </section>

      <section className="principles" id="principles">
        <div className="section-heading">
          <p>OUR FOUNDATION</p>
          <h2>从本源出发，向未来生长。</h2>
        </div>

        <div className="principle-grid">
          {principles.map((principle) => (
            <article className="principle-card" key={principle.index}>
              <span className="principle-index">{principle.index}</span>
              <div className="principle-title">
                <h3>{principle.name}</h3>
                <span>{principle.english}</span>
              </div>
              <p>{principle.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="manifesto">
        <p className="manifesto-label">ORIGYUAN · 原光初心</p>
        <p className="manifesto-copy">
          技术不应让人离本源更远。
          <br />
          它应该照亮方向，释放创造力，
          <br />
          让每个人更接近真正重要的事。
        </p>
      </section>

      <footer>
        <p>© 2026 上海原光初心科技有限公司</p>
        <p>让人类回归本源，用 AI 创造未来！</p>
      </footer>
    </main>
  );
}
