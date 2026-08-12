"use client";

import { useState } from "react";

/** GAS Code.gs의 showAbout_() 안내창을 그대로 옮긴 내용 */
export default function AboutButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        aria-label="정보"
        onClick={() => setOpen(true)}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          fontSize: "16px",
          padding: 0,
          color: "var(--ink-soft)",
        }}
      >
        ℹ️
      </button>

      {open ? (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(28,27,41,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            zIndex: 50,
          }}
        >
          <div
            className="card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "360px", width: "100%" }}
          >
            <h1 className="title">🎙️ Flashcard Voice Game</h1>
            <p className="field-label">버전 v1.0 (2026.07)</p>

            <p className="field-label" style={{ marginTop: "16px" }}>
              제작
            </p>
            <p className="subtitle" style={{ marginBottom: "12px" }}>
              두리쌤
            </p>

            <p className="field-label">이용 조건</p>
            <ul style={{ fontSize: "13.5px", color: "var(--ink-soft)", lineHeight: 1.6, margin: "0 0 16px", paddingLeft: "18px" }}>
              <li>교육 목적으로 자유롭게 사용하실 수 있습니다.</li>
              <li>재배포 시 출처(제작자 표기)를 유지해주세요.</li>
              <li>코드를 임의로 수정한 버전을 다시 배포하지 말아주세요.</li>
              <li>수정이 필요하시면 아래 연락처로 요청해주세요.</li>
            </ul>

            <p className="field-label">데이터 안내</p>
            <ul style={{ fontSize: "13.5px", color: "var(--ink-soft)", lineHeight: 1.6, margin: "0 0 16px", paddingLeft: "18px" }}>
              <li>학생 이름·학번·응시 기록은 선생님의 스프레드시트에만 저장됩니다.</li>
              <li>제작자는 이 데이터에 접근하지 않습니다.</li>
            </ul>

            <p className="field-label">문의</p>
            <p className="subtitle" style={{ marginBottom: "20px" }}>
              Instagram: trdoolee
              <br />
              간단한 질문 위주로 답변드리며, 답변이 늦어질 수 있습니다
            </p>

            <button className="btn btn-ghost" onClick={() => setOpen(false)}>
              닫기
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
