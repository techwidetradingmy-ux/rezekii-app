# Social posting (Facebook Page, Instagram, Threads) — flow list (approved by the owner, 19 Oct 2026)

Definition of done for adding Meta channels to Posts, built as design C (live preview). Each line becomes an automated test and a step on the owner's sign-off checklist. Format: **ID — Flow** → expected result. All times are Malaysia time.

Scope: Facebook Pages, Instagram (Business or Creator), Threads. Not Facebook Groups (Meta closed it in 2024). TikTok posting keeps working exactly as today.

## Who can use it

- **W1 — While the Meta app is in Development mode** → only accounts with a role on the Meta app can connect (Techwide's own). The new channels show for Admins only; creators see Posts as today.
- **W2 — After Meta approves the app** → the owner decides when creators get it (a separate change).

## Connecting channels

- **K1 — Connect Facebook** (Posts → Channels → Connect Facebook) → Facebook's own sign-in opens; you tick which Pages; back in Rezekii each chosen Page shows with its name and photo as Connected.
- **K2 — The Facebook account manages no Pages** → "This Facebook account doesn't manage any Pages", nothing saved.
- **K3 — Connect Instagram** → Instagram's own sign-in; the account shows with @username and photo.
- **K4 — Instagram account is personal** → "Switch to a Business or Creator account in Instagram, then connect again", nothing saved.
- **K5 — Connect Threads** → Threads sign-in; shows @username and photo.
- **K6 — Cancel on any sign-in page** → back in Rezekii with "Not connected", nothing saved.
- **K7 — Same account connected twice** → no duplicate; the existing one is refreshed.
- **K8 — Disconnect a channel** → it leaves the list and the composer; its scheduled posts are cancelled with "Channel disconnected"; posted history stays.
- **K9 — Meta withdraws or expires access** → the channel shows "Reconnect"; its scheduled posts fail with that reason; Reconnect restores it.
- **K10 — Tokens** → stored encrypted, renewed before they expire (Instagram and Threads every 60 days), never sent to the browser.

## Composing (design C)

- **C1 — Channel chips** → every connected channel (TikTok + Meta) is a chip to switch on or off; channels not connected show "+ Name" and open the Channels sheet.
- **C2 — One caption, a count per channel** → live counts: TikTok 2,200 · Facebook 63,206 · Instagram 2,200 · Threads 500, where an emoji counts as 2–4 (the product link counts where it's added).
- **C2b — Hashtags** → a warning above 5 hashtags for Instagram and TikTok (their in-app caps since 2025); for Threads, a note that only the first hashtag becomes the post's topic.
- **C3 — Caption over a channel's limit** → that channel's count turns red and Schedule is blocked with "Threads allows 500 characters" (etc.) until it fits or the channel is switched off.
- **C3b — A version per channel** → you write one main caption; each channel gets its own tab with Rezekii's version of it, written for how that channel is used:
  - TikTok: short and clear, no link: the opening sentence, "Produk dekat beg kuning." (the product sits in the yellow basket), and at most 5 hashtags.
  - Instagram: no link (the link sentence becomes "Link dekat bio."), at most 5 hashtags.
  - Threads: the link goes in the first comment (the sentence becomes "Link produk ada dalam komen."), one hashtag as the topic.
  - Facebook: the link in the caption and in the first comment.
- **C3c — Edit a channel's version** → typing in a channel's tab keeps that version; "Use Rezekii's version" brings back the automatic one; later edits to the main caption don't overwrite an edited version.
- **C4 — Product link** → one link for the post; each channel's tab sets where it goes (caption, first comment, both or neither), starting from the defaults above. TikTok can't take it (links in captions can't be tapped and apps can't comment), so its switches are off.
- **C4b — First comment** → optional, per channel, for Facebook, Instagram and Threads, prefilled with the link where that channel's default puts it ("Dapatkan di sini: …" on Facebook, "Link produk 👇 …" on Threads). Limits: Threads 500, Instagram 2,200, Facebook 8,000 characters (re-checked during the build). The preview shows it (Threads as your own reply under the post, Facebook Feed under the post) and notes that links in Instagram comments can't be tapped.
- **C5 — Live preview** → a phone preview per selected channel, switchable by tabs, updating as you type, laid out like the October 2026 apps (TikTok For You, Instagram Reels, Facebook Reels and Feed, Threads feed in light and dark), with each app's caption cut-off; notes under the phone where a channel differs (Instagram and Facebook Reels: link can't be tapped; Threads: over 500 characters).
- **C6 — Facebook product-link reminder** (on by default when Facebook is picked) → the Facebook post gets "Add product link" in My posts until you tick Done.
- **C7 — Video** → same upload (≤ 50 MB) or link as today. Checked per channel at scheduling: Threads ≤ 5 min; Instagram Reels within Meta's current limits; Facebook vertical videos of 3–90 s go out as a Reel (Facebook's Reels API), others as a Page video (all limits re-checked against Meta's current docs during the build); a channel that can't take it is blocked with the reason.
- **C8 — When** → Post now / recommended time / pick a time / save as draft, as today; one time for all chosen channels.
- **C9 — Schedule** → TikTok gets its normal post (unchanged); each Meta channel gets its own scheduled post; the done screen lists every channel and its time.

## Publishing (background)

- **P1 — Facebook Page** → at the time, the video is posted to the Page with the caption and link; marked Posted with a link to the post.
- **P2 — Instagram** → the Reel is created from the video, Rezekii waits for Instagram to finish processing, then publishes; Posted with a link.
- **P3 — Threads** → the post is created and published; Posted with a link.
- **P4 — A channel returns an error** → up to 3 tries over ~30 minutes (5 and 25 min, same as TikTok), then Failed with that channel's reason; other channels unaffected.
- **P5 — Never posts twice** → before a retry Rezekii checks whether the earlier try already went out.
- **P6 — Daily caps** → Instagram 100, Threads 250 and Facebook Reels 30 posts per 24 hours: refused at scheduling when a day is full.
- **P7 — Video file** → kept until every channel of that post has finished, then deleted from storage.
- **P8 — Facebook link limit** → Facebook is testing a cap of 2 posts with links a month for Pages without Meta One; the composer says so when a Facebook post has a link, and the first real test post confirms what happens to Techwide's Page.
- **P9 — First comment** → once a channel's post is published, its first comment goes out within about a minute (Facebook as the Page, Instagram from the account, Threads as a reply to the post). If the comment fails, the post stays Posted and the comment shows Failed with the reason and a Retry; a comment is never posted twice.

## My posts

- **M1 — List** → one row per post with a chip per channel showing its own status (Scheduled / Posting / Posted / Failed / Cancelled); Posted chips open the live post.
- **M2 — Cancel** → cancel one channel or all, until that channel starts posting.
- **M3 — Week view** → the post shows once with its channel icons.

## Quality bars

- **Q1 — Speed** → composer and preview respond instantly while typing; scheduling responds within ~1 s.
- **Q2 — Phone and dark mode** → usable at phone width and readable in light and dark mode.
- **Q3 — rezekii.com untouched** → built on the `social` branch and tested on the test copy (test database); nothing goes to rezekii.com until the TikTok Shop listing review is done and the owner says go.
- **Q4 — Real-run proof** → one real post to each of Techwide's own Facebook Page, Instagram and Threads from the test copy, with a screenshot of each next to its preview.

## Extra Meta permissions this needs

First comments need one more permission per channel, each part of Meta's review: `pages_manage_engagement` (Facebook), `instagram_business_manage_comments` (Instagram) and `threads_manage_replies` (Threads). Added to the Meta app on 19 Oct 2026.

## Owner setup needed before testing

1. The test copy needs its own settings in Vercel (Preview): the test database's URL and secret key, a separate token encryption key, admin emails, and the Meta app ID and secrets. The owner pastes the secret values; Claude gives the exact names.
2. Add the test copy's address to the Meta app's login return addresses (Claude does this).
3. Add Techwide's Instagram and Threads accounts as testers on the Meta app and accept the invites in each app.
