# Smart Lamp Control Skill (OpenCLAW)

## Metadata

- **name**: smart-lamp-control
- **description**: 控制智能台灯（开关灯、亮度调节、色温调节、音量调节）
- **version**: 1.0.0
- **author**: local-backend
- **updated**: 2026-4-8

---

## Base URL

```
http://localhost:3001
```

---

## API Endpoints

### 1. 获取台灯状态

**GET** `/api/lamp/status`

**响应示例**:
```json
{
  "success": true,
  "data": {
    "isOn": true,
    "brightness": 2,
    "temperature": 5,
    "volume": 5
  }
}
```

---

### 2. 开关灯

**POST** `/api/lamp/switch`

**请求体**:
```json
{ "on": true }   // true = 开灯, false = 关灯
```

---

### 3. 调节亮度

**POST** `/api/lamp/brightness`

| action | 说明 |
|--------|------|
| `up` | 亮度 +1 |
| `down` | 亮度 -1 |
| `set` | 设置为指定值（需配合 `value` 字段）|

```json
{ "action": "set", "value": 3 }
```

**取值范围**: `value` 1~5（5档）

---

### 4. 调节色温

**POST** `/api/lamp/temperature`

```json
{ "value": 5 }   // 0-10，0=最冷，10=最暖
```

---

### 5. 调节音量

**POST** `/api/lamp/volume`

| action | 说明 |
|--------|------|
| `up` | 音量 +1 |
| `down` | 音量 -1 |
| `set` | 设置为指定值（需配合 `value` 字段）|

```json
{ "action": "set", "value": 5 }   // 0-10
```

---

## Intent 意图映射

| 用户说 | API 调用 |
|--------|----------|
| 开灯 / 打开灯 | `POST /api/lamp/switch { on: true }` |
| 关灯 / 关闭灯 | `POST /api/lamp/switch { on: false }` |
| 调亮一点 / 更亮 | `POST /api/lamp/brightness { action: 'up' }` |
| 调暗一点 / 更暗 | `POST /api/lamp/brightness { action: 'down' }` |
| 设置亮度为 X | `POST /api/lamp/brightness { action: 'set', value: X }` |
| 设置色温为 X | `POST /api/lamp/temperature { value: X }` |
| 调大音量 | `POST /api/lamp/volume { action: 'up' }` |
| 调小音量 | `POST /api/lamp/volume { action: 'down' }` |
| 设置音量为 X | `POST /api/lamp/volume { action: 'set', value: X }` |

---

## 启动服务

```bash
cd lamp_cloudcontrol
npm install
npm start
```

服务地址: `http://localhost:3001`
