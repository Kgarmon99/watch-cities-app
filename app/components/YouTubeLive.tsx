'use client';

interface YouTubeLiveProps {
  src: string;
  title: string;
}

export default function YouTubeLive({ src, title }: YouTubeLiveProps) {
  return (
    <iframe
      src={src}
      title={title}
      className="aspect-video h-full w-full border-0 bg-black"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowFullScreen
      referrerPolicy="strict-origin-when-cross-origin"
    />
  );
}
