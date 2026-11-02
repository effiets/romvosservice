# ROMVOS Service

Service appointments and crew planning. The existing interface is preserved.

## Source files

- `index.html`: canonical page and existing styles. Styles remain inline because the print/image export reads style elements.
- `assets/js/app.js`: original main application code.
- `assets/js/legacy-*.js`: existing extensions, kept in their original execution order. Consolidate only after checking each module's behavior.
- `assets/js/service-storage.js`: observes only service business lists before legacy startup code, including direct popup writes, and keeps each tab's baseline separate.
- `assets/images/brand-1.png`: shared brand image, previously embedded four times.
- `yes/`: Firebase Hosting output, as configured in `firebase.json`.

Edit the root source files, then run:

```sh
npm run build
```

Requires Node.js 22 or newer. No dependency installation is needed for this build. The existing Python sync command remains available as an alternative.

This updates the hosting page and assets without changing JSON backups. Backup JSON files are excluded from Firebase Hosting uploads. Do not edit `yes/index.html` independently. Both GitHub deployment workflows run this build before publishing.

## Current storage

Email/password sign-in and team membership checking are available from the sidebar. **Κοινό πρόγραμμα** activates shared service data after the matching Firestore rules are published. The current implementation covers the crew board, jobs, drafts, candidates, technicians, vehicles, contacts, To Do/archive, reminders, orders, incoming equipment, and returns. Local mode is still available until migration is finalized. Opening the app no longer clears saved jobs and crew assignments.

This expansion uses schema version 3 and has not yet been deployed or verified with live multi-user writes. It stores one document for each of the 13 service modules, plus metadata, so the validated initial backup fits in one atomic transaction. Publish the matching rules and application together before testing the expanded shared workflow. Existing schema 1 scheduling data remains readable; the first schema 3 save supersedes it without a risky bulk deletion. Local lists are preserved separately before joining.

See [Firebase setup](docs/firebase-setup.md) for the console steps and how to test a team account before requiring sign-in. The public Firebase client configuration is in `assets/js/auth-config.mjs`. Account passwords and service-account keys must never be added to the app.

`firestore.rules` permits users to read their own membership entry and active members to read scheduling. Only owner/editor roles can save scheduling, and only the owner can initialize it. Browser clients cannot modify membership or access other modules. Hosting deployments do **not** publish these rules; publish them separately in the Firestore console or with `firebase deploy --only firestore:rules --project romvos-service` after creating the database.

See [Shared scheduling](docs/shared-scheduling.md) for backup import, activation, conflict handling, validation, and the remaining limitations.

The updated 2 November backup also contains inventory/tools, fleet maintenance, attendance, leave, and invoice datasets. The user confirmed these belong to other HTML applications and deferred their integration. This phase covers only the modules already present in ROMVOS Service. See the [backup assessment](docs/backup-assessment-2026-11-02.md) for counts, data relationships, and import limits. The inspection preview identifies the additional datasets; they must be preserved separately from the service migration.

JSON files are historical snapshots. Current browser data may be newer. No JSON backup has been imported or overwritten during this refactor.

## Remaining implementation

1. Publish the schema 3 Firestore rules and application together. The validated import is ready locally, preserves all 879 service records, and exposes the historical fifth crew in the existing interface.
2. As owner, select the final JSON in **Κοινό πρόγραμμα**, review the counts, and create the empty shared service. Keep the original JSON unchanged until restoration has been verified.
3. Verify the workflow with the three team accounts on at least two devices: live updates, simultaneous edits, refresh, failed saves, and role enforcement.
4. Add complete shared-service JSON export/restore and an independent end-of-day backup process. Verify a restoration rehearsal against a separate test target rather than relying on a browser's local copy.
5. After validation, require sign-in and move the team to the single shared workflow. Document the daily backup check and recovery procedure.

Keep the current appearance and scheduling workflow throughout. A fresh export from the browser holding the current records will be needed at migration time.
