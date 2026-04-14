# Smart Lamp Control API

## Metadata

- **name**: smart-lamp
- **description**: 控制智能台灯（开关、亮度、色温、音量、坐姿提醒、休息提醒、离入座检测等）
- **version**: 1.0.0
- **author**: daice
- **updated**: 2026-4-7

---

## Device Configuration

```
Device ID:     SCCHI-f8e19ced467d77a1eba05f4246e2f8cc
MQTT Broker:   wss://sensejupiter-test.sensetime.com/mqtt4
Auth Token:    eyJhbGciOiJIUzUxMiJ9.eyJhcHAiOiJMSUdIVF9BUFAiLCJzdWIiOm51bGwsInJvbGUiOiJVU0VSIiwiZ...
               (联系设备管理员获取完整 token，或在环境变量 SMART_LAMP_AUTH_TOKEN 中配置)
Control Topic: senselink/company/1/device/SCCHI-f8e19ced467d77a1eba05f4246e2f8cc/signal
Status Topic:  senselink/company/1/device/SCCHI-f8e19ced467d77a1eba05f4246e2f8cc/status
Alive Topic:   senselink/company/1/device/SCCHI-f8e19ced467d77a1eba05f4246e2f8cc/alive
QoS:           1
```

MQTT 连接参数：protocolVersion: 4, keepalive: 30, clean: true

---

## MQTT 消息格式

### 发送控制命令 (App >> 设备端)

**Topic**: `senselink/company/1/device/SCCHI-f8e19ced467d77a1eba05f4246e2f8cc/signal`
**QoS**: 1

**消息体结构**:
```json
{
  "timestamp": 1696927170,
  "seq": "<uuid>",
  "signal": 7,
  "data": {
    "event": "<event_name>",
    "value": <value>
  }
}
```

- `timestamp`: Unix 时间戳（秒）
- `seq`: 随机 UUID，用于消息追踪
- `signal`: 固定为 `7`（灯控制信号）
- `data.event`: 控制事件名，见下方事件列表
- `data.value`: 控制值，见下方事件列表

### 接收状态更新 (设备端 >> App/云端)

**Topic**: `senselink/company/1/device/SCCHI-f8e19ced467d77a1eba05f4246e2f8cc/status`
**QoS**: 1

设备主动上报当前所有状态，消息体格式:
```json
{
  "timestamp": 1696927170,
  "seq": "<uuid>",
  "device_id": "SCCHI-f8e19ced467d77a1eba05f4246e2f8cc",
  "data": {
    "adjust_brightness": { "brightness_mode": 1, "brightness": 5, "temperature": 5 },
    "adjust_volume": 5,
    "switch_device_onoff": 1,
    "switch_auto_brightness": 1,
    "switch_button_backlight": 1,
    "switch_posture_enable": 1,
    "switch_concentrate_enable": 1,
    "switch_auto_sense": { "leaving_detect": 1, "seating_detect": 0 },
    "adjust_spotlight_tracking": { "switch": 0, "adjust_moto_direction": 1, "adjust_moto_step": 0 },
    "switch_pose_take_photo": 0,
    "adjust_posture": { "alarm_type": -1, "alarm_frequency": 10 },
    "adjust_rest": { "alarm_type": 0, "alarm_interval": 15 }
  }
}
```

### Alive 响应

**Topic**: `senselink/company/1/device/SCCHI-f8e19ced467d77a1eba05f4246e2f8cc/alive`
**用途**: 响应 App 的 ping，App 在 timeout=10s 内未收到则判断设备离线

---

## Events 事件列表

### 1. switch_device_onoff — 开关灯

| 字段 | 类型 | 值 | 说明 |
|------|------|-----|------|
| value | int | `1` = 开, `0` = 关 | |

**示例**: `{"event": "switch_device_onoff", "value": 1}` → 开灯

---

### 2. adjust_brightness — 灯光调节

| 字段 | 类型 | 结构 | 说明 |
|------|------|------|------|
| value | object | `{brightness_mode, brightness, temperature}` | |

| 子字段 | 类型 | 范围 | 说明 |
|--------|------|------|------|
| brightness_mode | int | `1` = 手动, `2` = 自动 | 亮度模式 |
| brightness | int | 0~4 | 亮度等级（5档） |
| temperature | int | 0~10 | 色温（冷/暖）|

**示例**: `{"event": "adjust_brightness", "value": {"brightness_mode": 1, "brightness": 8, "temperature": 5}}`

---

### 3. adjust_volume — 音量调节

| 字段 | 类型 | 范围 | 说明 |
|------|------|------|------|
| value | int | 0~10 | 音量等级 |

**示例**: `{"event": "adjust_volume", "value": 5}`

---

### 4. switch_auto_brightness — 自动亮度调节开关

| 字段 | 类型 | 值 | 说明 |
|------|------|-----|------|
| value | int | `1` = 开, `0` = 关 | |

