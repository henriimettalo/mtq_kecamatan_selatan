import { createRemoteJWKSet, jwtVerify, SignJWT, type JWTVerifyGetKey } from "jose";

export interface GoogleLoginConfig {
  clientId: string;
  clientSecret: string;
  sessionSecret: string;
  origin: string;
}

export const OAUTH_COOKIE = "mtq_google_flow";
export const PARTICIPANT_COOKIE = "mtq_participant_session";
export const SESSION_SECONDS = 7 * 24 * 60 * 60;
const googleKeys = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

export function safeReturnPath(value: string | null | undefined): string {
  // Limit destinations to the two participant entry points; never trust an arbitrary URL.
  return value === "/daftar" ? "/daftar" : "/peserta";
}

export async function hashToken(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Buffer.from(bytes).toString("base64url");
}

export async function createGoogleFlow(config: GoogleLoginConfig, returnTo?: string | null) {
  const state = randomToken();
  const nonce = randomToken();
  const verifier = randomToken();
  const challenge = Buffer.from(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))).toString("base64url");
  const cookie = await new SignJWT({ state, nonce, verifier, returnTo: safeReturnPath(returnTo) })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer("mtq-google-flow")
    .setAudience(config.clientId)
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(new TextEncoder().encode(config.sessionSecret));

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: `${config.origin}/api/auth/google/callback`,
    response_type: "code",
    scope: "openid",
    state,
    nonce,
    code_challenge: challenge,
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();
  return { cookie, url };
}

export async function readGoogleFlow(cookie: string, state: string, config: GoogleLoginConfig) {
  const { payload } = await jwtVerify(cookie, new TextEncoder().encode(config.sessionSecret), {
    algorithms: ["HS256"], issuer: "mtq-google-flow", audience: config.clientId,
  });
  if (typeof payload.state !== "string" || payload.state !== state ||
      typeof payload.nonce !== "string" || typeof payload.verifier !== "string") {
    throw new Error("Invalid OAuth flow");
  }
  return { nonce: payload.nonce, verifier: payload.verifier, returnTo: safeReturnPath(typeof payload.returnTo === "string" ? payload.returnTo : null) };
}

export async function verifyGoogleIdentity(
  token: string, clientId: string, nonce: string, keys: JWTVerifyGetKey = googleKeys,
): Promise<string> {
  const { payload } = await jwtVerify(token, keys, {
    algorithms: ["RS256"],
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: clientId,
    requiredClaims: ["exp", "iat", "sub", "nonce"],
    maxTokenAge: "10m",
  });
  if (payload.nonce !== nonce || typeof payload.sub !== "string" || !payload.sub || payload.sub.length > 255 ||
      (payload.azp !== undefined && payload.azp !== clientId) ||
      (Array.isArray(payload.aud) && payload.aud.length > 1 && payload.azp !== clientId)) {
    throw new Error("Invalid Google identity");
  }
  return payload.sub;
}
