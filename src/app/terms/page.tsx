import type { Metadata } from "next";
import { COMPANY, COMPANY_NO, SUPPORT_EMAIL, SiteFooter, SiteNav } from "../site";

export const metadata: Metadata = { title: "Terms of Service · Rezekii", description: "The terms for using Rezekii." };

export default function Terms() {
  return (
    <>
      <SiteNav variant="plain" />
      <main className="legal">
        <h1>Terms of Service</h1>
        <p className="updated">Last updated 11 October 2026</p>
        <p>These terms are an agreement between you and {COMPANY} ({COMPANY_NO}), which runs Rezekii at rezekii.com. By using Rezekii you agree to them.</p>

        <h2>1. Who can use Rezekii</h2>
        <p>You must be 18 or older, have a TikTok account in good standing, and follow TikTok&apos;s own terms and Community Guidelines.</p>

        <h2>2. Your account</h2>
        <p>Keep your sign-in secure and your details accurate. You are responsible for what happens under your account. Tell us at {SUPPORT_EMAIL} if you think someone else has used it.</p>

        <h2>3. Posting to TikTok</h2>
        <ul>
          <li>You choose what to post, when, and with which settings. Rezekii sends your content to TikTok only after you confirm.</li>
          <li>You must own, or have permission to use, everything in your posts, including music, images and people shown.</li>
          <li>You agree to TikTok&apos;s Music Usage Confirmation, and to TikTok&apos;s Branded Content Policy when you mark a post as branded content.</li>
          <li>TikTok processes posts after they are sent, which can take a few minutes. TikTok may limit how many posts an account can make each day, or may remove content under its own rules.</li>
          <li>We never add watermarks, logos or text to your content.</li>
        </ul>

        <h2>4. Creator levels, commission and samples</h2>
        <ul>
          <li>Rezekii creator levels (Bronze, Silver, Gold) and their benefits are set by Techwide and may change. We will show the current rules in Rezekii.</li>
          <li>Commission is paid by TikTok Shop under TikTok Shop&apos;s terms, not by Rezekii. Figures shown in Rezekii come from TikTok and may differ from TikTok&apos;s final settlement.</li>
          <li>Free samples depend on the seller&apos;s stock and approval. When you receive a sample, you agree to post content for that product as agreed in the campaign.</li>
        </ul>

        <h2>5. What you must not do</h2>
        <ul>
          <li>Post content you copied from other creators or platforms without permission.</li>
          <li>Make false or misleading claims about products, including medical claims.</li>
          <li>Post anything unlawful, harmful or against TikTok&apos;s rules.</li>
          <li>Misuse Rezekii, for example by trying to get around limits, accessing other people&apos;s accounts, or overloading the service.</li>
        </ul>

        <h2>6. The service</h2>
        <p>We work to keep Rezekii available and accurate, but it is provided as it is. Rezekii depends on TikTok&apos;s services, which can change or stop working. We may add, change or remove features.</p>

        <h2>7. Suspension and closing your account</h2>
        <p>You can delete your account at any time in Settings. We may suspend or close an account that breaks these terms or TikTok&apos;s rules, and we will tell you why unless the law prevents it.</p>

        <h2>8. Liability</h2>
        <p>To the extent the law allows, Techwide is not liable for indirect losses, lost earnings or lost content, or for actions taken by TikTok. Nothing in these terms limits rights you have under Malaysian consumer law.</p>

        <h2>9. Governing law</h2>
        <p>These terms are governed by the laws of Malaysia, and disputes go to the courts of Malaysia.</p>

        <h2>10. Changes and contact</h2>
        <p>If we change these terms, we will update the date above and tell you in Rezekii before the change applies. Questions: <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>, {COMPANY} ({COMPANY_NO}).</p>
      </main>
      <SiteFooter />
    </>
  );
}
