# Community listing · English

**Name:** Repaso

**Tagline:** Audit and tidy your designs before handoff.

**Category:** Design tools

**Description**

Repaso checks your selection or page and flags what a good design shouldn't have. Where it can, it fixes it in one click, and everything undoes with Ctrl+Z.

**What it checks**
- Text contrast (AA or AAA). If there's an image or a gradient behind the text, it says "couldn't verify": it never passes it.
- Text that's too small.
- Interactive elements with a touch target below the recommended size.
- Unnamed layers ("Frame 482", "Rectangle 12").
- Colors and text without a style or variable, and colors almost identical to an existing style.
- Auto layout spacing off your grid (4 or 8 px).
- Components missing states: hover, focus, disabled and, for fields, error.

**How it works**
1. Select layers, or choose "Current page", and hit Review.
2. You get a 0–100 score that explains itself: which rule costs how much.
3. Click a finding to jump to the layer. "Ignore" is remembered per file.
4. Batch fixes show before and after, with checkboxes to drop the ones you don't want. One batch = one Ctrl+Z.
5. Copy the report as Markdown to paste into a task or Notion.

**Built not to nag**
- Turn on only the rules you find useful and tune the thresholds: text size, touch target, spacing grid and contrast level.
- It won't freeze Figma on large files: it works in chunks and can be cancelled.
- Fully keyboard-accessible, follows Figma's light and dark themes. The interface is in Spanish.

**Privacy**
Reviews work offline. Repaso has no server and no accounts, stores none of your data and sends nothing outside Figma.

**(AI build only)** AI is optional and uses **your own Anthropic API key** (you need an Anthropic account with credit; typical use costs cents). It suggests layer names, describes missing states, checks spelling, button capitalization and "tú"/"usted" consistency, and summarizes the review. It sends only layer names, text and structure to api.anthropic.com, never images. Your key stays on your machine and never goes through any Repaso server. Before reviewing a large file it shows a cost estimate, and you can set a cap.

**Network access:** non-AI build, none. AI build, only api.anthropic.com and only if you turn AI on.

**Privacy policy:** https://nehemiasperez.com/laboratorio/repaso/privacidad

**Support:** *(your email or contact page)*

**Author:** Nehemias Pérez · https://nehemiasperez.com

**Version 0.1.0 notes**
First release: 9 rules, explainable score, batch fixes with preview and Markdown export.
