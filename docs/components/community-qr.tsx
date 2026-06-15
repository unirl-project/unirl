import { withBasePath } from "@/lib/site-paths";

type CommunityQRProps = {
  src: `/${string}`;
  alt: string;
  caption?: string;
};

export function CommunityQR({ src, alt, caption }: CommunityQRProps) {
  return (
    <figure className="not-prose my-6 flex flex-col items-center gap-3 rounded-xl border bg-fd-card p-6 text-center">
      {/* Static export keeps images unoptimized, so a plain img with the
          base-path-aware src is enough and avoids next/image config. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={withBasePath(src)}
        alt={alt}
        className="h-auto w-full max-w-xs rounded-lg border bg-white"
      />
      {caption ? (
        <figcaption className="text-sm text-fd-muted-foreground">{caption}</figcaption>
      ) : null}
    </figure>
  );
}
