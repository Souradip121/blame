# Product

<!-- impeccable:product-schema 1 -->

<!-- Written 13 Nov 2026 from the build brief handed over by the session that planned this app. No separate interview was run: the brief answered users, purpose, stack and the visual direction (picked by the owner from a concept board). Facts marked (inferred) come from the brief's references, not from the owner directly. -->

## Platform

web

## Stack

Static HTML, CSS and plain JavaScript modules, no build step, served by GitHub Pages from the public repo `Souradip121/blame` (same shape as the owner's `bunk` and `who-texts-first` builds). No backend, no login, no analytics.

## Users

Indian college students in a group project (usually 2 to 6 people, one shared GitHub repo) who want to settle "who actually did the work". They arrive from an Instagram reel by @souradip.sh after commenting BLAME and getting the link by DM, so they open it on a phone, often mid-argument in a group chat.

## Product Purpose

Paste a GitHub repo link; the page reads the repo's public history in the browser and shows each person's share of the work (commits or lines changed), how much landed in the last 24 hours before the deadline, and a tabloid-style verdict with badges that can be shared back to the group as an image. Success: someone pastes their repo, laughs at the verdict and drops the card in the group chat.

## Positioning

It reads the actual git history instead of asking people to self-report, and turns it into a front-page verdict built only from real numbers in that history, while saying plainly that commit counts are a rough measure of effort.

## Operating Context

- Phone first, one hand, inside or right after a group-chat argument; the result is shared to WhatsApp or Instagram.
- Data comes from the GitHub REST API from the browser. Without a token GitHub allows 60 requests an hour per IP address; a pasted token raises that and unlocks private repos.
- Reel hook: "Don't argue about who did the group project." Keyword: BLAME.

## Capabilities and Constraints

- Accepts `github.com/owner/repo`, full URLs (with or without `.git`, `/tree/...`) and `owner/repo`.
- Counts the default branch only. Bots (dependabot and friends) are excluded. People who commit from two emails are merged when GitHub links both to one login.
- Two measures, switchable: commits and lines changed (additions + deletions).
- Deadline stat: commits in the 24 hours before the latest commit, or before a deadline the user sets.
- Badges (Carried, Solid, Night-before, Moral support) follow stated rules written in the README and on the page.
- Nothing is stored on a server. A token, if given, lives in sessionStorage only and is sent only to api.github.com.
- Must state on screen that commit counts are a rough measure of effort (pairing, design and testing don't show up) and that the verdict is for fun.

## Brand Commitments

- Made by @souradip.sh; part of the "I BUILT IT" series of small fun apps for students.
- Visual direction picked by the owner: concept C "tabloid" (`../ui-concepts/blame/blame_c_tabloid.png`): loud tabloid front page, huge condensed black headline type, yellow highlight boxes, red EXCLUSIVE banner, halftone avatars, torn-paper edges. Names and numbers on that board are placeholders.
- Voice: cheeky, never cruel; every joke is built from a true number in the repo.

## Evidence on Hand

- No real user data. Screenshots and reel stills use a demo repo with made-up teammates created for this purpose; no real person's name or face is shamed.
- No invented stats anywhere: every number on screen is computed from the repo being viewed.

## Product Principles

1. Every claim on the verdict traces to a number in the repo; if the data can't support a line, the line isn't shown.
2. Honest about the measure: the page says what it counted and what it can't see.
3. One paste to a verdict; nothing to sign up for.
4. Built to be shared: the result card must read on its own in a group chat.

## Accessibility & Inclusion

(inferred) Phone-sized touch targets, readable contrast on the yellow and red fields, reduced-motion respected, and names shown as people wrote them in git.
