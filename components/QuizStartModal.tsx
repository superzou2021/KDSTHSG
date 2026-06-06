"use client";

type QuizStartModalProps = {
  open: boolean;
  onStart: () => void;
};

export default function QuizStartModal({ open, onStart }: QuizStartModalProps) {
  if (!open) return null;

  return (
    <div className="modalMask">
      <section className="resultModal">
        <div className="resultModalGlow" aria-hidden="true" />
        <div className="resultModalBody">
          <div className="resultModalHeader">
            <span className="resultModalEyebrow">游戏准备</span>
            <h2 className="resultModalTitle">Sector Quiz</h2>
          </div>

          <div className="resultModalMain">
            <p className="resultModalWaiting">共5个板块，每板块2题</p>
            <p className="resultModalWaiting">每板块限时1分钟</p>
          </div>

          <div className="resultModalFooter">
            <button className="resultModalButton" type="button" onClick={onStart}>
              开始答题
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
