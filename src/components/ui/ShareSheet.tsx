'use client';

import { useState } from 'react';
import { facebookShareUrl, xShareUrl, zaloShareUrl } from '@/lib/shareLinks';
import { useUi } from '@/state/ui';

interface Props {
  /** site-relative path, e.g. /c/<slug>?d=... */
  path: string;
  /** OG image path to download as PNG (optional) */
  imagePath?: string;
  title: string;
  text: string;
  label?: string;
}

/** Inline share section: copy link, Web Share API, Facebook / Zalo / X, download the OG image. */
export function ShareSheet({ path, imagePath, title, text, label = 'Chia sẻ' }: Props) {
  const [open, setOpen] = useState(false);
  const toast = useUi((s) => s.toast);
  const absolute = () => new URL(path, window.location.origin).toString();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(absolute());
      toast({ tone: 'info', text: 'Đã copy link, dán đi khoe nào.' });
    } catch {
      toast({ tone: 'error', text: 'Không copy được, bạn copy tay từ thanh địa chỉ nhé.' });
    }
  };
  const nativeShare = async () => {
    try {
      await navigator.share({ title, text, url: absolute() });
    } catch {
      /* user cancelled */
    }
  };
  const download = async () => {
    if (!imagePath) return;
    try {
      const res = await fetch(imagePath);
      if (!res.ok) throw new Error(String(res.status));
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement('a');
      a.href = url;
      a.download = 'pho-xin-viec.png';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch {
      toast({ tone: 'error', text: 'Mạng lag, chưa tải được ảnh. Thử lại nhé.' });
    }
  };

  return (
    <div className="share-sheet">
      <button className="btn small" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        {label}
      </button>
      {open && (
        <div className="share-pop card" role="group" aria-label="Chia sẻ">
          <button className="btn small" onClick={copy}>Copy link</button>
          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <button className="btn small" onClick={nativeShare}>Chia sẻ qua...</button>
          )}
          <a className="btn small" href={facebookShareUrl(absolute())} target="_blank" rel="noopener noreferrer">Facebook</a>
          <a className="btn small" href={zaloShareUrl(absolute())} target="_blank" rel="noopener noreferrer">Zalo</a>
          <a className="btn small" href={xShareUrl(absolute(), text)} target="_blank" rel="noopener noreferrer">X</a>
          {imagePath && <button className="btn small" onClick={download}>Tải ảnh</button>}
        </div>
      )}
    </div>
  );
}
