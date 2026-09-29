import { toast } from './store';

/**
 * The downloadable offline copy: the whole game as one HTML file that opens from a phone or computer with
 * no connection and no install. The site serves it next to the game as `duskline-offline.html`; the
 * claude.ai page carries it as a file beside the page. Inside the claude.ai viewer a page cannot start a
 * download itself, so the save goes through the viewer's `downloads` capability, which asks the player first.
 */

export const OFFLINE_COPY_FILE = 'duskline-offline.html';

interface Downloads {
  save(request: { filename: string; data: Blob | string }): Promise<{ status: string }>;
}

interface Viewer {
  use?: (name: string) => Promise<unknown>;
}

/** How this page can offer the copy. */
export type CopyMode =
  /** This page is already a downloaded copy, or a development build with no copy to fetch. */
  | 'none'
  /** Still asking the claude.ai viewer whether it can save files. */
  | 'checking'
  /** The claude.ai viewer will save it after asking. */
  | 'viewer'
  /** A normal download link. */
  | 'link'
  /** The claude.ai viewer cannot save files here. */
  | 'blocked';

/** This page was opened from a file on the device: it is the offline copy. */
export const isDownloadedCopy = (): boolean => location.protocol === 'file:';

let viewerDownloads: Promise<Downloads | null> | null = null;

function fromViewer(): Promise<Downloads | null> | null {
  const claude = (window as unknown as { claude?: Viewer }).claude;
  if (typeof claude?.use !== 'function') return null;
  viewerDownloads ??= claude.use('downloads').then(
    (d) => (d as Downloads | null) ?? null,
    () => null,
  );
  return viewerDownloads;
}

/** Whether, and how, this page can offer the offline copy. Resolves quickly outside the claude.ai viewer. */
export async function copyMode(): Promise<CopyMode> {
  if (isDownloadedCopy() || import.meta.env.DEV) return 'none';
  const viewer = fromViewer();
  if (!viewer) return 'link';
  return (await viewer) ? 'viewer' : 'blocked';
}

export type SaveOutcome = 'saved' | 'declined' | 'offline' | 'unavailable';

/** Fetch the copy and hand it to the player: through the viewer's save prompt, or a download link. */
export async function saveOfflineCopy(mode: 'viewer' | 'link'): Promise<SaveOutcome> {
  const response = await fetch(new URL(OFFLINE_COPY_FILE, document.baseURI), { cache: 'no-cache' }).catch(() => null);
  if (!response?.ok) return navigator.onLine ? 'unavailable' : 'offline';
  const file = new Blob([await response.blob()], { type: 'text/html' });

  if (mode === 'viewer') {
    const downloads = await fromViewer();
    if (!downloads) return 'unavailable';
    try {
      await downloads.save({ filename: OFFLINE_COPY_FILE, data: file });
      return 'saved';
    } catch (error) {
      return (error as { code?: string }).code === 'declined' ? 'declined' : 'unavailable';
    }
  }

  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = OFFLINE_COPY_FILE;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
  return 'saved';
}

/** Save the copy and tell the player how it went. */
export async function downloadOfflineCopy(mode: 'viewer' | 'link'): Promise<void> {
  const outcome = await saveOfflineCopy(mode);
  if (outcome === 'saved') toast('The offline copy is on its way. Open the file any time, no connection needed.', 'good', 5000);
  else if (outcome === 'offline') toast('You are offline right now. Connect and try again.', 'warn');
  else if (outcome === 'unavailable') toast('The offline copy could not be saved from here.', 'warn');
}
