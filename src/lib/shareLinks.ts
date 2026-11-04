/** Share URLs for the social networks the audience uses. All values are URL-encoded; nothing is interpolated unescaped. */
export function facebookShareUrl(url: string): string {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
}

export function xShareUrl(url: string, text: string): string {
  return `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
}

/** Zalo share plugin endpoint (social-plugin popup; Zalo documents no plain share URL, so verify before launch). */
export function zaloShareUrl(url: string): string {
  return `https://sp.zalo.me/plugins/share?dev=1&url=${encodeURIComponent(url)}`;
}
