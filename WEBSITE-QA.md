# Website verification — 9 October 2026

## Passed

- Headless Chrome at viewport widths 320, 375, 390, 430, 768, 820, 1024, 1280, 1440, 1920, and 2560 pixels: no document horizontal overflow or unintended off-screen content.
- Visual inspection of desktop hero, mobile hero, creator section, product concepts, and complete mobile layout.
- Mobile menu opens, closes and navigates; character dialog displays the selected character; Escape closes dialogs; FAQ expands.
- Reduced-motion preference stops animated characters. Manual pause also stops decorative animation. Essential content remains readable with JavaScript disabled.
- Local assets returned successfully; no uncaught JavaScript errors in the tested flows.
- Valid JSON-LD, one H1, Thai document language, canonical link, legal footer links and same-tab Play now links.
- OAuth redirect forwards access-token hashes, error hashes, code queries and error queries to `/game/`, preserving query/hash.
- Auth API simulations: normal player, admin, bad credentials, unavailable network, expired-session refresh, invalid stored token, unavailable role service, and admin role revoked before navigation.
- Admin handoff stores the expected existing session shape, transfers only after server role validation, and clears the homepage copy.
- Sign-out revokes only the local website session (`scope=local`).
- JavaScript syntax and Git whitespace checks passed. Website release-owned and protected files remain unchanged; the canonical source admin was redesigned under the owner's subsequent instruction.
- All website images are below 350 KB each. Lazy loading defers below-the-fold images.

## Not yet verified

- Real iPhone/iPad Safari and Android devices. Chrome viewport checks are not substitutes for real-device or Safari engine tests.
- Real email/password login, Google round-trip, and admin handoff with the owner's accounts. Automated authentication checks used intercepted API responses and did not create users or access player data.
- Search engine indexing, ranking, rich-result eligibility, or AI citations. SEO metadata makes the content easier to understand; it does not guarantee inclusion or ranking.
- The Unity game was not modified or retested. Admin database writes and real account flows were not exercised.

## Cinematic homepage and admin revision

- Homepage passed 11 viewport widths (320–2560 px), pointer parallax, card tilt, charge interaction, touch charging, element selection, spellbook commands and escaped input, manual animation pause and reduced-motion checks.
- Fixed a first-frame particle timing error and repeated the complete interaction suite with no uncaught JavaScript errors.
- Admin passed 9 widths (320–1920 px), all navigation, bar/line charts, 7/30/90-day ranges, empty revenue state, CSV import/export, decimal precision, negative net revenue, and invalid-input rejection.
- Dashboard player metrics retain the existing server RPC. Local preview fixtures are visibly marked and isolated outside deployable folders. The real admin route retains its authentication gate.
- Revenue is not connected to an order backend. Demo is explicitly selected; CSV stays in browser memory and clears on sign-out.

Local preview: homepage at `http://127.0.0.1:8768/`, authenticated source admin at `/admin/`, isolated sample dashboard at `/__preview__/admin/`. Game links forward to the production game. Deployment remains a separate step after preview review; before any push, run `git pull --rebase origin main` as requested.
