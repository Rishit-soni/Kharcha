# Kharcha 2: smart expense logging

Back-tap your phone, type the amount, tap **Add**. Kharcha has already picked the right category for you.

## What's in this version

**Smart category selection.** Kharcha scores every category on four signals and pre-selects the winner. The reason appears next to the ✦ icon above the categories, so you always know why a category was picked:

| Signal | Example |
|---|---|
| Time rules | **Food** is picked automatically at breakfast (8:30–10:30 AM), lunch (12–2 PM) and dinner (7–10 PM) |
| Note keywords | A note with "uber", "rapido" or "metro" picks **Transport**; "swiggy" or "zomato" picks **Food** |
| Learned words | Once you've filed "myntra" under Shopping, Kharcha remembers it |
| Your habits | If you log ₹40 for an auto every weekday at 9:15, Kharcha learns that and suggests it at that hour |

- The suggestion updates as you type the amount or the note.
- Tap any other category to override it. A **Use suggestion** link brings the suggestion back.
- You can turn learning off in Settings → Smart suggestions.

**Categories you control**
- **Create:** tap **New** at the end of the category strip.
- **Edit:** press and hold any category, or go to Settings → Manage categories. You can change the name, choose from 97 icons, pick one of 14 colours, set your own times and add keywords.
- **Reorder:** drag the handle in Manage categories.
- **Delete:** its expenses move to a category you choose, and you can undo.

**Everything else**
- Insights: the month's total compared with the same days of last month, a daily spending chart and a breakdown by category. Tap a category to filter the list.
- Tap any expense to edit its amount, category, note or time, or to delete it.
- Use the **Now** button to log something from earlier.
- Light and dark themes, offline support, CSV export, and backup and restore.
- Data from version 1 is migrated automatically.

## 1. Put it online (free, about 2 minutes)

Upload this folder to any static host:

- **Netlify Drop:** open https://app.netlify.com/drop on a computer and drag this folder onto the page.
- **GitHub Pages:** push the folder to a repo, then go to Settings → Pages → Deploy from branch.
- **Cloudflare Pages** or **Vercel** work the same way.

## 2. Install it on your phone

- **Android (Chrome):** open your URL, then ⋮ → **Install app**.
- **iPhone (Safari):** open your URL, then Share → **Add to Home Screen**, and keep **Open as Web App** switched on.

## 3. Open it with a back-tap

**iPhone**
1. In the Shortcuts app, tap **+** and add **Open URLs**. Use `webapp://your-site.netlify.app` (your address with `webapp://` in place of `https://`).
2. In Settings → Accessibility → Touch → **Back Tap** → Double Tap, choose that shortcut.

If your iOS version won't open `webapp://` links, use the normal `https://` address and keep using Kharcha in Safari. Safari and home-screen apps keep separate data on iPhone.

**Pixel:** Settings → System → Gestures → **Quick Tap** → Open app → Kharcha.

**Samsung:** use the built-in back-tap in Advanced features (newer One UI). Otherwise install Good Lock, add **RegiStar** → Back-Tap action → Open app → Kharcha.

**Other Android phones:** use the open-source **Tap, Tap** app, sideloaded from GitHub.

## Zero-tap logging

```
https://your-site/?amt=250&cat=auto&note=lunch
```

- `amt`: the amount (required).
- `cat`: a category name, or `auto` to let the smart engine choose. Leave it out to just pre-fill the amount.
- `note`: optional. It also helps `auto` choose.

## Customising

- **Default meal times:** Settings → Meal times, or edit the Food category.
- **Updating the app:** after you change any file, bump `CACHE` in `sw.js` (for example `kharcha-v2.0.1`) so installed copies pick up the new version.

## Files

```
index.html             screens and markup
app.css                design system and styles
app.js                 data, smart engine, all interactions
icons.js               Lucide icon set (97 category icons + interface icons)
sw.js                  offline cache
manifest.webmanifest   install details, icons, shortcuts
fonts/                 Bricolage Grotesque + Geist (subset, self-hosted)
img/                   app icons
licenses/              Lucide (ISC), Bricolage Grotesque and Geist (SIL OFL 1.1)
```

Your data stays on your phone in the browser's storage. Uninstalling the app clears it, so use **Settings → Save backup** now and then.
