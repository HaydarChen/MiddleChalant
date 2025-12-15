const baseUrl = process.env.NEXT_PUBLIC_API_URL;

if (!baseUrl) {
  // Keep this lightweight: surfaces early in dev without crashing at runtime.
  // eslint-disable-next-line no-console
  console.warn(
    "NEXT_PUBLIC_API_URL is not set. API helper will use a blank base URL.",
  );
}

export async function apiFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const url = `${baseUrl ?? ""}${path}`;
  return fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
}


