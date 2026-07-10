type DownloadResponse = {
  ok: boolean
  status: number
  headers: { get(name: string): string | null }
  blob(): Promise<Blob>
}

type DownloadFetcher = (
  input: string,
  init: RequestInit,
) => Promise<DownloadResponse>

export type PatientCertificateDownloadResult =
  | { status: "success"; blob: Blob }
  | { status: "unauthorized" }
  | { status: "error"; message: string }

export async function requestPatientCertificateDownload({
  href,
  fetcher = fetch,
}: {
  href: string
  fetcher?: DownloadFetcher
}): Promise<PatientCertificateDownloadResult> {
  try {
    const response = await fetcher(href, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      headers: { Accept: "application/pdf" },
    })

    if (response.status === 401) {
      return { status: "unauthorized" }
    }

    if (response.status === 403) {
      return {
        status: "error",
        message: "Sign in to the account that made this request, then try again.",
      }
    }

    if (response.status === 404 || response.status === 410) {
      return {
        status: "error",
        message: "This certificate is no longer available. Open the request or contact support.",
      }
    }

    if (!response.ok) {
      return {
        status: "error",
        message: "We couldn't download this certificate. Please try again.",
      }
    }

    const contentType = response.headers.get("content-type")?.toLowerCase() ?? ""
    if (!contentType.includes("application/pdf")) {
      return {
        status: "error",
        message: "We couldn't open this certificate. Please try again.",
      }
    }

    return { status: "success", blob: await response.blob() }
  } catch {
    return {
      status: "error",
      message: "We couldn't download this certificate. Check your connection and try again.",
    }
  }
}
