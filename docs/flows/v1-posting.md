# v1 — Posting & scheduling: flow list (DRAFT for owner approval)

This is the definition of done for v1. Each line becomes an automated test and a step on the owner's sign-off checklist. v1 is frozen only when every line passes — with **private** posts, since TikTok keeps posts private until it approves the app. Words follow `CONTEXT.md`. All times are Malaysia time.

Format: **ID — Flow** → expected result.

## Sign-in and access

- **S1 — An Admin signs in with Google** (Gmail on the admin list) → lands on Today.
- **S2 — Someone not on the admin list signs in** → sees "Version 1 is for the Techwide team", gets no access, nothing is created for them.
- **S3 — Sign out, then open any page** → sent to the sign-in page.
- **S4 — Add an admin in Settings** → that Gmail can sign in; Activity Log records who added them.
- **S5 — Try to remove the last remaining admin** → refused with "The last admin can't be removed".

## Accounts

- **A1 — Connect a Techwide TikTok account** → TikTok asks for profile + posting permission; the account appears in Accounts as TikTok: connected; Activity Log entry.
- **A2 — The same account is connected twice** → no duplicate; the existing one is refreshed.
- **A3 — TikTok withdraws an account's posting permission** → the account shows "Reconnect needed", its Scheduled Posts become Paused Posts, Today lists it under "Needs your attention".
- **A4 — Reconnect it** → Paused Posts whose time hasn't passed resume on their times; ones whose time passed wait on Today for rescheduling.
- **A5 — Remove a Techwide account** → its Scheduled Posts are cancelled; its Video Stats and history stay.

## Composing a single post

- **C1 — Video upload ≤ 50 MB, privacy chosen, "Use recommended time"** → becomes a Scheduled Post at the account's next free recommended time; shows on the Calendar and Today.
- **C2 — Same, with "Pick a time"** → scheduled at exactly that Malaysia time.
- **C3 — No privacy chosen** → Schedule stays disabled with "Choose who can view this video to continue".
- **C4 — Upload over 50 MB** → refused with "Over 50 MB — paste a link instead".
- **C5 — Video longer than the account's TikTok maximum** → refused at scheduling with the account's limit shown.
- **C6 — Caption over 2,200 characters** → cannot be typed past 2,200; the live count shows it.
- **C7 — Branded content + "Only me"** → blocked with "Branded content can't be private".
- **C8 — "Promotes a brand" ticked but neither option chosen** → blocked until one is chosen or the box is unticked.
- **C9 — TikTok says the account can't post right now** → Rezekii stops and says to try later; nothing is scheduled.
- **C10 — Comments / duet / stitch** → all start unticked; any the creator disabled in TikTok are greyed out; photo posts show only "Allow comments".
- **C11 — AI label** → unticked by default, can be ticked; the setting is sent with the post.
- **C12 — Consent line** → "By posting, you agree to TikTok's Music Usage Confirmation" is shown before Schedule; with branded content it also names the Branded Content Policy.
- **C13 — Cover frame** → the chosen moment is used as the cover; untouched = first frame.
- **C14 — Post to two accounts** → two independent Scheduled Posts, each with its own time and privacy; changing or failing one never affects the other.

## Links as video source

- **L1 — Direct file link, Google Drive ("Anyone with the link") or Dropbox** → checked when scheduling (reachable, a video, within limits) and accepted.
- **L2 — Google Drive file not shared publicly** → refused with "Share it as 'Anyone with the link'".
- **L3 — Dead or non-video link** → refused at scheduling with the reason.
- **L4 — Link stops working before the post time** → normal retry path, then a Failed Post with "Video link no longer works".

## Bulk scheduling

- **B1 — Load 5 videos, choose privacy once, mix "recommended" and "pick time"** → each becomes a Scheduled Post; recommended ones fill the next free recommended times in the order added, skipping taken times.
- **B2 — No batch privacy chosen** → "Schedule" stays disabled.
- **B3 — A day would exceed 15 posts for the account** → recommended placement skips to the next day; picked times on a full day are refused.

## Daily limit

- **D1 — An account reaches 12 Scheduled Posts in one day** → warning shown.
- **D2 — Trying to add a 16th post on one day** (compose, bulk or drag) → refused with TikTok's daily limit explained.

## Calendar and editing

- **E1 — Week view** → shows only the visible week; colour per account; filter by account works.
- **E2 — List view** → shows upcoming posts in time order.
- **E3 — Drag a post to another time** → rescheduled; daily limit still checked; Activity Log entry.
- **E4 — Edit or cancel before publishing starts** → saved / cancelled; Activity Log entry.
- **E5 — Try to edit once publishing has started, or a Published Post** → not allowed, with the reason.
- **E6 — Two Admins change the same Scheduled Post at the same moment** → the second change is refused with who changed it first; nothing is lost silently.

## Drafts

- **R1 — Save as draft (no time)** → appears in Drafts; never publishes on its own.
- **R2 — Schedule a draft** → becomes a Scheduled Post and leaves Drafts.
- **R3 — Delete a draft** → removed; uploaded file deleted.

## Publishing (background)

- **P1 — A Scheduled Post's time arrives** → Rezekii re-checks the account with TikTok, sends it, and on TikTok's confirmation marks it Published within ~2 minutes of its time.
- **P2 — After TikTok confirms** → the uploaded file is deleted from storage.
- **P3 — TikTok returns an error** → before each retry Rezekii asks TikTok about the earlier attempt; up to 3 retries over ~30 minutes; then a Failed Post on Today with TikTok's reason; other posts unaffected.
- **P4 — Connection drops right after sending** → Rezekii checks with TikTok and never sends a second copy.
- **P5 — TikTok never confirms within ~30 minutes** → Unconfirmed Post ("Check TikTok") on Today; never retried automatically.
- **P6 — "It's on TikTok"** → marked Published. **"Not there — reschedule"** → opens it to pick a new time.
- **P7 — Before TikTok approves the app** → posts go out as private only; the composer explains this.
- **P8 — Photo carousel** → photos are served from rezekii.com (verified with TikTok) and posted.

## Recommended Posting Times

- **T1 — Admin edits the set in Settings** → new "use recommended time" placements use the new set; posts already scheduled keep their times.

## Video Stats

- **V1 — Daily refresh** → views, likes, comments, shares for every public video on each connected account, whichever tool posted it.
- **V2 — 7 / 30 / 90-day views** → growth and daily chart from saved daily history; history older than 90 days is trimmed.
- **V3 — A video Rezekii published** → linked to its post ("Posted via Rezekii").
- **V4 — A video deleted on TikTok** → stops updating; its past history stays.

## Activity Log, health, safety

- **G1 — Activity Log** → records schedule, cancel, reschedule, connect/disconnect, admin add/remove with who and when; entries older than 90 days are removed.
- **G2 — System Health** → shows last run of each background job, TikTok connection problems, last backup, recent errors.
- **G3 — A crash in the live site** → recorded in Sentry with details.
- **G4 — Nightly backup** → runs every night, 30 days kept; the restore procedure is test-run once before v1 is frozen.
- **G5 — TikTok tokens** → refreshed automatically before they expire; never visible in the browser.

## Quality bars

- **Q1 — Speed** → every page shows its main content within ~2 s on Malaysian 4G phone data; schedule/save responds within ~1 s.
- **Q2 — Phone and dark mode** → every screen usable at phone width and readable in light and dark mode.
- **Q3 — Time zone** → every time shown and typed is Malaysia time, whatever the device's time zone.
- **Q4 — Test gate** → all automated tests pass on GitHub before anything deploys to rezekii.com.
