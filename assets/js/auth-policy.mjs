export function validateFirebaseConfig(config, projectId) {
  if (!config || config.projectId !== projectId || !config.apiKey || !config.authDomain) {
    throw Object.assign(new Error('Invalid Firebase Web App configuration'), { code: 'romvos/config' });
  }
  return config;
}

export function memberState(snapshot) {
  // Cached membership must never unlock the interface without server approval.
  if (snapshot.metadata.fromCache) return 'checking';
  if (!snapshot.exists()) return 'denied';
  const member = snapshot.data();
  return member.active === true && ['owner', 'editor', 'viewer'].includes(member.role)
    ? 'approved' : 'denied';
}

export function authErrorMessage(error) {
  switch (error?.code) {
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-email':
      return 'Έλεγξε το email και τον κωδικό σου.';
    case 'auth/too-many-requests':
      return 'Έγιναν πολλές προσπάθειες. Δοκίμασε ξανά σε λίγο.';
    case 'auth/operation-not-allowed':
      return 'Η σύνδεση με email και κωδικό δεν έχει ενεργοποιηθεί ακόμη.';
    case 'auth/user-disabled':
      return 'Ο λογαριασμός έχει απενεργοποιηθεί. Επικοινώνησε με τον υπεύθυνο.';
    case 'permission-denied':
      return 'Δεν ήταν δυνατός ο έλεγχος πρόσβασης. Χρειάζεται έλεγχος των ρυθμίσεων της ομάδας.';
    case 'romvos/config':
      return 'Η σύνδεση χρηστών δεν έχει ρυθμιστεί ακόμη για αυτή τη διεύθυνση.';
    default:
      return 'Η σύνδεση δεν ολοκληρώθηκε. Έλεγξε το δίκτυο και δοκίμασε ξανά.';
  }
}
