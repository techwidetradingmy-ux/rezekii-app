# Rezekii

Rezekii is Techwide's website for running TikTok affiliate work: posting to TikTok, turning product links into affiliate links, pulling product data, and a marketplace where invited creators pick products to promote. This file is the shared vocabulary only.

## Language

**User**:
A person who signs in to Rezekii with Google or with TikTok. Every User is either an Admin or a Creator; Admins always sign in with Google.
_Avoid_: Account, member, login

**Admin**:
A Techwide team member whose Gmail is on the admin allow-list. All Admins have equal access.
_Avoid_: Staff, owner, superuser

**Creator**:
A User who registered with Google or TikTok to use Rezekii's creator features (Marketplace, Link Conversion, Product Lookup, scheduling). A Creator can use them once at least one of their Creator Accounts is approved.
_Avoid_: Influencer, KOL, affiliate (as a person)

**Creator Account**:
One TikTok handle connected to Rezekii, such as @tinawellnesshacks. It can have an Affiliate Connection and a TikTok Connection.
_Avoid_: Account, posting account, affiliate account, shop

**Affiliate Connection**:
A Creator Account's permission, granted through the TikTok Shop creator login, that lets Rezekii make affiliate links and manage that handle's showcase. It also gives the handle and profile photo. Required for every Creator Account owned by a Creator.
_Avoid_: Shop connection, TikTok Shop account, TikTok Shop login (as a sign-in)

**TikTok Connection**:
A Creator Account's permission, granted through TikTok for Developers in one step, that lets Rezekii read that handle's followers, likes and videos and publish videos and photo carousels to it. Optional; needed only for scheduling and Video Stats. A Creator who signs in with TikTok gets it in the same step.
_Avoid_: Profile Connection, Posting Connection, Login Kit connection

**Waitlist**:
Creator Accounts waiting for an Affiliate Connection because TikTok's limit on connected accounts is full (25 until Rezekii passes TikTok's review). Techwide's own Creator Accounts count toward the limit.
_Avoid_: Queue, pending list

**Activity Log**:
A record, visible to Admins, of who did what and when: scheduling, cancelling and rescheduling posts, approving and rejecting Creator Accounts, adding and removing Admins, and connecting or disconnecting accounts. Kept for 90 days.
_Avoid_: Audit trail, history (alone)

**Shop**:
A seller's store on TikTok Shop. Never used for a creator's handle.
_Avoid_: Store page, showcase

