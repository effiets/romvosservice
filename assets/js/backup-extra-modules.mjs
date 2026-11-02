const families = [
  { key: 'inventory', label: 'Αποθήκη, υλικά και εργαλεία', matches: key => key.startsWith('romvos_inventory_') },
  { key: 'invoices', label: 'Έλεγχος τιμολογίων', matches: key => key.startsWith('romvos_invoice_control_') },
  { key: 'attendance', label: 'Παρουσίες', matches: key => key.startsWith('romvos_attendance_') },
  { key: 'leave', label: 'Άδειες προσωπικού', matches: key => key === 'romvos_leave_demo' || key.startsWith('romvos_leave_') },
  { key: 'fleet', label: 'Συντήρηση και έξοδα στόλου', matches: key => key.startsWith('romvos_fleet_') },
  { key: 'alternatePlanner', label: 'Εναλλακτικός προγραμματισμός', matches: key => key.startsWith('dispatch_app_') },
  { key: 'separateService', label: 'Ξεχωριστά αντίγραφα service', matches: key => key.startsWith('romvos_clean_friend_') },
];

// Report each stored dataset separately. Version suffixes alone are not enough
// to decide which copy is authoritative. No business values leave this function.
export function inspectAdditionalModules(storage) {
  return families.map(family => {
    const sources = [];
    for (const [key, raw] of Object.entries(storage)) {
      if (!family.matches(key)) continue;
      let value = raw;
      if (typeof raw === 'string') {
        try { value = JSON.parse(raw); }
        catch {
          // Location selections and flags can be plain strings. Broken JSON
          // containers are reported rather than silently discarded.
          if (/^\s*[\[{]/.test(raw)) sources.push({ storage: key, invalid: true });
          continue;
        }
      }
      if (!value || typeof value !== 'object') continue;
      const array = Array.isArray(value);
      sources.push({
        storage: key, type: array ? 'list' : 'object',
        entries: array ? value.length : Object.keys(value).length,
        sections: array ? {} : Object.fromEntries(Object.entries(value)
          .filter(([, nested]) => nested && typeof nested === 'object')
          .map(([name, nested]) => [name, Array.isArray(nested) ? nested.length : Object.keys(nested).length])),
      });
    }
    return { key: family.key, label: family.label, sources };
  }).filter(family => family.sources.length);
}
