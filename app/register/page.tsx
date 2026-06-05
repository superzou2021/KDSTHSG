"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Layout from "@/components/Layout";
import { OFFICES } from "@/lib/constants";
import { findPlayerByPhone, registerPlayer, restoreCurrentPlayerFromLocal, saveCurrentPlayer } from "@/lib/storage";

const DEFAULT_TEAM = "Alpha";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", phone: "", office: "", team: DEFAULT_TEAM });
  const [message, setMessage] = useState("");
  const [officeQuery, setOfficeQuery] = useState("");
  const [officeOpen, setOfficeOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checking, setChecking] = useState(true);
  const officeDropdownRef = useRef<HTMLDivElement>(null);

  const filteredOffices = useMemo(() => {
    const query = officeQuery.trim().toLowerCase();
    if (!query || form.office === officeQuery) return OFFICES;
    return OFFICES.filter((office) => office.toLowerCase().includes(query));
  }, [officeQuery, form.office]);

  useEffect(() => {
    let active = true;
    async function check() {
      try {
        const player = await Promise.race([
          restoreCurrentPlayerFromLocal(),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000))
        ]);
        if (!active) return;
        if (player) {
          router.replace("/lobby");
          return;
        }
      } catch {
        // Continue to registration form when restore fails.
      } finally {
        if (active) setChecking(false);
      }
    }
    check();
    return () => { active = false; };
  }, [router]);

  function updateField(field: keyof typeof form, value: string) {
    let processedValue = value;
    if (field === "phone") {
      processedValue = value.replace(/[^0-9]/g, "").slice(0, 11);
    }
    setForm((current) => ({ ...current, [field]: processedValue }));
  }

  function selectOffice(office: string) {
    updateField("office", office);
    setOfficeQuery(office);
    setOfficeOpen(false);
  }

  // 点击外部关闭下拉菜单
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (officeDropdownRef.current && !officeDropdownRef.current.contains(event.target as Node)) {
        setOfficeOpen(false);
      }
    }
    
    if (officeOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [officeOpen]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setMessage("");
    setIsSubmitting(true);

    try {
      const existingPlayer = await findPlayerByPhone(form.phone);
      if (existingPlayer) {
        saveCurrentPlayer(existingPlayer);
        setMessage("欢迎回来，正在恢复您的参赛信息...");
        router.replace("/lobby");
        return;
      }

      const result = await registerPlayer({ ...form, team: DEFAULT_TEAM });
      setMessage(result.reused ? "欢迎回来，正在恢复您的参赛信息..." : "注册成功，正在进入活动大厅...");
      router.replace("/lobby");
      window.setTimeout(() => {
        if (window.location.pathname !== "/lobby") {
          window.location.assign("/lobby");
        }
      }, 300);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "注册失败");
      setIsSubmitting(false);
    }
  }

  if (checking) {
    return (
      <Layout title="入场登记" eyebrow="REGISTER" hideLeftButton rightSlot={<div />} hideHeader>
        <section className="registerShell">
          <div className="registerCard checkingCard">
            <div className="hongshanLogo">
              <span>HS</span>
              <b>HongShan</b>
            </div>
            <p className="restoreMessage">欢迎回来，正在恢复您的参赛信息...</p>
          </div>
        </section>
      </Layout>
    );
  }

  return (
    <Layout title="入场登记" eyebrow="REGISTER" hideLeftButton rightSlot={<div />} hideHeader>
      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #005a2c 0%, #003d1e 100%)",
        padding: "80px 20px 40px",
        position: "relative",
        overflow: "hidden"
      }}>
        {/* 装饰性线条 */}
        <div style={{
          position: "absolute",
          top: "60px",
          left: "0",
          right: "0",
          height: "2px",
          background: "linear-gradient(90deg, transparent, rgba(64,216,138,0.5), transparent)"
        }} />
        <div style={{
          position: "absolute",
          top: "180px",
          left: "0",
          right: "0",
          height: "1px",
          background: "linear-gradient(90deg, transparent, rgba(64,216,138,0.3), transparent)"
        }} />

        {/* Logo */}
        <div style={{ marginBottom: "40px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{
              fontSize: "24px",
              fontWeight: "bold",
              color: "white",
              letterSpacing: "2px"
            }}>HONGSHAN</span>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d="M8 8h16v8h-8v8H8V8z" fill="rgba(64,216,138,0.8)" />
              <path d="M12 4h16v8h-8v8h-8V4z" fill="rgba(64,216,138,0.5)" />
              <path d="M16 0h16v8h-8v8h-8V0z" fill="rgba(64,216,138,0.3)" />
            </svg>
          </div>
          <div style={{
            fontSize: "14px",
            color: "rgba(255,255,255,0.7)",
            marginTop: "4px"
          }}>红杉中国</div>
        </div>

        {/* 表单 */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* 姓名 */}
          <div>
            <label style={{
              display: "block",
              color: "white",
              fontSize: "18px",
              fontWeight: "500",
              marginBottom: "12px"
            }}>姓名</label>
            <input
              value={form.name}
              maxLength={16}
              placeholder="请输入姓名"
              onChange={(event) => updateField("name", event.target.value)}
              style={{
                width: "100%",
                padding: "16px 16px",
                fontSize: "18px",
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.3)",
                borderRadius: "4px",
                color: "white",
                outline: "none"
              }}
            />
          </div>

          {/* 手机号 */}
          <div>
            <label style={{
              display: "block",
              color: "white",
              fontSize: "18px",
              fontWeight: "500",
              marginBottom: "12px"
            }}>手机号</label>
            <input
              value={form.phone}
              inputMode="tel"
              maxLength={11}
              placeholder="请输入手机号"
              onChange={(event) => updateField("phone", event.target.value)}
              style={{
                width: "100%",
                padding: "16px 16px",
                fontSize: "18px",
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.3)",
                borderRadius: "4px",
                color: "white",
                outline: "none"
              }}
            />
          </div>

          {/* Office */}
          <div style={{ position: "relative" }} ref={officeDropdownRef}>
            <label style={{
              display: "block",
              color: "white",
              fontSize: "18px",
              fontWeight: "500",
              marginBottom: "12px"
            }}>Office</label>
            <div style={{ position: "relative" }}>
              <input
                value={officeQuery}
                placeholder="请选择Office"
                autoComplete="off"
                onFocus={() => setOfficeOpen(!officeOpen)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  setOfficeOpen(!officeOpen);
                }}
                onChange={(event) => {
                  const value = event.target.value;
                  setOfficeQuery(value);
                  updateField("office", OFFICES.includes(value) ? value : "");
                  setOfficeOpen(true);
                }}
                style={{
                  width: "100%",
                  padding: "16px 16px",
                  fontSize: "18px",
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.3)",
                  borderRadius: "4px",
                  color: officeQuery ? "white" : "rgba(255,255,255,0.5)",
                  outline: "none",
                  appearance: "none",
                  cursor: "pointer"
                }}
              />
              <span style={{
                position: "absolute",
                right: "16px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "white",
                fontSize: "14px",
                pointerEvents: "none"
              }}>▼</span>
              {officeOpen && (
                <div style={{
                  position: "absolute",
                  top: "100%",
                  left: "0",
                  right: "0",
                  marginTop: "4px",
                  background: "#003d1e",
                  border: "1px solid rgba(255,255,255,0.3)",
                  borderRadius: "4px",
                  maxHeight: "200px",
                  overflowY: "auto",
                  zIndex: "100"
                }}>
                  {filteredOffices.length > 0 ? (
                    filteredOffices.map((office) => (
                      <button
                        key={office}
                        type="button"
                        onClick={() => selectOffice(office)}
                        style={{
                          width: "100%",
                          padding: "12px 16px",
                          textAlign: "left",
                          background: "transparent",
                          border: "none",
                          color: "white",
                          fontSize: "16px",
                          cursor: "pointer"
                        }}
                      >
                        {office}
                      </button>
                    ))
                  ) : (
                    <div style={{ padding: "12px 16px", color: "rgba(255,255,255,0.5)" }}>
                      未找到匹配 Office
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {message && (
            <p style={{ color: "rgba(64,216,138,1)", fontSize: "14px", textAlign: "center" }}>
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              width: "100%",
              padding: "18px",
              marginTop: "16px",
              background: "linear-gradient(90deg, #00b86a, #40d88a)",
              border: "none",
              borderRadius: "4px",
              color: "white",
              fontSize: "20px",
              fontWeight: "500",
              cursor: isSubmitting ? "not-allowed" : "pointer",
              opacity: isSubmitting ? "0.7" : "1"
            }}
          >
            {isSubmitting ? "处理中..." : "确认"}
          </button>
        </form>

        {/* DEFINE THE GAME */}
        <div style={{
          marginTop: "60px",
          textAlign: "center"
        }}>
          <div style={{
            fontSize: "64px",
            fontWeight: "bold",
            lineHeight: "1.1",
            background: "linear-gradient(180deg, #40d88a 0%, #008a4a 50%, #005a2c 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            textShadow: "0 4px 8px rgba(0,0,0,0.3)",
            letterSpacing: "2px"
          }}>
            DEFINE<br />THE<br />GAME
          </div>
        </div>
      </div>
    </Layout>
  );
}