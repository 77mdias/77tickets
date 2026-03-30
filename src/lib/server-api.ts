import { headers } from "next/headers";

const FALLBACK_HOST = "localhost:3000";

export const getServerBaseUrl = async (): Promise<string> => {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? FALLBACK_HOST;
  const protocol =
    requestHeaders.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");

  return `${protocol}://${host}`;
};

export const getServerCookieHeader = async (): Promise<string | null> => {
  const requestHeaders = await headers();
  return requestHeaders.get("cookie");
};
