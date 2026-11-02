import { inspectRomvosBackup } from './backup-inspector.mjs';

export function initializeBackupPreview() {
  const input = document.getElementById('backupInspectFile');
  const result = document.getElementById('backupInspectResult');
  let selection = 0;
  input.addEventListener('change', async () => {
    const request = ++selection;
    const file = input.files?.[0];
    result.hidden = !file;
    result.textContent = '';
    if (!file) return;
    result.textContent = 'Έλεγχος αρχείου…';
    try {
      if (file.size > 25 * 1024 * 1024) throw new Error('Το αρχείο είναι μεγαλύτερο από 25 MB και χρειάζεται ξεχωριστό έλεγχο.');
      const report = inspectRomvosBackup(await file.text());
      if (request !== selection) return;
      const date = report.createdAt
        ? new Intl.DateTimeFormat('el-GR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Athens' }).format(new Date(report.createdAt))
        : 'Δεν καταγράφεται στο αρχείο';
      result.classList.remove('account-error');
      result.textContent = [
        file.name,
        `Ημερομηνία backup: ${date}`,
        '',
        ...report.inventory.map(module => `${module.label}: ${module.count === null ? 'δεν περιλαμβάνεται' : module.count}`),
        `Θέσεις πίνακα με αναθέσεις: ${report.populatedBoardCells}`,
        '',
        ...report.warnings,
        '',
        'Ο έλεγχος ολοκληρώθηκε. Δεν έγινε εισαγωγή ή μεταφορά δεδομένων.',
      ].join('\n');
    } catch (error) {
      if (request !== selection) return;
      result.classList.add('account-error');
      result.textContent = error.message;
    }
  });
}