**示例**: `{"event": "switch_auto_brightness", "value": 1}`

---

### 5. switch_button_backlight — 按键背光开关

| 字段 | 类型 | 值 | 说明 |
|------|------|-----|------|
| value | int | `1` = 开, `0` = 关 | |

**示例**: `{"event": "switch_button_backlight", "value": 1}`

---

### 6. switch_posture_enable — 坐姿提醒开关

| 字段 | 类型 | 值 | 说明 |
|------|------|-----|------|
| value | int | `1` = 开, `0` = 关 | |

**示例**: `{"event": "switch_posture_enable", "value": 1}`

---

### 7. switch_concentrate_enable — 专注度开关

| 字段 | 类型 | 值 | 说明 |
|------|------|-----|------|
| value | int | `1` = 开, `0` = 关 | |

**示例**: `{"event": "switch_concentrate_enable", "value": 1}`

---

### 8. switch_auto_sense — 离入座检测

| 字段 | 类型 | 结构 | 说明 |
|------|------|------|------|
| value | object | `{leaving_detect, seating_detect}` | |

| 子字段 | 类型 | 值 | 说明 |
|--------|------|------|------|
| leaving_detect | int | `1` = 开, `0` = 关 | 离座检测 |
| seating_detect | int | `1` = 开, `0` = 关 | 入座检测 |

**示例**: `{"event": "switch_auto_sense", "value": {"leaving_detect": 1, "seating_detect": 0}}`

---

### 9. adjust_posture — 坐姿提醒参数

| 字段 | 类型 | 结构 | 说明 |
|------|------|------|------|
| value | object | `{alarm_type, forward_alarm_frequency, lean_alarm_frequency}` | |

| 子字段 | 类型 | 范围 | 说明 |
|--------|------|------|------|
| alarm_type | int | `-1` = 功能关闭, `0` = 提醒关闭, `1` = 全部, `2` = 前倾, `3` = 侧倾 | 坐姿提醒类别 |
| forward_alarm_frequency | int | `10`, `5`, `1` | 前倾提醒频率（分钟） |
| lean_alarm_frequency | int | `10`, `5`, `1` | 侧倾提醒频率（分钟） |

**示例**: `{"event": "adjust_posture", "value": {"alarm_type": 1, "forward_alarm_frequency": 10, "lean_alarm_frequency": 10}}`

---

### 10. adjust_rest — 休息提醒

| 字段 | 类型 | 结构 | 说明 |
|------|------|------|------|
| value | object | `{alarm_type, alarm_interval}` | |

| 子字段 | 类型 | 范围 | 说明 |
|--------|------|------|------|
| alarm_type | int | `0` = 关闭, `1` = 智能提醒, `2` = 固定间隔 | 休息提醒类别 |
| alarm_interval | int | 分钟数，如 `15` | 固定间隔时的间隔时间 |

**示例**: `{"event": "adjust_rest", "value": {"alarm_type": 1, "alarm_interval": 15}}`

---

### 11. adjust_spotlight_tracking — 聚光追踪

| 字段 | 类型 | 结构 | 说明 |
|------|------|------|------|
| value | object | `{switch, adjust_moto_direction, adjust_moto_step}` | |

| 子字段 | 类型 | 值 | 说明 |
|--------|------|------|------|
| switch | int | `1` = 开, `0` = 关 | 聚光追踪开关 |
| adjust_moto_direction | int | `1` = 正, `0` = 反 | 电机方向 |
| adjust_moto_step | int | 步进值 | 电机步进 |

**示例**: `{"event": "adjust_spotlight_tracking", "value": {"switch": 1, "adjust_moto_direction": 1, "adjust_moto_step": 0}}`

---

### 12. switch_pose_take_photo — 坐姿拍摄开关

| 字段 | 类型 | 值 | 说明 |
|------|------|-----|------|
| value | int | `1` = 开, `0` = 关 | |

**示例**: `{"event": "switch_pose_take_photo", "value": 0}`

---

### 13. ping — 在线状态检测

| 字段 | 类型 | 值 | 说明 |
|------|------|-----|------|
| value | int | `1` | 固定发送 1 |

**示例**: `{"event": "ping", "value": 1}`

---

## Intent 意图映射

以下是用户自然语言与事件的对应关系，OpenCLAW 应根据用户语句识别意图并调用对应事件：

