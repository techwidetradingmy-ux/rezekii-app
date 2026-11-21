import Image from "next/image";
import Link from "next/link";
import "./legal.css";

/** Who runs Rezekii, as the Privacy Policy and Terms of Service name it (the same pages as on rezekii.com since 11 Oct 2026). */
export const COMPANY = "Techwide Marketing Sdn Bhd";
export const COMPANY_NO = "202001017785";
export const SUPPORT_EMAIL = "support@rezekii.com";

/** The plain top bar of a legal page: the logo, back to the home page. */
export function LegalNav() {
  return (
    <header className="legal-nav">
      <Link href="/" className="legal-brand">
        <Image src="/master-logo-transparent.png" alt="" width={28} height={28} />
        <b>Rezekii</b>
      </Link>
    </header>
  );
}

/** The footer of a legal page, with both policies and the support email. */
export function LegalFooter() {
  return (
    <footer className="legal-foot">
      <span>© 2026 {COMPANY} ({COMPANY_NO})</span>
      <Link href="/privacy">Privacy Policy</Link>
      <Link href="/terms">Terms of Service</Link>
      <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
    </footer>
  );
}
