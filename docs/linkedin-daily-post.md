# Daily MemoPear LinkedIn Post — Automated Gmail Draft

This sets up a **daily run** that writes a fresh LinkedIn post for MemoPear (plus a
matching image prompt) and drops it into your Gmail as a ready-to-send **draft** at
~7:00 AM every day. You review, generate the image, and post.

## Why a scheduled trigger (and not GitHub Actions / cron)

Creating a Gmail **draft** requires the Gmail integration, which is only available
inside a live Claude Code session. A GitHub Actions workflow or plain server cron
can't create a Gmail draft without a full Google OAuth refresh-token setup. The clean,
durable way to run this every day is a **Claude Code scheduled trigger** — it starts a
short Claude session on a schedule, with the Gmail integration attached.

## One-time setup (2 minutes)

1. Open the repo in **Claude Code on the web**: https://claude.ai/code
2. Create a **Scheduled trigger** for this repository.
   - Schedule: **daily at 07:00** your local time.
   - Make sure the **Gmail** integration is enabled for the environment.
   - Prompt: paste the block under **"Daily prompt"** below.
3. Save. The first draft lands in your Gmail the next morning.

Docs: https://code.claude.com/docs/en/claude-code-on-the-web

> Tip: you can also run this prompt manually anytime in a session to get a draft on demand.

## Daily prompt

```
Daily MemoPear LinkedIn post task. MemoPear is a smart field-intelligence and lead-capture
platform: scan business cards/QR codes at conferences, enrich contacts with Gemini AI,
30-day auto-delete for privacy, cross-device sync, export leads to Google Sheets or a
pre-filled follow-up email. Audience: sales reps, founders, marketers, field-sales pros
who attend conferences and networking events.

Write ONE fresh, high-quality LinkedIn post for MemoPear (strong hook, scannable body, a
question CTA, 4-6 hashtags). Rotate the angle day to day so posts don't repeat — cycle
through: post-conference lead decay, a founder/build story, a concrete product
demo/walkthrough, a customer pain point, a contrarian hot take on networking/sales, a
privacy/data-hygiene angle, and a quick tip. Keep it authentic and founder-voiced, not salesy.

ALSO write an IMAGE PROMPT for an accompanying visual — a detailed prompt to paste into an
image generator (Gemini/DALL·E/Midjourney). It should match the post's angle, describe
subject, composition, lighting, style/mood, and MemoPear's brand feel (clean, modern,
professional; warm gold + pear-green accents), and specify aspect ratio 1200x627 (LinkedIn
landscape). Keep any on-image text minimal or none.

Then create a Gmail draft to dvir.n.il@gmail.com (use the create_draft tool) with subject
"MemoPear LinkedIn post idea — <weekday>, <Mon DD>". Body layout: the post wrapped in
"——— POST ———" / "——— END POST ———" markers, then "——— IMAGE PROMPT ———" /
"——— END IMAGE PROMPT ———" with the image prompt, then a one-line note on what angle
tomorrow could take. Do not send — just create the draft. Keep your chat reply to one short
confirmation line.
```

## Content angles to rotate

- Post-conference lead decay (the follow-up gap)
- Founder / build story
- Concrete product demo or walkthrough
- A specific customer pain point
- A contrarian hot take on networking / sales
- Privacy & data-hygiene (30-day auto-delete)
- A quick, practical tip
