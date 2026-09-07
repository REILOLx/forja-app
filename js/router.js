const routes = {};

export function registerRoute(path, mod) {
  routes[path] = mod;
}

export function currentPath() {
  const hash = location.hash.slice(1);
  return hash || '/home';
}

export function navigate(path) {
  location.hash = path;
}

export function resolveRoute(path) {
  return routes[path] || routes['/home'];
}

export function onRouteChange(cb) {
  window.addEventListener('hashchange', cb);
}
