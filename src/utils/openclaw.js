import { WebSocket } from "ws";

const GATEWAY_URL = "ws://127.0.0.1:18789";
const CLIENT_ID = "openclaw-control-ui";
const CLIENT_VERSION = "dev";
const PLATFORM = "web";
const CLIENT_MODE = "webchat";

export class OpenClawClient {
  constructor() {
    // Use token from environment or fall back to the default from openclaw.json
    this.token = process.env.OPENCLAW_TOKEN || "56c8827150ad41941620eaf565479aecbf2d967aa2a71f61";
    this.sessionKey = "main";
  }

  generateId() {
    return `r${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  }

  async rpc(method, params = {}, timeoutMs = 30000) {
    const self = this;
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(GATEWAY_URL, {
        headers: { origin: GATEWAY_URL.replace("ws://", "http://") },
      });

      const pending = new Map();
      let connectRequestId = null;
      let closed = false;

      const cleanup = () => {
        closed = true;
        try {
          ws.close();
        } catch (e) {}
      };

      ws.on("message", (data) => {
        if (closed) return;

        const msg = JSON.parse(data.toString());

        if (msg.type === "event" && msg.event === "connect.challenge") {
          connectRequestId = self.generateId();
          ws.send(
            JSON.stringify({
              type: "req",
              id: connectRequestId,
              method: "connect",
              params: {
                minProtocol: 3,
                maxProtocol: 3,
                client: {
                  id: CLIENT_ID,
                  version: CLIENT_VERSION,
                  platform: PLATFORM,
                  mode: CLIENT_MODE,
                },
                auth: { token: self.token },
                role: "operator",
                scopes: ["operator.admin", "operator.read", "operator.write"],
              },
            })
          );
          return;
        }

        if (msg.type === "res" && msg.id) {
          // Connect response
          if (msg.id === connectRequestId) {
            connectRequestId = null;
            const actualId = self.generateId();
            pending.set(actualId, { resolve, reject });
            ws.send(
              JSON.stringify({
                type: "req",
                id: actualId,
                method: method,
                params: params,
              })
            );

            setTimeout(() => {
              if (pending.has(actualId)) {
                pending.delete(actualId);
                cleanup();
                reject(new Error("Request timeout"));
              }
            }, timeoutMs);
            return;
          }

          // Other responses
          const p = pending.get(msg.id);
          if (p) {
            pending.delete(msg.id);
            p.resolve(msg);
            if (pending.size === 0) cleanup();
          }
        }
      });

      ws.on("error", (err) => {
        cleanup();
        reject(err);
      });

      ws.on("close", () => {
        cleanup();
      });

      setTimeout(() => {
        if (!closed) {
          cleanup();
          reject(new Error("Connection timeout"));
        }
      }, 10000);
    });
  }

  async analyzeImage(imageData, prompt) {
    const runId = `run-${Date.now()}`;
    // 使用独立的 sessionKey，避免和 cron 任务的 main session 冲突
    const analysisSession = `lamp-${Date.now()}`;

    const sendRes = await this.rpc(
      "chat.send",
      {
        sessionKey: analysisSession,
        message: prompt,
        idempotencyKey: runId,
        attachments: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: "image/png",
              data: imageData,
            },
          },
        ],
      },
      60000
    );

    if (!sendRes.ok) {
      throw new Error(`chat.send failed: ${sendRes.error?.message}`);
    }

    console.log('[OpenClaw] chat.send 成功, runId:', sendRes.payload?.runId);

    // Wait for completion
    console.log('[OpenClaw] 等待 AI 响应...');
    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      try {
        const waitRes = await this.rpc(
          "agent.wait",
          { runId: sendRes.payload.runId, timeoutMs: 3000 },
          10000
        );
        console.log(`[OpenClaw] wait #${i+1}:`, JSON.stringify(waitRes.payload));
        if (waitRes.payload?.status === "ok") {
          console.log('[OpenClaw] AI 响应完成');
          break;
        }
      } catch (e) {
        console.log(`[OpenClaw] wait #${i+1} error:`, e.message);
        // Continue waiting
      }
    }

    // Get response from history
    await new Promise((r) => setTimeout(r, 500));
    const historyRes = await this.rpc("chat.history", { sessionKey: analysisSession });
    const msgs = historyRes.payload?.messages || [];
    const lastAssistantMsg = [...msgs].reverse().find((m) => m.role === "assistant");

    console.log('[OpenClaw] 历史消息数量:', msgs.length);
    console.log('[OpenClaw] 最后助手消息:', JSON.stringify(lastAssistantMsg, null, 2)?.slice(0, 500));

    let rawResponse = "";
    if (lastAssistantMsg) {
      rawResponse =
        Array.isArray(lastAssistantMsg.content)
          ? lastAssistantMsg.content.map((c) => c.text || "").join("")
          : lastAssistantMsg.text || "";

      if (lastAssistantMsg.content && Array.isArray(lastAssistantMsg.content)) {
        for (const block of lastAssistantMsg.content) {
          if (block.type === "text" && block.text) {
            rawResponse = block.text;
            break;
          }
        }
      }
    }

    // Parse response - look for answer indicators at the beginning
    // Remove formatting markers and normalize
    const cleanText = rawResponse.replace(/<[^>]+>/g, "").replace(/\*\*/g, "").trim().toLowerCase();
    let detected = false;
    let confidence = 0.5;

    // Check if response starts with 否/不 or contains negation near the start
    const startsWithNegation = /^(否|不|没)/.test(cleanText);
    const startsWithAffirmative = /^(是|有)/.test(cleanText);

    if (startsWithNegation) {
      detected = false;
      confidence = 0.9;
    } else if (startsWithAffirmative) {
      detected = true;
      confidence = 0.9;
    } else if (cleanText.includes("否") || cleanText.includes("不") || cleanText.includes("没有")) {
      detected = false;
      confidence = 0.7;
    } else if (cleanText.includes("是") || cleanText.includes("有")) {
      detected = true;
      confidence = 0.7;
    }

    console.log('[OpenClaw] 原始回复:', rawResponse);
    console.log('[OpenClaw] 解析结果: detected=', detected, 'confidence=', confidence);

    return { detected, confidence, rawResponse };
  }

  async sendText(text) {
    const idempotencyKey = `text-${Date.now()}`;
    return this.rpc("chat.send", {
      sessionKey: this.sessionKey,
      message: text,
      idempotencyKey,
    });
  }

  disconnect() {}
}

// Singleton instance
export const openclawClient = new OpenClawClient();
