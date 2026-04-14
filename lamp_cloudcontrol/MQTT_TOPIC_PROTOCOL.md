# MQTT Topic 协议文档

## 概述

本文档用于说明 App、设备端、云端之间的 MQTT Topic 约定，以及常见技能指令的消息格式。

## Topic 定义

可以参考 [Senselink MQTT Topic 协议](https://docs.apipost.net/docs/detail/45471415ac7c000?target_id=403c4e4)

### 1. App -> 设备端

用于 App 或云端向指定设备下发控制信号。

```text
senselink/company/1/device/${ldid}/signal
```

字段说明：

- `${ldid}`: 设备唯一标识

### 2. 设备端 -> App/云端

用于设备端上报技能执行结果或状态信息。

```text
senselink/company/1/device/${ldid}/status
```

字段说明：

- `${ldid}`: 设备唯一标识

## 通用消息结构

### signal 报文

```json
{
  "timestamp": 1696927170,
  "seq": "3f335ea494e143f1a068ac34e34ac5a7",
  "signal": 7,
  "data": {
    "event": "claw-skill",
    "value": {
      "skill": "具体技能名"
    }
  }
}
```

字段说明：

- `timestamp`: 时间戳
- `seq`: 请求序列号，用于请求与响应匹配
- `signal`: 信号类型，灯固定就是 `7`
- `data.event`: 事件类型，当前为 `claw-skill`
- `data.value.skill`: 技能名称

### status 报文

```json
{
  "timestamp": 1696927170,
  "seq": "3f335ea494e143f1a068ac34e34ac5a7",
  "device_id": "L1WP00KC23J3600003",
  "data": {
    "skill-name": {
      "result": "success"
    }
  }
}
```

字段说明：

- `timestamp`: 时间戳
- `seq`: 请求序列号，应与下发 signal 中的 `seq` 保持一致
- `device_id`: 设备 ID
- `data`: 技能执行结果，键名通常为技能名
- `result`: 执行结果，例如 `success`

## 技能示例

## 1. `skill-tts-chinese`

### signal

Topic:

```text
senselink/company/1/device/${ldid}/signal
```

Payload:

```json
{
  "timestamp": 1696927170,
  "seq": "3f335ea494e143f1a068ac34e34ac5a7",
  "signal": 7,
  "data": {
    "event": "claw-skill",
    "value": {
      "skill": "skill-tts-chinese",
      "content": "我爱中国"
    }
  }
}
```

补充说明：

- `content`: 需要播报的中文文本内容

### status

Topic:

```text
senselink/company/1/device/${ldid}/status
```

Payload:

```json
{
  "timestamp": 1696927170,
  "seq": "3f335ea494e143f1a068ac34e34ac5a7",
  "device_id": "L1WP00KC23J3600003",
  "data": {
    "skill-tts-chinese": {
      "result": "success"
    }
  }
}
```

## 2. `skill-take-photo`

### signal

Topic:

```text
senselink/company/1/device/${ldid}/signal
```

Payload:

```json
{
  "timestamp": 1696927170,
  "seq": "3f335ea494e143f1a068ac34e34ac5a7",
  "signal": 7,
  "data": {
    "event": "claw-skill",
    "value": {
      "skill": "skill-take-photo"
    }
  }
}
```

### status

Topic:

```text
senselink/company/1/device/${ldid}/status
```

Payload:

```json
{
  "timestamp": 1696927170,
  "seq": "3f335ea494e143f1a068ac34e34ac5a7",
  "device_id": "L1WP00KC23J3600003",
  "data": {
    "skill-take-photo": {
      "result": "success",
      "bucket": "",
      "objectname": ""
    }
  }
}
```

补充说明：

- `bucket`: 图片上传后的存储桶名称
- `objectname`: 图片上传后的对象名称或文件路径

## 交互流程说明

### `skill-tts-chinese`

1. App 或云端向 `signal` topic 下发 TTS 指令
2. 设备端收到消息后执行中文播报
3. 执行完成后，设备端向 `status` topic 上报结果

### `skill-take-photo`

1. App 或云端向 `signal` topic 下发拍照指令
2. 设备端收到消息后执行拍照
3. 如有上传存储，设备端在 `status` 中返回 `bucket` 和 `objectname`

## 约定建议

- `seq` 建议全局唯一，便于请求和响应的链路追踪
- `status.data` 下的键名建议与 `skill` 名称保持一致
- 所有时间统一使用 Unix 时间戳
- 如何判断技能执行结果成功，可以通过 `status.data.skill-name.result` 是否为 `success` 来判断，其实没有收到status的消息就可以认为失败了
