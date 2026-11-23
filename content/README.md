# The public edition

`guidebook.json` in this directory is what the deployed site serves at `/read`,
`/read/<domain>`, `/read/<domain>/<section>` and `/read/method/<method>`.

It is **generated, not hand-written**, and it is a *projection* of a project:
only methods and manuscript nodes whose status is `Published`, plus the sections
and domains those methods reach. Notes, quotations, claims, experiments and
draft chapters are never written here, so this file can be public even while the
project it came from is private. A section's `draft` text, a method's `notes` and
a chapter's review `comments` are emptied rather than copied: no reader surface
renders them, and this file is public.

Manuscript nodes share one URL space (`/read/chapter/<slug>`), so a part's
contents page and a written chapter are reachable the same way. A published
ancestor with no text of its own is kept when a descendant has text, which is
what gives a chapter its breadcrumb; a draft ancestor is dropped and its
children become roots.

## Regenerating

From the app: mark what is ready as Published, then **Settings → Export → Full
JSON backup**.

```bash
npm run content:sync -- path/to/guidebook-backup.json   # from a backup
npm run content:sample                                  # the shipped sample edition
npm run content:check                                   # validate only
```

`content:sync` keeps the slug of every record already in this file (slugs are
keyed by record id), so renaming a published method does not move its URL. New
records get a slug from their title; a collision gets `-2`. Sections are unique
within their domain, methods across the whole edition, and the static segments
the reader routes own — `method` and `chapter` — are reserved for domains, so
`/read/method/<slug>` and `/read/chapter/<slug>` stay reachable.

`build` and `build:pages` run `content:check` first, so an edition with a draft
in it, a missing or duplicate slug, an unresolvable section, or an unknown
format version fails the build instead of deploying a broken link.

## Shape

```json
{
  "format": "guidebook-edition",
  "formatVersion": 2,
  "generatedAt": "…",
  "source": { "title": "…", "authorName": "…", "commit": "…" },
  "edition": {
    "domains": [],
    "sections": [],
    "methods": [],
    "documents": [],
    "slugs": { "<record id>": "<url segment>" }
  }
}
```
