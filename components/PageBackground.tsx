import Image from "next/image";
import { PAGE_BG_SRC } from "@/lib/assets";

export default function PageBackground() {
  return (
    <div className="pageBg" aria-hidden="true">
      <Image
        className="pageBgImage"
        src={PAGE_BG_SRC}
        alt=""
        fill
        priority
        sizes="100vw"
      />
    </div>
  );
}
