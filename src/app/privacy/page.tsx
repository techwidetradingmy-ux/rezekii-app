import type { Metadata } from "next";
import { COMPANY, COMPANY_NO, SUPPORT_EMAIL, SiteFooter, SiteNav } from "../site";

export const metadata: Metadata = { title: "Privacy Policy · Rezekii", description: "How Rezekii collects, uses and protects your personal data." };

export default function Privacy() {
  return (
    <>
      <SiteNav variant="plain" staticPage />
      <main className="legal">
        <h1>Privacy Policy</h1>
        <p className="updated">Last updated 11 October 2026</p>
        <p>
          Rezekii (rezekii.com) is a service for TikTok creators run by {COMPANY} ({COMPANY_NO}), Malaysia (&quot;Techwide&quot;, &quot;we&quot;).
          This policy explains what personal data we collect, why, and the choices you have. It follows Malaysia&apos;s Personal Data Protection
          Act 2010.
        </p>

        <h2>1. What we collect</h2>
        <h3>When you sign in</h3>
        <ul>
          <li><strong>With TikTok:</strong> your TikTok open ID, display name and profile photo. If you allow it, also your profile link, bio, verified status, follower, following, like and video counts, and the list of your public videos.</li>
          <li><strong>With Google:</strong> your name, email address and profile photo.</li>
        </ul>
        <h3>When you post through Rezekii</h3>
        <ul>
          <li>The videos and photos you upload, your captions and hashtags, the time you choose, and your post settings (who can view, comments, Duet, Stitch, content disclosure).</li>
          <li>The status TikTok reports for each post (processing, posted or failed).</li>
        </ul>
        <h3>When you link TikTok Shop or promote campaign products</h3>
        <ul>
          <li>Your TikTok Shop creator profile, and the orders, sales and commission from your affiliate links and from Techwide&apos;s TikTok Shop campaigns, including which videos and LIVEs they came from.</li>
          <li>Your free sample requests and their delivery status.</li>
        </ul>
        <h3>Automatically</h3>
        <ul>
          <li>Basic technical data such as IP address, browser type and the pages you use, to keep the service secure and working.</li>
        </ul>

        <h2>2. How we use it</h2>
        <ul>
          <li>To sign you in and run your account.</li>
          <li>To post your content to your TikTok account, at the time and with the settings you choose, and to show you each post&apos;s status.</li>
          <li>To show you your results, such as views, orders and sales, for any date range.</li>
          <li>To run the creator levels (Bronze, Silver, Gold), set the commission on your campaign links, and manage samples.</li>
          <li>To answer your questions, keep the service secure, and meet our legal obligations.</li>
        </ul>
        <p>We do not sell your personal data, and we do not use your TikTok data for advertising.</p>

        <h2>3. Your TikTok data</h2>
        <p>
          We connect to TikTok only through TikTok&apos;s official tools and only with your permission. We post only content you choose, when you
          choose. We never add watermarks, logos or text to your content. You can remove Rezekii&apos;s access at any time in Rezekii&apos;s
          Settings, or in the TikTok app under Settings and privacy, Security, Manage app permissions.
        </p>

        <h2>4. Who we share it with</h2>
        <ul>
          <li><strong>TikTok,</strong> to carry out what you ask, such as publishing a post.</li>
          <li><strong>Service providers</strong> that host and run Rezekii for us (website hosting, database and file storage), under contracts that protect your data.</li>
          <li><strong>Techwide staff,</strong> only as needed to support you and run the creator programme.</li>
          <li><strong>Authorities,</strong> when the law requires it.</li>
        </ul>

        <h2>5. How we protect it</h2>
        <p>Access keys from TikTok and Google are stored encrypted. Only authorised Techwide staff can access account data, and only for the purposes above. Data is stored with our providers in Singapore.</p>

        <h2>6. How long we keep it</h2>
        <p>We keep your data while your account is open. If you delete your account in Settings, we remove your personal data within 30 days, except records we must keep by law, such as commission records. Uploaded videos are deleted from our storage 30 days after they are posted.</p>

        <h2>7. Your rights</h2>
        <p>You can ask to see, correct or delete your personal data, or withdraw your consent, by emailing {SUPPORT_EMAIL}. Withdrawing consent may mean we can no longer provide some features.</p>

        <h2>8. Age</h2>
        <p>Rezekii is for people aged 18 and over.</p>

        <h2>9. Changes to this policy</h2>
        <p>If we change this policy, we will update the date above and tell you in Rezekii before the change applies.</p>

        <h2>10. Contact</h2>
        <p>{COMPANY} ({COMPANY_NO}). Email: <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a></p>
      </main>
      <SiteFooter />
    </>
  );
}
