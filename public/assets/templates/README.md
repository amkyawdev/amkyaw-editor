# Project templates

JSON blueprints that the editor can load to bootstrap a new project. They mirror
the `Project` shape in `src/types/project.ts` but omit generated fields (ids,
timestamps), so `applyTemplate` fills those in on import.

Available templates:

| File | Purpose |
| --- | --- |
| `title-card.json` | Centered title with entrance and exit animation |
| `lower-third.json` | Name/role strap that slides in from the left |
