"use client";

import Image from "next/image";

type WaitingModalProps = {
  open: boolean;
  gameName: string;
};

export default function WaitingModal({ open, gameName }: WaitingModalProps) {
  if (!open) return null;

  const showTitleImage = /bingo/i.test(gameName);

  return (
    <div className="modalMask">
      <section className="resultModal">
        <div className="resultModalGlow" aria-hidden="true" />
        <div className="resultModalBody">
          <div className="resultModalHeader">
            <span className="resultModalEyebrow">BINGO SUBMITTED</span>
            {showTitleImage ? (
              <Image
                alt={gameName}
                className="resultModalTitleImage"
                height={20}
                src="/image/source/bingo/bingo-title.png"
                width={116}
              />
            ) : (
              <h2 className="resultModalTitle">{gameName}</h2>
            )}
          </div>

          <div className="resultModalMain">
            <p className="resultModalWaiting">等待Boss发言，判分即将开始...</p>
          </div>
        </div>
      </section>
    </div>
  );
}
