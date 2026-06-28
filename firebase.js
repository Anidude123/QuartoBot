(function () {
  const firebaseConfig = {
    apiKey: "PASTE_FIREBASE_API_KEY_HERE",
    authDomain: "PASTE_FIREBASE_AUTH_DOMAIN_HERE",
    projectId: "PASTE_FIREBASE_PROJECT_ID_HERE",
    appId: "PASTE_FIREBASE_APP_ID_HERE",
    databaseURL: "https://fourfoldarena-default-rtdb.firebaseio.com"
  };

  const isConfigured = !Object.values(firebaseConfig).some(value =>
    typeof value === "string" && value.startsWith("PASTE_FIREBASE_")
  );

  function getServices() {
    if (!isConfigured) throw new Error("Paste your Firebase web config into firebase.js.");
    if (!window.firebase) throw new Error("Firebase SDK failed to load.");
    if (!window.firebase.apps.length) window.firebase.initializeApp(firebaseConfig);
    return {
      auth: window.firebase.auth(),
      db: window.firebase.database()
    };
  }

  window.QuartoFirebase = {
    config: firebaseConfig,
    databaseURL: firebaseConfig.databaseURL,
    isConfigured,
    getServices
  };
})();
