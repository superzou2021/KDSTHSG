import Image from "next/image";
import type { CSSProperties } from "react";

type GameBannerIconProps = {
  src: string;
  width: number;
  height: number;
  left: number;
  offsetY: number;
  containerSize?: number;
  showReflection?: boolean;
  reflectionHeight?: number;
  reflectionOverlap?: number;
  className?: string;
};

export default function GameBannerIcon({
  src,
  width,
  height,
  left,
  offsetY,
  containerSize = 104,
  showReflection = true,
  reflectionHeight,
  reflectionOverlap = 0,
  className
}: GameBannerIconProps) {
  const style = {
    "--banner-icon-size": `${containerSize}px`,
    "--banner-icon-height": showReflection ? `${containerSize}px` : `${offsetY + height}px`,
    "--icon-width": `${width}px`,
    "--icon-height": `${height}px`,
    "--icon-left": `${left}px`,
    "--icon-offset-y": `${offsetY}px`,
    "--reflection-height": `${reflectionHeight ?? height}px`,
    "--reflection-overlap": `${reflectionOverlap}px`
  } as CSSProperties;

  return (
    <div className={["gameBannerIcon", className].filter(Boolean).join(" ")} style={style} aria-hidden="true">
      <div className="gameBannerIconMain">
        <Image src={src} alt="" width={width} height={height} />
      </div>
      {showReflection && (
        <div className="gameBannerIconReflection">
          <Image src={src} alt="" width={width} height={height} aria-hidden="true" />
        </div>
      )}
    </div>
  );
}
