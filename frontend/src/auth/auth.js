export function setAuth(token) {
  localStorage.setItem("token", token);
}

export function clearAuth() {
  localStorage.removeItem("token");
}

export function getToken() {
  return localStorage.getItem("token");
}

export function isLoggedIn() {
  return !!getToken();
}
