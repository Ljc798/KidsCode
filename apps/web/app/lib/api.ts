export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api"

type ApiError = {
  error?: string
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    },
    // Ensure cookies flow when API is same-origin (/api) and support explicit includes.
    credentials: init?.credentials ?? "same-origin"
  })

  if (!res.ok) {
    let message = `Request failed: ${res.status}`
    try {
      const data = (await res.json()) as ApiError
      if (data?.error) message = data.error
    } catch {
      // ignore
    }
    throw new Error(message)
  }

  return (await res.json()) as T
}
