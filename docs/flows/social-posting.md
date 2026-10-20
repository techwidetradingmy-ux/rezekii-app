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

- **C1 — Picking channels** → by brand, by Same as last post or one by one: see "Picking channels by brand" (B1–B9). The Channels sheet lists every channel grouped by app, with a search when there are many Pages.
- **C2 — One caption, a count per channel** → live counts: TikTok 2,200 · Facebook 63,206 · Instagram 2,200 · Threads 500, where an emoji counts as 2–4 (the product link counts where it's added).
- **C2b — Hashtags** → a warning above 5 hashtags for Instagram and TikTok (their in-app caps since 2025); for Threads, a note that only the first hashtag becomes the post's topic.
- **C3 — Caption over a channel's limit** → that channel's count turns red and Schedule is blocked with "Threads allows 500 characters" (etc.) until it fits or the channel is switched off.
- **C3b — A version per app** → you write one main caption; each app gets its own tab with Rezekii's version of it, written for how that app is used (every Page or account of that app gets the same version):
  - TikTok: short and clear, no link: the opening sentence, "Produk dekat beg kuning." (the product sits in the yellow basket), and at most 5 hashtags.
  - Instagram: no link (the link sentence becomes "Link dekat bio."), at most 5 hashtags.
  - Threads: the link goes in the first comment (the sentence becomes "Link produk ada dalam komen."), no hashtags in the text: the first hashtag becomes the post's topic (C3d).
  - Facebook: the link in the caption and in the first comment.
- **C3c — Edit a channel's version** → typing in a channel's tab keeps that version; "Use Rezekii's version" brings back the automatic one; later edits to the main caption don't overwrite an edited version.
- **C3e — Links and calls to action** → Facebook keeps a link where it was typed (and doesn't add it twice); on TikTok, Instagram and Threads a link goes together with its call to action and emoji (no dangling 👉🏻).
- **C3f — Hashtags** → hashtags typed in the caption stay where they were typed; the Hashtags box adds its tags at the very bottom (Facebook's link goes above them). Up to 5 on TikTok and Instagram, all on Facebook, none on Threads (they can't be tapped there).
- **C3g — Writing guide** → a short guide in Main explains how each part is used on each app.
- **C3d — Threads topic** → Main has a Threads topic box (recommended), filled from the first hashtag and editable; it goes out as Threads' own topic (like Add topic in the app: one per post, 1–50 characters, no periods or &) and shows next to the name in the preview.
- **C4 — Product link** → one link for the post; each channel's tab sets where it goes (caption, first comment, both or neither), starting from the defaults above. TikTok can't take it (links in captions can't be tapped and apps can't comment), so its switches are off.
- **C4c — Call to action before the link** → the Product link card has a call to action first, then the link (not pre-filled; the hint shows "e.g. Dapatkan di sini 👉") that goes in front of the link wherever Rezekii adds it (Facebook caption, first comments).
- **C4b — First comment** → Main has a First comment box for Facebook, Instagram and Threads; each app's comment is that text with the product link after it where that app puts the link in the comment (without your own text, Rezekii's line with the link); still editable per app. Defaults ("Dapatkan di sini: …" on Facebook, "Link produk 👇 …" on Threads). Limits: Threads 500, Instagram 2,200, Facebook 8,000 characters (re-checked during the build). The preview shows it (Threads as your own reply under the post, Facebook Feed under the post) and notes that links in Instagram comments can't be tapped.
- **C4d — Image in the first comment** → under First comment on Main, one optional JPG or PNG (up to 8 MB). It goes under the first comment on Facebook (not on drafts) and as the image of the Threads reply; Instagram comments are text only, so Instagram gets the text alone. The preview shows it under the comment. With an image, a first comment goes out even without text.
- **C5 — Live preview** → a phone preview per selected app, switchable by tabs (when several Pages or accounts of one app are picked, a "Showing" picker chooses which one the preview uses), updating as you type, laid out like the October 2026 apps (TikTok For You, Instagram Reels, Facebook Reels and Feed, Threads feed in light and dark), with each app's caption cut-off; @mentions are highlighted the way each app shows them; tapping "more" / "See more" expands the caption, and the comment button on Instagram and Facebook Reels opens the comments with the first comment; the Facebook Feed and Threads previews scroll inside the phone, so a long post doesn't hide the first comment; notes under the phone where a channel differs (Instagram and Facebook Reels: link can't be tapped; Threads: over 500 characters).
- **C5b — Sound in the preview** → the preview video starts muted; the speaker button on the video turns the sound on and off.
- **C6 — Facebook product-link reminder** (on by default when Facebook is picked) → the Facebook post gets "Add product link" in My posts until you tick Done.
- **C7b — Upload progress** → while the video uploads, the button shows how far it is ("Uploading your video… 45%").
- **C7 — Video** → same upload (≤ 50 MB) or link as today. Checked per channel at scheduling: Threads ≤ 5 min; Instagram Reels within Meta's current limits; Facebook vertical videos of 3–90 s go out as a Reel (Facebook's Reels API), others as a Page video (all limits re-checked against Meta's current docs during the build); a channel that can't take it is blocked with the reason.
- **C8 — When** → Post now / recommended time / pick a time / save as draft, as today; one time for all chosen channels.
- **C9 — Schedule** → TikTok gets its normal post (unchanged); each Meta channel gets its own scheduled post; the done screen lists every channel and its time.

## Post settings (owner approved, 20 Oct 2026)

Instagram's collaborators, tag people and trial reel sit under a folded "Advanced" section (owner, 21 Oct 2026); its title says how many are in use.

Meta doesn't offer private ("Only me") posts to apps for Facebook, Instagram or Threads; New post says so.

- **S1 — Facebook: Publish or Save as draft in Facebook** → a draft Reel goes to the Page's drafts (Facebook / Meta Business Suite) and nobody sees it until it's published there; drafts get no first comment and work for Reels (3–90 s) only; All channels shows "Draft in Facebook".
- **S2 — Instagram: Also show in the main feed** (on by default) → off: the Reel shows in the Reels tab only.
- **S3 — Instagram: Collaborators** → up to 3 usernames; anything that isn't a username is refused with the reason. They get an invite in Instagram.
- **S4 — Instagram: Trial reel** → off, "I'll share with followers" (manual) or "Instagram decides" (shared with followers if it does well); shown to non-followers first.
- **S6 — Instagram: Tag people** → up to 20 usernames; they get a notification and the Reel shows in their Tagged tab. An account Instagram can't reach (private or a wrong name) is left out and the Reel still goes out; All channels says so. Facebook and Threads don't let apps tag people in videos (Facebook's "is with Shopee" comes from its own Add product link).
- **S7 — Facebook: Mention Pages** → paste a Page link or Page ID; Rezekii shows its name. The mention goes where "@Page Name" or "@linkname" (like @ShopeeMY) was typed in the Facebook caption, in any case and as a whole word, otherwise at the end (above the hashtags). Shopee, Lazada and Pages mentioned before are mentioned just by typing them; removing one under Mention Pages keeps it plain text. Pages only: Facebook doesn't let apps mention people. Shopee, Lazada and Pages you mentioned before are quick picks (one tap, no ID; typing a name narrows them). For another Page you don't manage, Facebook won't give Rezekii its name: paste its Page ID and type the name yourself (Facebook shows the real name in the post). Needs Meta's Page Mentions feature (on for testing; part of Meta's review).
- **S5 — Threads: Who can reply** → everyone (default), accounts you follow, your followers, or only accounts you mention.

## Picking channels by brand (owner approved option C, 20 Oct 2026)

- **B1 — Nothing picked by default** → New post opens with no channel switched on; Schedule says "Pick at least one channel".
- **B2 — Create a brand** (Post to → Manage brands → + New brand) → a name and any channels from any app, ticked from a searchable list grouped by app; it shows as a chip with its pictures, channel count and apps. No name, no channel or a name already used → refused with the reason. Up to 50 brands.
- **B3 — Pick a brand** → all its connected channels switch on and show under Post to, grouped by app; tap it again → they switch off.
- **B4 — Combine and adjust** → several brands at once; tapping the search box lists every connected channel by app (typing narrows it) to tick or untick several; × takes one off; a brand with one of its channels taken off no longer shows as picked.
- **B5 — Edit or delete a brand** → rename it or change its channels; delete asks first and leaves the channels connected. A channel can be in more than one brand; a disconnected channel drops out of its brands.
- **B6 — One TikTok account per post** → picking a second TikTok account (by brand or search) replaces the first.
- **B7 — Same as last post** → picks the channels of the most recent post (its Meta channels and its TikTok account), leaving out any no longer connected.
- **B8 — All channels board** → filter by brand; each post shows one icon per app, with a count when it went to several Pages.
- **B9 — An app isn't connected** → "+ TikTok" (or Facebook, Instagram, Threads) in Post to goes straight to that app's sign-in.

## Publishing (background)

- **P1 — Facebook Page** → at the time, the video is posted to the Page with the caption and link; marked Posted with a link to the post.
- **P2 — Instagram** → the Reel is created from the video, Rezekii waits for Instagram to finish processing, then publishes; Posted with a link.
- **P3 — Threads** → the post is created and published; Posted with a link.
- **P4 — A channel returns an error** → up to 3 tries over ~30 minutes (5 and 25 min, same as TikTok), then Failed with that channel's reason; other channels unaffected.
- **P5 — Never posts twice** → before a retry Rezekii checks whether the earlier try already went out.
- **P6 — Daily caps** → Instagram 100, Threads 250 and Facebook Reels 30 posts per 24 hours: refused at scheduling when a day is full.
- **P7 — Video file** → kept until every channel of that post has finished (and none is waiting to be tried again after failing), then deleted from storage.
- **P8 — Facebook link limit** → Facebook is testing a cap of 2 posts with links a month for Pages without Meta One; the composer says so when a Facebook post has a link, and the first real test post confirms what happens to Techwide's Page.
- **P9 — First comment** → once a channel's post is published, its first comment goes out within about a minute (Facebook as the Page, Instagram from the account, Threads as a reply to the post). If the comment fails, the post stays Posted and the comment shows Failed with the reason and a Retry; a comment is never posted twice.
- **P11 — Accurate status** → the timer asks each app whether posts from the last 7 days still exist (every 10 minutes); a post deleted in the app shows "Removed" with "Deleted in Instagram after it was posted" (TikTok can't be checked this way).
- **P10 — Profile pictures** → refreshed by the timer every 2 days (Facebook's and Instagram's picture links expire after a few days); a missing picture shows the app's icon.

## My posts

- **M1 — List** → one row per post with a chip per channel showing its own status (Scheduled / Posting / Posted / Failed / Cancelled); Posted chips open the live post.
- **M2 — Cancel** → cancel one channel or all, until that channel starts posting.
- **M4 — Try again** → a failed channel has Try again: it goes back on the timer straight away with fresh tries. Its video is kept while a channel has failed, and let go once it's retried successfully or cancelled.
- **M5 — Live** → while a post is posting or due within 30 minutes, All channels updates itself every 8 seconds ("Updating live"), and again when you come back to the tab; no refresh needed.
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
