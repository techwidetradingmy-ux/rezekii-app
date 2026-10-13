import "./marketplace/marketplace.css";

/** Shown straight away when a signed-in page is opened, until its data is ready: the page outline in grey. */
export default function Loading() {
  return (
    <div className="nv nv-page">
      <main className="site-wrap app-main nv-main" aria-busy="true">
        <p role="status" className="nv-skel-label">Loading…</p>
        <div className="nv-skel nv-skel-title" />
        <div className="nv-skel nv-skel-sub" />
        <div className="nv-skel-row">
          {[0, 1, 2, 3].map((i) => <div key={i} className="nv-skel nv-skel-card" />)}
        </div>
        <div className="nv-skel nv-skel-block" />
        <div className="nv-skel nv-skel-block" />
      </main>
    </div>
  );
}
