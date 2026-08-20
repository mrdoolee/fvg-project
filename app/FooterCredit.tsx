"use client";

import { useEffect, useState } from "react";

const listStyle: React.CSSProperties = {
  fontSize: "13.5px",
  color: "var(--ink-soft)",
  lineHeight: 1.6,
  margin: 0,
  paddingLeft: "18px",
};

export default function FooterCredit() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  return (
    <div className="footer-note">
      © 2026 Designed &amp; Developed by{" "}
      <button
        onClick={() => setOpen(true)}
        style={{
          background: "none",
          border: "none",
          padding: 0,
          font: "inherit",
          color: "var(--ink-soft)",
          textDecoration: "underline",
          cursor: "pointer",
        }}
      >
        두리쌤
      </button>
      . All rights reserved.

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
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
            onClick={(e) => e.stopPropagation()}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "14px",
              maxWidth: "380px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <div className="card" style={{ position: "relative" }}>
              <button
                aria-label="닫기"
                onClick={() => setOpen(false)}
                style={{
                  position: "absolute",
                  top: "16px",
                  right: "16px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "18px",
                  color: "var(--ink-soft)",
                  lineHeight: 1,
                  padding: "4px",
                }}
              >
                ✕
              </button>

              <h1 className="title" style={{ fontSize: "18px" }}>
                ✨ 제작: 두리쌤
              </h1>

              <p className="field-label" style={{ marginTop: "16px" }}>
                📌 이용 조건
              </p>
              <ul style={listStyle}>
                <li>교육 목적으로 자유롭게 사용하실 수 있습니다.</li>
                <li>재배포 시 출처(제작자 표기)를 유지해주세요.</li>
                <li>코드를 임의로 수정한 버전을 다시 배포하지 말아주세요.</li>
                <li>수정이 필요하시면 아래 연락처로 요청해주세요.</li>
              </ul>
            </div>

            <div className="card">
              <p className="field-label" style={{ marginTop: 0 }}>
                📷 문의
              </p>
              <ul style={{ ...listStyle, marginBottom: "10px" }}>
                <li>
                  Instagram:{" "}
                  <a
                    href="https://www.instagram.com/trdoolee"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "var(--primary)" }}
                  >
                    trdoolee
                  </a>
                </li>
                <li>
                  Blog:{" "}
                  <a
                    href="https://blog.naver.com/trdoolee"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "var(--primary)" }}
                  >
                    blog.naver.com/trdoolee
                  </a>
                </li>
              </ul>
              <p style={{ fontSize: "12px", color: "var(--ink-soft)", fontStyle: "italic", margin: 0 }}>
                간단한 질문 위주로 답변드리며, 답변이 늦어질 수 있습니다.
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
