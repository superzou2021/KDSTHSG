import PocketBase from "pocketbase";

const pocketBaseUrl = process.env.NEXT_PUBLIC_POCKETBASE_URL || "http://localhost:8090";

export const pb = new PocketBase(pocketBaseUrl);
