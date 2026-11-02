export const AUTH_SETTINGS = Object.freeze({
  projectId: 'romvos-service',
  workspaceId: 'romvos',
  // The service now has one team database. Approved sign-in is required and
  // the interface stays locked until a server-confirmed shared snapshot loads.
  requireSignIn: true,
  // Public client configuration read from this project's Hosting init.json.
  // This is not a credential granting access; the Firestore rules enforce that.
  // Never put a service-account key or an account password in this file.
  firebaseConfig: {
    apiKey: 'AIzaSyCektDWisoQIwgh7Hjx8S8-JGkf6V364Vk',
    authDomain: 'romvos-service.firebaseapp.com',
    projectId: 'romvos-service',
    messagingSenderId: '551919734193',
    storageBucket: 'romvos-service.firebasestorage.app',
  },
});