| 用户说 | 识别意图 | 触发事件 | 参数 |
|--------|----------|----------|------|
| 开灯 / 打开灯 / 灯打开 | 开灯 | `switch_device_onoff` | `value: 1` |
| 关灯 / 关闭灯 / 灯关闭 | 关灯 | `switch_device_onoff` | `value: 0` |
| 调亮一点 / 更亮 / 再亮一些 | 增加亮度 | `adjust_brightness` | `brightness +1` |
| 调暗一点 / 更暗 / 再暗一些 | 减少亮度 | `adjust_brightness` | `brightness -1` |
| 设置亮度为 X / 亮度调到 X | 设置亮度 | `adjust_brightness` | `brightness: X` |
| 冷光 / 暖光 / 色温调高 | 调整色温 | `adjust_brightness` | `temperature ±1` |
| 调大音量 / 音量调高 | 增大音量 | `adjust_volume` | `value +1` |
| 调小音量 / 音量调低 | 减小音量 | `adjust_volume` | `value -1` |
| 设置音量为 X | 设置音量 | `adjust_volume` | `value: X` |
| 开启自动亮度 / 自动亮度打开 | 开启自动亮度 | `switch_auto_brightness` | `value: 1` |
| 关闭自动亮度 | 关闭自动亮度 | `switch_auto_brightness` | `value: 0` |
| 开启按键背光 | 开启按键背光 | `switch_button_backlight` | `value: 1` |
| 关闭按键背光 | 关闭按键背光 | `switch_button_backlight` | `value: 0` |
| 开启坐姿提醒 / 打开坐姿提醒 | 开启坐姿提醒 | `switch_posture_enable` | `value: 1` |
| 关闭坐姿提醒 | 关闭坐姿提醒 | `switch_posture_enable` | `value: 0` |
| 开启专注度 | 开启专注度 | `switch_concentrate_enable` | `value: 1` |
| 关闭专注度 | 关闭专注度 | `switch_concentrate_enable` | `value: 0` |
| 开启离座检测 | 开启离座检测 | `switch_auto_sense` | `leaving_detect: 1` |
| 开启入座检测 | 开启入座检测 | `switch_auto_sense` | `seating_detect: 1` |
| 开启聚光追踪 / 打开聚光 | 开启聚光追踪 | `adjust_spotlight_tracking` | `switch: 1` |
| 关闭聚光追踪 | 关闭聚光追踪 | `adjust_spotlight_tracking` | `switch: 0` |
| 设置前倾提醒 / 前倾提醒开启 | 设置前倾提醒 | `adjust_posture` | `alarm_type: 2` |
| 全部坐姿提醒开启 | 全部坐姿提醒 | `adjust_posture` | `alarm_type: 1` |
| 关闭坐姿提醒类别 | 关闭坐姿提醒 | `adjust_posture` | `alarm_type: 0` |
| 关闭坐姿功能 | 关闭坐姿功能 | `adjust_posture` | `alarm_type: -1` |
| 开启休息提醒 / 休息提醒打开 | 开启休息提醒 | `adjust_rest` | `alarm_type: 1` |
| 关闭休息提醒 | 关闭休息提醒 | `adjust_rest` | `alarm_type: 0` |
| 设置休息间隔 X 分钟 | 设置固定间隔 | `adjust_rest` | `alarm_type: 2, alarm_interval: X` |
| 开启坐姿拍照 | 开启坐姿拍照 | `switch_pose_take_photo` | `value: 1` |
| 关闭坐姿拍照 | 关闭坐姿拍照 | `switch_pose_take_photo` | `value: 0` |
| 检查设备在线 / 设备在线吗 | 检测在线状态 | `ping` | `value: 1` |

---

## 调用方式

### MQTT 直接调用（推荐）

通过 MQTT 发布控制消息到 `senselink/company/1/device/SCCHI-f8e19ced467d77a1eba05f4246e2f8cc/signal`，QoS 设为 1。

消息构建示例（开灯）：
```json
{
  "timestamp": 1730000000,
  "seq": "550e8400-e29b-41d4-a716-446655440000",
  "signal": 7,
  "data": {
    "event": "switch_device_onoff",
    "value": 1
  }
}
```

### HTTP API 调用（通过 OpenClaw 转发）

如果通过 OpenClaw HTTP API 调用，需创建中间层服务将请求转为 MQTT 消息，或直接使用 MQTT.js 客户端。

**建议的 API 端点**:
```
POST /api/lamp/control
Body: { "event": "switch_device_onoff", "value": 1 }
```

---

## 注意事项

1. **开/关 值约定**: 所有开关类事件，`1` = 开启，`0` = 关闭
2. **brightness/temperature/volume 范围**: 均为 0~10
3. **坐姿 alarm_type**: `-1` = 功能关闭（彻底关闭坐姿模块），`0` = 提醒关闭（保留检测但不出声），`1` = 全部，`2` = 前倾，`3` = 侧倾
4. **seq 字段**: 每次请求应使用不同的 UUID 以便追踪
5. **设备离线判断**: 向 `alive` topic 发 ping，10秒内无响应则判定离线
6. **LDID 生成规则**: `md5(deviceId + "1")`，前缀 `SCCHI-`，如 `SCCHI-f8e19ced467d77a1eba05f4246e2f8cc`
