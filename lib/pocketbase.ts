import PocketBase from "pocketbase";

function getPocketBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_POCKETBASE_URL;
  if (envUrl) return envUrl;

  // 浏览器端自动使用当前页面的 hostname，避免 IP 变化导致连接失败
  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:8090`;
  }

  return "http://localhost:8090";
}

export const pb = new PocketBase(getPocketBaseUrl());

// 全局禁用自动取消，防止轮询请求中断关键操作（如 Bingo 判分）
pb.autoCancellation(false);
