/* Who is calling — sent with every request to the new backend.

   The login response gives `user.username`, `user.role_id` and
   `user.role_name`; every API call carries them under those same keys:
     - GET / HEAD / DELETE without a body → query string
         /TripDashboard/?username=Admin&role_id=1&role_name=Admin
     - JSON body (object or JSON string)   → merged into the body
     - FormData / URLSearchParams body      → appended as fields
     - anything else (array, Blob, text)    → query string
   Values the caller already set are never overwritten. Pass
   `{ withUser: false }` in the fetch options to skip it for one call.

   Pure JS (no React) so it can be tested on its own. */

export const USER_CONTEXT_KEY = "api_user_context";

const KEYS = ["username", "role_id", "role_name"];

const isPlainObject = (v) => Object.prototype.toString.call(v) === "[object Object]";

const clean = (ctx) => {
  const out = {};
  for (const k of KEYS) {
    const v = ctx?.[k];
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return Object.keys(out).length ? out : null;
};

/* Pick the three fields out of the /Login/ response's `user` object. */
export const userContextFromLogin = (user) => {
  const u = user || {};
  return clean({
    username: u.username,
    role_id: u.role_id ?? u.user_role?.role_id,
    role_name: u.role_name ?? u.user_role?.role_name,
  });
};

export function saveUserContext(ctx, storage = globalThis.localStorage) {
  try {
    if (ctx) storage?.setItem(USER_CONTEXT_KEY, JSON.stringify(ctx));
    else storage?.removeItem(USER_CONTEXT_KEY);
  } catch {
    /* storage unavailable */
  }
}

/* The saved context; sessions from before this was added fall back to the
   stored `user` object so nobody has to log in again. */
export function readUserContext(storage = globalThis.localStorage) {
  try {
    const saved = JSON.parse(storage?.getItem(USER_CONTEXT_KEY) || "null");
    if (saved) return clean(saved);
    const u = JSON.parse(storage?.getItem("user") || "null");
    return u ? clean({ username: u.username, role_id: u.roleId, role_name: u.roleName }) : null;
  } catch {
    return null;
  }
}

const addToQuery = (url, ctx) => {
  const hashAt = url.indexOf("#");
  const hash = hashAt >= 0 ? url.slice(hashAt) : "";
  const u = new URL(hashAt >= 0 ? url.slice(0, hashAt) : url);
  for (const [k, v] of Object.entries(ctx)) {
    if (!u.searchParams.has(k)) u.searchParams.set(k, String(v));
  }
  return u.toString() + hash;
};

const QUERY_METHODS = ["GET", "HEAD", "DELETE"];

/* Returns { url, init } ready for fetch(), with the user context attached. */
export function withUserContext(url, options = {}, ctx = readUserContext()) {
  const { withUser = true, ...init } = options;
  let { body } = init;

  // A plain-object body is sent as JSON either way
  if (!withUser || !ctx) {
    if (isPlainObject(body)) init.body = JSON.stringify(body);
    return { url, init };
  }

  const method = String(init.method || "GET").toUpperCase();

  if (body == null) {
    if (QUERY_METHODS.includes(method)) return { url: addToQuery(url, ctx), init };
    return { url, init: { ...init, body: JSON.stringify(ctx) } };
  }

  if (typeof FormData !== "undefined" && body instanceof FormData) {
    for (const [k, v] of Object.entries(ctx)) if (!body.has(k)) body.append(k, String(v));
    return { url, init };
  }

  if (typeof URLSearchParams !== "undefined" && body instanceof URLSearchParams) {
    for (const [k, v] of Object.entries(ctx)) if (!body.has(k)) body.set(k, String(v));
    return { url, init };
  }

  if (typeof body === "string") {
    try {
      const parsed = JSON.parse(body);
      if (isPlainObject(parsed)) body = parsed;
    } catch {
      /* not JSON — falls through to the query string */
    }
  }

  if (isPlainObject(body)) {
    return { url, init: { ...init, body: JSON.stringify({ ...ctx, ...body }) } };
  }

  // Arrays, plain text, files…: can't hold extra keys, so use the query string
  return { url: addToQuery(url, ctx), init };
}
