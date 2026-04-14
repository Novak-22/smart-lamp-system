# Lamp CloudControl

自建的智能台灯云端控制后台，作为 OpenClaw 与 SenseRobot 云端后台之间的消息转发层。

## 架构

```
+-----------------+    +------------------------+    +------------------------+
|    OpenClaw     |    |  CloudControl Server   |    |  SenseRobot Cloud      |
|  (WhatsApp /    | -- |    (本项目 :3001)       | -- |  (sensejupiter-test    |
|    Feishu)      |    |                         |    |   .sensetime.com)      |
+-----------------+    +------------------------+    +------------------------+
       |                         |                          |
       |                         |<---- MQTT Signal ------->|
       |                         |<---- MQTT Status -------->|
       |                         |                          |
       |                         v                          v
       |                  +--------------+          +--------------+
       |                  |    Web UI     |          |  Smart Lamp  |
       |                  |  (Monitor)   |          |  (Hardware)  |
       |                  +--------------+          +--------------+
```

## 核心职责

本服务作为 **消息转发层**，不直接控制硬件，而是：

1. **接收** OpenClaw 下发的任务指令（通过 HTTP API）
2. **转发** 指令到 SenseRobot 云端（通过 MQTT Signal）
3. **接收** 设备端通过 MQTT 上报的 status 响应
4. **返回** 响应结果给调用方（部分 API 如 `/api/lamp/photo`）
5. **提供** Web UI 用于状态监控

## API 接口

| 端点 | 方法 | 说明 |
|------|------|------|
| `/health` | GET | 健康检查 |
| `/api/lamp/status` | GET | 获取台灯当前状态（亮度、色温、音量、开关） |
| `/api/lamp/switch` | POST | 开关台灯 `{ on: true/false }` |
| `/api/lamp/brightness` | POST | 调节亮度 `{ action: "up"/"down"/"set", value: 1-5 }` |
| `/api/lamp/temperature` | POST | 调节色温 `{ value: 0-10 }` |
| `/api/lamp/volume` | POST | 调节音量 `{ action: "up"/"down"/"set", value: 0-10 }` |
| `/api/lamp/tts` | POST | 文本转语音播报 `{ content: "文字内容" }` |
| `/api/lamp/photo` | POST | 触发设备拍照，返回图片数据 |

## 快速开始

```bash
cd lamp_cloudcontrol
npm install
npm start
```

服务启动后监听 `http://localhost:3001`。

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `PORT` | HTTP 服务端口 | `3001` |
| `SMART_LAMP_AUTH_TOKEN` | SenseRobot 云端认证 Token | （必填） |
| `SMART_LAMP_DEVICE_ID` | 台灯设备 ID | `SCCHI-f8e19ced467d77a1eba05f4246e2f8cc` |
| `SMART_LAMP_FILESERVER_SOURCE` | 文件服务器来源标识 | `APP` |

## MQTT 协议

与 SenseRobot 云端的通信基于 MQTT，详情参见 [MQTT_TOPIC_PROTOCOL.md](./MQTT_TOPIC_PROTOCOL.md)。

主要 Topic：
- **Signal**（本服务 → 云端）：`senselink/company/1/device/${DEVICE_ID}/signal`
- **Status**（云端 → 本服务）：`senselink/company/1/device/${DEVICE_ID}/status`

## 依赖

- **Express** — HTTP API 服务
- **MQTT** — 与 SenseRobot 云端通信
