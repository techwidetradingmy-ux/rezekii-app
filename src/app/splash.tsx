import Image from "next/image";

/** Green brand screen shared by the coming-soon and connected pages. */
export function Splash({ children }: { children: React.ReactNode }) {
  return (
    <main className="rz-splash">
      <div className="rz-logo">
        <Image src="/master-logo-transparent.png" alt="Rezekii" width={64} height={64} priority />
      </div>
      <p className="rz-name">Rezekii</p>
      <p className="rz-tag">CONNECTING AFFILIATES</p>
      <div className="rz-card">{children}</div>
      <p className="rz-foot">
        <a href="mailto:support@rezekii.com">support@rezekii.com</a>
      </p>
    </main>
  );
}
