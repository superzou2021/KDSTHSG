"use client";

type EliminationModalProps = {
  open: boolean;
  type: "correct" | "eliminated";
  onNext?: () => void;
  onBack?: () => void;
};

export default function EliminationModal({ open, type, onNext, onBack }: EliminationModalProps) {
  if (!open) return null;

  return (
    <div className="modalMask">
      <section className="resultModal">
        <div className="resultModalGlow" aria-hidden="true" />
        <div className="resultModalBody">
          {type === "correct" ? (
            <>
              <div className="resultModalHeader">
                <span className="resultModalEyebrow">恭喜答对</span>
                <h2 className="resultModalTitle">太棒了！</h2>
              </div>
              <div className="resultModalMain" />
              <div className="resultModalFooter">
                <button className="resultModalButton" type="button" onClick={onNext}>
                  下一题
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="resultModalHeader">
                <span className="resultModalEyebrow">游戏结束</span>
                <h2 className="resultModalTitle">很遗憾被淘汰！</h2>
              </div>
              <div className="resultModalMain">
                <p className="resultModalWaiting">你已经尽力了！</p>
              </div>
              <div className="resultModalFooter">
                <button className="resultModalButton" type="button" onClick={onBack}>
                  返回活动大厅
                </button>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
