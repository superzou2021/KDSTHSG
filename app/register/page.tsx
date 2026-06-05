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
        <div style={{
          minHeight: "100vh",
          background: "linear-gradient(180deg, #00523E 0%, #00B88B 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}>
          <div style={{ textAlign: "center" }}>
            <div style={{
              width: "100px",
              height: "33px",
              background: "rgba(255,255,255,0.2)",
              borderRadius: "4px",
              marginBottom: "20px"
            }} />
            <p style={{ color: "white", fontSize: "16px" }}>欢迎回来，正在恢复您的参赛信息...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="入场登记" eyebrow="REGISTER" hideLeftButton rightSlot={<div />} hideHeader>
      <div style={{
        width: "100%",
        height: "100vh",
        position: "relative",
        background: "linear-gradient(180deg, #00523E 0%, #00B88B 100%)",
        overflow: "hidden"
      }}>
        {/* 状态栏区域 */}
        <div style={{
          width: "100%",
          height: "44px",
          position: "absolute",
          left: "0",
          top: "0",
          backdropFilter: "blur(10px)"
        }}>
          <div style={{ width: "54px", height: "21px", left: "21px", top: "7px", position: "absolute" }}>
            <div style={{ width: "54px", left: "0px", top: "6px", position: "absolute", textAlign: "center", color: "white", fontSize: "15px", fontFamily: "Roboto", fontWeight: 500, lineHeight: "20px", wordWrap: "break-word" }}>9:41</div>
          </div>
          <div style={{ width: "22px", height: "11px", left: "326px", top: "17px", position: "absolute", opacity: 0.35, borderRadius: "2.67px", border: "1px white solid" }} />
          <div style={{ width: "18px", height: "7px", left: "328px", top: "19px", position: "absolute", background: "white", borderRadius: "1.33px" }} />
          <div style={{ width: "1.33px", height: "4px", left: "349.33px", top: "21px", position: "absolute", opacity: 0.40, background: "white" }} />
        </div>

        {/* Logo */}
        <img 
          src="https://placehold.co/100x33" 
          style={{ width: "100px", height: "33px", left: "37px", top: "108px", position: "absolute" }} 
          alt="Logo"
        />

        {/* 姓名标签 */}
        <div style={{ left: "37px", top: "160px", position: "absolute", color: "white", fontSize: "14px", fontFamily: "Source Han Sans CN", fontWeight: 500, lineHeight: "20px", wordWrap: "break-word" }}>姓名</div>
        {/* 姓名输入框 */}
        <input
          value={form.name}
          maxLength={16}
          placeholder=""
          onChange={(event) => updateField("name", event.target.value)}
          style={{
            width: "301px",
            height: "48px",
            left: "37px",
            top: "186px",
            position: "absolute",
            background: "rgba(255, 255, 255, 0.10)",
            borderRadius: "2px",
            border: "0.50px white solid",
            color: "white",
            fontSize: "14px",
            fontFamily: "Source Han Sans CN",
            fontWeight: 400,
            lineHeight: "20px",
            padding: "0 12px",
            outline: "none"
          }}
        />

        {/* 手机号标签 */}
        <div style={{ left: "37px", top: "250px", position: "absolute", color: "white", fontSize: "14px", fontFamily: "Source Han Sans CN", fontWeight: 500, lineHeight: "20px", wordWrap: "break-word" }}>手机号</div>
        {/* 手机号输入框 */}
        <input
          value={form.phone}
          inputMode="tel"
          maxLength={11}
          placeholder=""
          onChange={(event) => updateField("phone", event.target.value)}
          style={{
            width: "301px",
            height: "48px",
            left: "37px",
            top: "276px",
            position: "absolute",
            background: "rgba(255, 255, 255, 0.10)",
            borderRadius: "2px",
            border: "0.50px white solid",
            color: "white",
            fontSize: "14px",
            fontFamily: "Source Han Sans CN",
            fontWeight: 400,
            lineHeight: "20px",
            padding: "0 12px",
            outline: "none"
          }}
        />

        {/* Office标签 */}
        <div style={{ left: "37px", top: "340px", position: "absolute", color: "white", fontSize: "14px", fontFamily: "Source Han Sans CN", fontWeight: 500, lineHeight: "20px", wordWrap: "break-word" }}>Office</div>
        {/* Office下拉框 */}
        <div style={{ position: "relative" }} ref={officeDropdownRef}>
          <div style={{
            width: "301px",
            height: "48px",
            left: "37px",
            top: "366px",
            position: "absolute",
            background: "rgba(255, 255, 255, 0.10)",
            borderRadius: "2px",
            border: "0.50px white solid"
          }}>
            <input
              value={officeQuery}
              placeholder=""
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
                height: "100%",
                background: "transparent",
                border: "none",
                color: officeQuery ? "white" : "rgba(255,255,255,0.4)",
                fontSize: "14px",
                fontFamily: "Source Han Sans CN",
                fontWeight: 400,
                lineHeight: "20px",
                padding: "0 40px 0 12px",
                outline: "none",
                cursor: "pointer"
              }}
            />
            {/* 下拉箭头 */}
            <div style={{
              width: "24px",
              height: "24px",
              left: "300px",
              top: "378px",
              position: "absolute",
              overflow: "hidden"
            }}>
              <div style={{ width: "6px", height: "4px", left: "9px", top: "10px", position: "absolute", outline: "1.50px white solid", outlineOffset: "-0.75px" }} />
            </div>
          </div>
          {officeOpen && (
            <div style={{
              position: "absolute",
              top: "366px",
              left: "37px",
              width: "301px",
              marginTop: "52px",
              background: "rgba(0, 61, 30, 0.95)",
              border: "0.5px white solid",
              borderRadius: "2px",
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
                      padding: "12px",
                      textAlign: "left",
                      background: "transparent",
                      border: "none",
                      color: "white",
                      fontSize: "14px",
                      fontFamily: "Source Han Sans CN",
                      fontWeight: 400,
                      cursor: "pointer"
                    }}
                  >
                    {office}
                  </button>
                ))
              ) : (
                <div style={{ padding: "12px", color: "rgba(255,255,255,0.5)" }}>
                  未找到匹配 Office
                </div>
              )}
            </div>
          )}
        </div>

        {/* 消息提示 */}
        {message && (
          <div style={{
            position: "absolute",
            left: "37px",
            top: "410px",
            color: "white",
            fontSize: "14px",
            fontFamily: "Source Han Sans CN",
            fontWeight: 400
          }}>
            {message}
          </div>
        )}

        {/* 确认按钮 */}
        <button
          type="submit"
          onClick={handleSubmit}
          disabled={isSubmitting}
          style={{
            width: "301px",
            height: "48px",
            left: "37px",
            top: "446px",
            position: "absolute",
            background: "#14A33A",
            borderRadius: "2px",
            border: "none",
            color: "white",
            fontSize: "16px",
            fontFamily: "Source Han Sans CN",
            fontWeight: 400,
            cursor: isSubmitting ? "not-allowed" : "pointer",
            opacity: isSubmitting ? 0.7 : 1
          }}
        >
          {isSubmitting ? "处理中..." : "确认"}
        </button>

        {/* 底部装饰文字 */}
        <img 
          src="https://placehold.co/197x129" 
          style={{ width: "197px", height: "129px", left: "89px", top: "578px", position: "absolute" }} 
          alt="Define the game"
        />

        {/* 底部指示条 */}
        <div style={{ width: "144px", height: "5px", left: "115px", top: "791px", position: "absolute", opacity: 0.70, background: "white", borderRadius: "7px" }} />
      </div>
    </Layout>
  );
}