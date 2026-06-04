"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { OFFICES, TEAMS } from "@/lib/constants";
import { findPlayerByPhone, registerPlayer, restoreCurrentPlayerFromLocal, saveCurrentPlayer } from "@/lib/storage";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", phone: "", office: "北京", team: "Alpha" });
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checking, setChecking] = useState(true);

  // 页面加载时检查本地登录状态
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
          // 已注册用户，自动跳转大厅
          router.replace("/lobby");
          return;
        }
      } catch {
        // 检查失败，继续显示注册表单
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
      processedValue = value.replace(/[^0-9]/g, "");
      if (processedValue.length > 11) {
        processedValue = processedValue.slice(0, 11);
      }
    }
    setForm((current) => ({ ...current, [field]: processedValue }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setMessage("");
    setIsSubmitting(true);

    try {
      // 先尝试按手机号查找已注册用户
      const existingPlayer = await findPlayerByPhone(form.phone);
      if (existingPlayer) {
        saveCurrentPlayer(existingPlayer);
        setMessage("欢迎回来，正在进入大厅...");
        router.replace("/lobby");
        return;
      }

      // 手机号不存在，正常注册
      const result = await registerPlayer(form);
      setMessage(result.reused ? "该手机号已参与，已加载历史身份。" : "注册成功，正在进入大厅。");
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

  // 检查期间显示 loading，不要闪注册表单
  if (checking) {
    return (
      <Layout title="入场登记" eyebrow="REGISTER" hideLeftButton={true} rightSlot={<div></div>}>
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
          <p style={{ color: 'var(--muted)', fontSize: '16px' }}>正在检查登录状态...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="入场登记" eyebrow="REGISTER" hideLeftButton={true} rightSlot={<div></div>}>
      <form className="demoForm" onSubmit={handleSubmit}>
        <label>
          <span>姓名</span>
          <input value={form.name} maxLength={16} onChange={(event) => updateField("name", event.target.value)} />
        </label>
        <label>
          <span>手机号</span>
          <input value={form.phone} inputMode="tel" maxLength={11} onChange={(event) => updateField("phone", event.target.value)} />
        </label>
        <label>
          <span>Office</span>
          <select value={form.office} onChange={(event) => updateField("office", event.target.value)}>
            {OFFICES.map((office) => <option key={office}>{office}</option>)}
          </select>
        </label>
        <label>
          <span>Team</span>
          <select value={form.team} onChange={(event) => updateField("team", event.target.value)}>
            {TEAMS.map((team) => <option key={team}>{team}</option>)}
          </select>
        </label>
        {message && <p className="formMessage">{message}</p>}
        <button className="primaryButton" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "处理中..." : "提交并进入活动"}
        </button>
      </form>
    </Layout>
  );
}