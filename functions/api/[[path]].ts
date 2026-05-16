// Cloudflare Pages Functions API Entry Point
// 导入 Workers 路由逻辑，复用现有代码
import WorkerEntry from '../workers/index';

export interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  KV?: KVNamespace;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // 直接调用 Workers 入口函数
    // Pages Functions 的 env 结构与 Workers 兼容
    return WorkerEntry.fetch(request, env);
  }
};