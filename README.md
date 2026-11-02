# ROMVOS Service

Service appointments and crew planning. The existing interface is preserved.

## Source files

- `index.html`: canonical page and existing styles. Styles remain inline because the print/image export reads style elements.
- `assets/js/app.js`: original main application code.
- `assets/js/legacy-*.js`: existing extensions, kept in their original execution order. Consolidate only after checking each module's behavior.
- `assets/images/brand-1.png`: shared brand image, previously embedded four times.
- `yes/`: Firebase Hosting output, as configured in `firebase.json`.

Edit the root source files, then run:

```sh
npm run build
```

Requires Node.js 22 or newer. No dependency installation is needed for this build. The existing Python sync command remains available as an alternative.

This updates the hosting page and assets without changing JSON backups. Backup JSON files are excluded from Firebase Hosting uploads. Do not edit `yes/index.html` independently. Both GitHub deployment workflows run this build before publishing.

## Current storage

Email/password sign-in and team membership checking are available from the sidebar. The new **Κοινό πρόγραμμα** button can activate shared scheduling after the updated Firestore rules are published. It synchronizes the crew board, jobs, drafts, candidates, technicians, and vehicles. Contacts, To Do, reminders, orders, incoming equipment, and returns remain local during this phase. Opening the app no longer clears saved jobs and crew assignments.

See [Firebase setup](docs/firebase-setup.md) for the console steps and how to test a team account before requiring sign-in. The public Firebase client configuration is in `assets/js/auth-config.mjs`. Account passwords and service-account keys must never be added to the app.

`firestore.rules` permits users to read their own membership entry and active members to read scheduling. Only owner/editor roles can save scheduling, and only the owner can initialize it. Browser clients cannot modify membership or access other modules. Hosting deployments do **not** publish these rules; publish them separately in the Firestore console or with `firebase deploy --only firestore:rules --project romvos-service` after creating the database.

See [Shared scheduling](docs/shared-scheduling.md) for activation, conflict handling, validation, and the remaining limitations.

JSON files are historical snapshots. Current browser data may be newer. No JSON backup has been imported or overwritten during this refactor.

## Remaining implementation

1. Publish the updated scheduling rules and verify the shared scheduler with two sessions.
2. Migrate the remaining modules and verify their relationships with scheduling.
3. Add complete JSON export/restore and an end-of-day backup process; test restoration before the final migration.

Keep the current appearance and scheduling workflow throughout. A fresh export from the browser holding the current records will be needed at migration time.
