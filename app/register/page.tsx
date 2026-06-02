"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import Layout from "@/components/Layout";
import { OFFICES, TEAMS } from "@/lib/constants";
import { useRegisterPlayer } from "@/hooks/use-game-data";

export default function RegisterPage() {
  const router = useRouter();
  const register = useRegisterPlayer();
  const [form, setForm] = useState({ name: "Yolen", phone: "", office: "北京", team: "Alpha" });
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      const result = await register(form);
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

  return (
    <Layout title="入场登记" eyebrow="REGISTER">
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