**Draft**:
A post saved with its video or photos and caption but no time. It never publishes on its own until someone schedules it.
_Avoid_: Unscheduled post, TikTok draft (TikTok's inbox drafts are a different thing)

**Scheduled Post**:
A video or photo carousel queued to publish to one Creator Account at a set time.
_Avoid_: Queue item, job, upload

**Post Time**:
The time a Scheduled Post publishes. For each post the user either picks any time they like, or chooses a Recommended Posting Time. All times in Rezekii are Malaysia time (GMT+8).
_Avoid_: Slot, time slot

**Recommended Posting Times**:
One Rezekii-wide set of times of day that Rezekii suggests for posting, starting as 6AM, 12PM and 8PM and editable by Admins. When a user chooses them, Rezekii places the post into the account's next free recommended time automatically.
_Avoid_: Posting slots, account posting times, Buffer times

**Failed Post**:
A Scheduled Post that still did not publish after its automatic retries. It waits for someone who can act on its Creator Account (the owning Creator or any Admin) to reschedule it.
_Avoid_: Error, stuck post

**Unconfirmed Post**:
A Scheduled Post that was sent to TikTok but whose result TikTok has not confirmed after about 30 minutes. Rezekii never retries it automatically; a person checks TikTok and marks it published or reschedules it.
_Avoid_: Failed Post, pending post

**Published Post**:
A post TikTok has confirmed as live. Rezekii can no longer edit or delete it.
_Avoid_: Posted video, live post

**Video Stats**:
Views, likes, comments and shares of a public video on a Creator Account, refreshed daily, no matter which tool posted it (Rezekii, Buffer or the TikTok app). A daily copy is kept for 90 days to show growth.
_Avoid_: Post stats, analytics, insights

**Paused Post**:
A Scheduled Post on hold because its Creator Account lost its TikTok Connection. It resumes when the account reconnects; if its time passed meanwhile, it waits for the owning Creator or an Admin to reschedule.
_Avoid_: Failed Post, cancelled post

**Campaign**:
Reserved for the later campaign system (briefs, campaign types, deadlines, payouts). Not part of the current rebuild.
_Avoid_: Using it for TAP Campaigns

**TAP Campaign**:
A TikTok Shop partner campaign that Techwide runs through its partner account, where Shops add products at a commission for creators to promote.
_Avoid_: Campaign (unqualified), collection

**TAP Product**:
A product a Shop has added to one of Techwide's TAP Campaigns. Every approved Creator can see every TAP Product.
_Avoid_: Campaign product, sample (for the product itself)

**Product Lookup**:
Fetching a TikTok product's facts (name, main image, price, commission, units sold, stock, shop, rating) from TikTok's official API using its product link. The latest result replaces any older info for that product.
_Avoid_: Scraping, product capture

**Product Library**:
The local folder `products-library/` on Techwide's PC where product info and images are kept for AI video generation. Product Lookups are copied into it when someone runs the sync.
_Avoid_: Product database, product storage

**Marketplace**:
Rezekii's page where approved Creators browse TAP Products, sorted by best-selling or highest commission. It shows only TAP Products.
_Avoid_: Affiliate Center, product marketplace (TikTok's), open products

**Sample**:
A free unit of a product that a Creator receives to make content. A TAP Product may have Samples left or none.
_Avoid_: Using "sample" to mean the product listing

**Variant**:
One buyable option of a TAP Product, such as a size or flavour (TikTok calls it a SKU).
_Avoid_: SKU (in conversation), option, model

**Sample Quota**:
How many Samples of one Variant are still available. Set by the Shop when it registers the product in the TAP Campaign; a Variant with no registered quantity has no Samples.
_Avoid_: Stock, inventory, agency allowance

**Agency Sample Request**:
A Creator's request for a Sample of a TAP Product's Variant, made in TikTok and reviewed by Techwide in Partner Center. Approval uses up that Variant's Sample Quota. It is the only way to request a Sample through Rezekii.
_Avoid_: Rezekii application, offline sample, seller sample request

**Affiliate Link**:
A product link that credits the commission on a sale to one Creator Account. Made from an ordinary TikTok product link through that Creator Account's Affiliate Connection.
_Avoid_: Share link, referral link, short link

**Link Conversion**:
Turning any TikTok product link into an Affiliate Link for the Creator's own Creator Account, so they can share it outside TikTok without using the TikTok phone app. It never involves TAP Campaigns.
_Avoid_: TAP link, campaign link

**Add to Showcase**:
Placing a TAP Product from the TAP marketplace into a Creator Account's TikTok showcase, attached to Techwide's TAP Campaign so its sales are marked as coming through the agency.
_Avoid_: Join campaign, claim product, TAP link

**Link Tag**:
A label added when making Affiliate Links so each platform gets its own link, such as threads or whatsapp.
_Avoid_: Sub-ID, UTM, channel

## Relationships

- Any **Admin** can add or remove Admins by Gmail address; the last remaining Admin can't be removed.

- A **Creator Account** has at most one **Affiliate Connection** and one **TikTok Connection**, and both must be the same TikTok handle; Rezekii refuses a mismatch.
- A **Creator** who signs in with TikTok gets that handle's **Creator Account** and **TikTok Connection** in the same step.
- A **Creator** can own many **Creator Accounts**. Each one is approved by an **Admin** separately, and only after it has an **Affiliate Connection**; the **TikTok Connection** is only needed for scheduling and **Video Stats**.
- Linking TikTok Shop is never a way to sign in: TikTok's limit on connected accounts would stop new Creators from even joining the **Waitlist**.
- **Creator Accounts** owned by Techwide are connected by **Admins**, need no approval, and only need the connections they actually use (e.g. just a Posting Connection).
- Ownership of a **Creator Account** never changes after it is connected.
- When a **Creator** deletes their Rezekii account, everything about them is deleted: all connections are dropped (freeing **Waitlist** slots), their **Scheduled Posts** are cancelled, and their link history, **Video Stats** and profile are removed. In the **Activity Log** their name is replaced with "deleted creator".
- Removing a single **Creator Account**: if a Creator owns it, its queue, link history and **Video Stats** are deleted; if Techwide owns it, its queue is cancelled but its link history and Video Stats are kept as business records.
- Rejecting a **Creator Account** drops its connections (freeing a slot for the **Waitlist**) and shows the **Creator** the reason; they may re-apply later.
- A **Creator Account** is owned either by Techwide or by exactly one **Creator**.
- A **Creator** sees only the Creator Accounts they own; **Admins** see and can act on every Creator Account.
- A **Shop** is never a **Creator Account**.
- A **Failed Post** never moves any other **Scheduled Post**; the rest of the queue keeps its times.
- A post moves **Draft** → **Scheduled Post** → **Published Post**; a Scheduled Post can instead become a **Failed Post**, **Paused Post** or **Unconfirmed Post**. It can be edited or cancelled until publishing starts.
- If two people change the same Scheduled Post at nearly the same moment (edit caption, change time, cancel), the second change is refused and told who changed it first; nothing is overwritten silently.
- A **Scheduled Post** is published at most once: before any retry Rezekii asks TikTok about the earlier attempt and retries only if TikTok confirms it failed; if TikTok never confirms, it becomes an **Unconfirmed Post**.
- Sending one post to several **Creator Accounts** creates a separate **Scheduled Post** for each account, with its own **Post Time** and privacy; each is edited, published or failed on its own.
- A **Creator Account** can't have more than 15 **Scheduled Posts** in one Malaysia-time day (TikTok's daily limit); Rezekii warns from 12.
- In bulk scheduling each video gets either a **Post Time** the user picks or the **Recommended Posting Times**; recommended ones are placed into the account's next free recommended time, in the order the videos were added, rolling into later days.
- **Video Stats** cover every public video of a **Creator Account** (read through its **TikTok Connection**); a video that Rezekii published is linked to its **Published Post**.
- When a **Creator Account** loses its **TikTok Connection**, all its Scheduled Posts become **Paused Posts** and the account is flagged for reconnecting.
- Every **Affiliate Link** made by **Link Conversion** is kept in the history of its **Creator Account**, visible to its owner and to **Admins**.
- Admins and Creators can both run a **Product Lookup**, each through a Creator Account they can act on; only lookups made by **Admins** are synced to the **Product Library**.
- **Link Conversion** and **Add to Showcase** are separate: converting any link (even a TAP Product's) gives the Creator's own **Affiliate Link**; only **Add to Showcase** attaches a product to the **TAP Campaign**.
- An **Agency Sample Request** happens in TikTok; Rezekii sends the Creator there and shows the status, but never approves.
- A **TAP Product** has one or more **Variants**; only Variants with a **Sample Quota** can be sampled.

## Flagged ambiguities

- "Account" was used for Users, Creator Accounts, the Affiliate Connection and Techwide's partner login — resolved: each now has its own term.
- "Shop connection" was read as a seller store — resolved: the creator side of TikTok Shop is the **Affiliate Connection**.
- A "TAP link" from the link converter was briefly assumed — resolved: the converter never applies TAP terms; TAP attribution only comes from **Add to Showcase**.
- Profile Connection and Posting Connection were two separate steps — resolved (2026-10-10): merged into one optional **TikTok Connection**; only the **Affiliate Connection** is required.
