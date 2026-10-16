// A chunk that will not load almost always means this page came from a build
// that is no longer on the server — typically an app resumed after days
// suspended, still running old code and asking for its own filenames.
//
// Reloading fetches the current index.html and the client heals itself. The
// alternative is the error boundary, which looks like the app is broken.
const RELOAD_KEY = 'staleBuildReloadAt';
const RELOAD_COOLDOWN = 30000;

const reloadOnce = () => {
  let last = 0;

  try {
    last = Number(window.sessionStorage.getItem(RELOAD_KEY)) || 0;
  } catch {
    // Storage can throw in locked-down web views; treat it as never reloaded.
  }

  // Without the cooldown a genuinely broken deploy would reload forever.
  if (Date.now() - last < RELOAD_COOLDOWN) {
    return;
  }

  try {
    window.sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    // Not fatal: the worst case is a second reload attempt.
  }

  window.location.reload();
};

const isChunkFailure = (reason) => {
  const text = String(reason?.message ?? reason ?? '');
  return (
    text.includes('dynamically imported module') ||
    text.includes('Importing a module script failed') ||
    text.includes('error loading dynamically imported module')
  );
};

const recoverStaleBuild = () => {
  // Fired by Vite when a preloaded chunk cannot be fetched.
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();
    reloadOnce();
  });

  // Covers imports that fail outside the preload helper.
  window.addEventListener('unhandledrejection', (event) => {
    if (isChunkFailure(event.reason)) {
      reloadOnce();
    }
  });
};

export default recoverStaleBuild;
