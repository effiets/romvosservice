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

Business records still use browser localStorage; this step does not enable shared accounts or cloud saving. Opening the app no longer clears saved jobs and crew assignments.

JSON files are historical snapshots. Current browser data may be newer. No JSON backup has been imported or overwritten during this refactor.

## Remaining implementation

1. Configure Firebase Authentication, team membership, and database rules.
2. Introduce record-based shared storage and live listeners, starting with appointments.
3. Show saving/saved/error status and handle concurrent edits.
4. Migrate the remaining modules and verify with multiple accounts.
5. Add complete JSON export/restore and an end-of-day backup process; test restoration before migration.

Keep the current appearance and scheduling workflow throughout. A fresh export from the browser holding the current records will be needed at migration time.
