"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Layout from "@/components/Layout";
import PageBackground from "@/components/PageBackground";
import { OFFICES } from "@/lib/constants";
import { findPlayerByPhone, registerPlayer, restoreCurrentPlayerFromLocal, saveCurrentPlayer } from "@/lib/storage";

const DEFAULT_TEAM = "Alpha";

function formatPhoneDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  return `${digits.slice(0, 3)} ${digits.slice(3, 7)} ${digits.slice(7)}`;
}

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
        <section className="registerPage registerPage--checking">
          <PageBackground />
          <div className="registerPageContent">
            <Image
              className="registerLogo"
              src="/image/source/logo-hongshan.png"
              alt="HONGSHAN 红杉中国"
              width={100}
              height={33}
              priority
            />
            <p className="restoreMessage">欢迎回来，正在恢复您的参赛信息...</p>
          </div>
        </section>
      </Layout>
    );
  }

  return (
    <Layout title="入场登记" eyebrow="REGISTER" hideLeftButton rightSlot={<div />} hideHeader>
      <section className="registerPage">
        <PageBackground />

        <div className="registerPageContent">
          <Image
            className="registerLogo"
            src="/image/source/logo-hongshan.png"
            alt="HONGSHAN 红杉中国"
            width={100}
            height={33}
            priority
          />

          <form className="registerForm" onSubmit={handleSubmit}>
            <label className="registerField">
              <span>姓名</span>
              <input
                value={form.name}
                maxLength={16}
                placeholder="请输入姓名"
                onChange={(event) => updateField("name", event.target.value)}
              />
            </label>

            <label className="registerField">
              <span>手机号</span>
              <input
                className="registerPhoneInput"
                value={formatPhoneDisplay(form.phone)}
                inputMode="tel"
                maxLength={13}
                placeholder="请输入手机号"
                onChange={(event) => updateField("phone", event.target.value)}
              />
            </label>

            <div className="registerField registerField--office" ref={officeDropdownRef}>
              <span>Office</span>
              <div className="registerSelectWrap">
                <input
                  value={officeQuery}
                  placeholder="请选择Office"
                  autoComplete="off"
                  onFocus={() => setOfficeOpen(true)}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    setOfficeOpen((open) => !open);
                  }}
                  onChange={(event) => {
                    const value = event.target.value;
                    setOfficeQuery(value);
                    updateField("office", OFFICES.includes(value) ? value : "");
                    setOfficeOpen(true);
                  }}
                />
                <svg className="registerChevron" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {officeOpen && (
                  <div className="officeDropdown">
                    {filteredOffices.length > 0 ? (
                      filteredOffices.map((office) => (
                        <button key={office} type="button" onClick={() => selectOffice(office)}>
                          {office}
                        </button>
                      ))
                    ) : (
                      <em>未找到匹配 Office</em>
                    )}
                  </div>
                )}
              </div>
            </div>

            {message && <p className="registerMessage">{message}</p>}

            <button className="registerSubmit" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "处理中..." : "确认"}
            </button>
          </form>

          <Image
            className="registerHero"
            src="/image/source/define-the-game.png"
            alt="DEFINE THE GAME"
            width={197}
            height={129}
          />
        </div>
      </section>
    </Layout>
  );
}
