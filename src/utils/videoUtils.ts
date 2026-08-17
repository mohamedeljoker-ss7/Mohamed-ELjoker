/**
 * Video Utilities for parsing, extracting YouTube IDs, and generating standard Embed URLs.
 * Strictly adheres to in-platform embedded playback without any external popups.
 */

export interface ParsedVideoInfo {
  type: 'youtube' | 'video' | 'drive' | 'vimeo' | 'iframe' | 'empty' | 'unsupported';
  embedUrl: string;
  videoId?: string;
  rawUrl?: string;
  isDirectFile?: boolean;
}

/**
 * Extracts a valid 11-character YouTube video ID from various YouTube URL formats.
 * Supports:
 * - https://www.youtube.com/watch?v=VIDEO_ID (with any query parameters)
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/shorts/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://www.youtube-nocookie.com/embed/VIDEO_ID
 * - https://m.youtube.com/watch?v=VIDEO_ID
 * - https://www.youtube.com/v/VIDEO_ID
 * - https://www.youtube.com/live/VIDEO_ID
 * - Raw 11-character video ID (e.g. dQw4w9WgXcQ)
 * - HTML <iframe> or src attribute snippets
 */
export function extractYouTubeVideoId(input?: string | null): string | null {
  if (!input || typeof input !== 'string') return null;
  let str = input.trim();
  if (!str || str === '#') return null;

  // Extract from HTML iframe or src attribute if pasted
  const srcMatch = str.match(/src=["']([^"']+)["']/i) || str.match(/href=["']([^"']+)["']/i);
  if (srcMatch && srcMatch[1]) {
    str = srcMatch[1].trim();
  }

  // Remove surrounding quotes or angle brackets
  str = str.replace(/^["'<]+|["'>]+$/g, '').trim();

  // If input is strictly an 11-character YouTube video ID (alphanumeric, -, _)
  if (/^[a-zA-Z0-9_-]{11}$/.test(str)) {
    return str;
  }

  // 1. Check youtu.be/VIDEO_ID
  const youtuBeMatch = str.match(/(?:youtu\.be\/|youtube\.com\/(?:embed|v|shorts|live)\/)([a-zA-Z0-9_-]{11})/i);
  if (youtuBeMatch && youtuBeMatch[1]) {
    return youtuBeMatch[1];
  }

  // 2. Check ?v=VIDEO_ID or &v=VIDEO_ID
  const watchMatch = str.match(/[?&]v=([a-zA-Z0-9_-]{11})/i);
  if (watchMatch && watchMatch[1]) {
    return watchMatch[1];
  }

  // 3. Check /shorts/VIDEO_ID
  const shortsMatch = str.match(/\/shorts\/([a-zA-Z0-9_-]{11})/i);
  if (shortsMatch && shortsMatch[1]) {
    return shortsMatch[1];
  }

  // 4. Check /embed/VIDEO_ID or /v/VIDEO_ID
  const embedMatch = str.match(/\/(?:embed|v|vi|e)\/([a-zA-Z0-9_-]{11})/i);
  if (embedMatch && embedMatch[1]) {
    return embedMatch[1];
  }

  // 5. Comprehensive Regex pattern
  const generalMatch = str.match(/(?:https?:\/\/)?(?:www\.|m\.|music\.)?(?:youtube\.com\/(?:watch\?.*v=|embed\/|v\/|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
  if (generalMatch && generalMatch[1]) {
    return generalMatch[1];
  }

  return null;
}

/**
 * Builds a clean, standard YouTube Embed URL using supported parameters only.
 * - playsinline=1
 * - controls=1
 * - rel=0
 * - enablejsapi=1
 * Does NOT use deprecated parameters (modestbranding, showinfo, autohide).
 */
export function buildYouTubeEmbedUrl(videoId: string): string {
  const originParam = typeof window !== 'undefined' && window.location?.origin
    ? `&origin=${encodeURIComponent(window.location.origin)}`
    : '';

  return `https://www.youtube.com/embed/${videoId}?playsinline=1&controls=1&rel=0&enablejsapi=1${originParam}`;
}

/**
 * Parses any video URL or identifier into a structured, platform-ready embedded representation.
 */
export function parseVideoSource(url?: string | null): ParsedVideoInfo {
  if (!url || typeof url !== 'string' || url.trim() === '' || url === '#') {
    return { type: 'empty', embedUrl: '', rawUrl: url || '' };
  }

  let clean = url.trim();

  // Extract from HTML iframe or src attribute
  const srcMatch = clean.match(/src=["']([^"']+)["']/i) || clean.match(/href=["']([^"']+)["']/i);
  if (srcMatch && srcMatch[1]) {
    clean = srcMatch[1].trim();
  }

  // Upgrade http:// to https://
  if (clean.toLowerCase().startsWith('http://') && !clean.includes('localhost') && !clean.includes('127.0.0.1')) {
    clean = 'https://' + clean.substring(7);
  }

  // Check YouTube first
  const ytVideoId = extractYouTubeVideoId(clean);
  if (ytVideoId) {
    return {
      type: 'youtube',
      videoId: ytVideoId,
      embedUrl: buildYouTubeEmbedUrl(ytVideoId),
      rawUrl: clean
    };
  }

  const cleanLower = clean.toLowerCase();

  // Vimeo
  if (cleanLower.includes('vimeo.com')) {
    const match = clean.match(/vimeo\.com\/(?:video\/|channels\/[\w-]+\/|groups\/[\w-]+\/videos\/)?(\d+)/i);
    if (match && match[1]) {
      return {
        type: 'vimeo',
        videoId: match[1],
        embedUrl: `https://player.vimeo.com/video/${match[1]}?playsinline=1`,
        rawUrl: clean
      };
    }
  }

  // Google Drive
  if (cleanLower.includes('drive.google.com')) {
    const match = clean.match(/\/(?:file\/d\/|open\?id=)([a-zA-Z0-9_-]+)/i) || clean.match(/id=([a-zA-Z0-9_-]+)/i);
    if (match && match[1]) {
      return {
        type: 'drive',
        videoId: match[1],
        embedUrl: `https://drive.google.com/file/d/${match[1]}/preview`,
        rawUrl: clean
      };
    }
    if (cleanLower.includes('/view') || cleanLower.includes('/edit') || cleanLower.includes('/preview')) {
      return {
        type: 'drive',
        embedUrl: clean.replace(/\/(?:view|edit|preview).*/i, '/preview'),
        rawUrl: clean
      };
    }
  }

  // Bunny Stream / CDN
  if (
    cleanLower.includes('mediadelivery.net') ||
    cleanLower.includes('bunnycdn.com') ||
    cleanLower.includes('b-cdn.net') ||
    cleanLower.includes('bunny.net')
  ) {
    let embed = clean;
    if (clean.includes('/play/')) {
      embed = clean.replace('/play/', '/embed/');
    }
    return { type: 'iframe', embedUrl: embed, rawUrl: clean };
  }

  // Loom
  if (cleanLower.includes('loom.com')) {
    if (clean.includes('/share/')) {
      return { type: 'iframe', embedUrl: clean.replace('/share/', '/embed/'), rawUrl: clean };
    }
    return { type: 'iframe', embedUrl: clean, rawUrl: clean };
  }

  // Wistia
  if (cleanLower.includes('wistia.com') || cleanLower.includes('wistia.net')) {
    if (clean.includes('medias/')) {
      const id = clean.split('medias/')[1]?.split('?')[0] || '';
      if (id) return { type: 'iframe', embedUrl: `https://fast.wistia.net/embed/iframe/${id}`, videoId: id, rawUrl: clean };
    }
    return { type: 'iframe', embedUrl: clean, rawUrl: clean };
  }

  // Dailymotion
  if (cleanLower.includes('dailymotion.com') || cleanLower.includes('dai.ly')) {
    const match = clean.match(/(?:dailymotion\.com\/video\/|dai\.ly\/)([a-zA-Z0-9]+)/i);
    if (match && match[1]) {
      return { type: 'iframe', embedUrl: `https://www.dailymotion.com/embed/video/${match[1]}`, videoId: match[1], rawUrl: clean };
    }
  }

  // Streamable
  if (cleanLower.includes('streamable.com')) {
    const stMatch = clean.match(/streamable\.com\/([a-zA-Z0-9]+)/i);
    if (stMatch && stMatch[1]) {
      return { type: 'iframe', embedUrl: `https://streamable.com/e/${stMatch[1]}`, videoId: stMatch[1], rawUrl: clean };
    }
  }

  // Direct video file, Blob, Firestore Chunks, IndexedDB, Firebase Storage
  if (
    cleanLower.startsWith('firestore://') ||
    cleanLower.startsWith('indexeddb://') ||
    cleanLower.startsWith('blob:') ||
    cleanLower.startsWith('data:') ||
    cleanLower.includes('firebasestorage.googleapis.com') ||
    cleanLower.includes('firebasestorage.app') ||
    cleanLower.includes('storage.googleapis.com') ||
    cleanLower.includes('catbox.moe') ||
    cleanLower.includes('litterbox.catbox.moe') ||
    cleanLower.includes('tmpfiles.org') ||
    cleanLower.includes('pixeldrain.com') ||
    /\.(mp4|webm|ogg|mov|mkv|m3u8|avi|3gp|m4v)(\?.*)?$/i.test(clean)
  ) {
    return { type: 'video', embedUrl: clean, rawUrl: clean, isDirectFile: true };
  }

  // Generic embed or iframe
  if (
    cleanLower.includes('/embed/') ||
    cleanLower.includes('/iframe/') ||
    cleanLower.includes('player.') ||
    cleanLower.includes('embed.') ||
    cleanLower.includes('vdocipher.com') ||
    cleanLower.includes('publit.io')
  ) {
    return { type: 'iframe', embedUrl: clean, rawUrl: clean };
  }

  // Generic direct HTTP stream
  if (cleanLower.startsWith('http://') || cleanLower.startsWith('https://')) {
    return { type: 'video', embedUrl: clean, rawUrl: clean };
  }

  return { type: 'unsupported', embedUrl: '', rawUrl: clean };
}
