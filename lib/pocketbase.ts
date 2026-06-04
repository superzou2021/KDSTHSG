import PocketBase from "pocketbase";

const pocketBaseUrl = process.env.NEXT_PUBLIC_POCKETBASE_URL || "http://localhost:8090";

export const pb = new PocketBase(pocketBaseUrl);

// 全局禁用自动取消，防止轮询请求中断关键操作（如 Bingo 判分）
pb.autoCancellation(false);
