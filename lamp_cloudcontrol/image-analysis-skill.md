---
name: image-analysis
description: "当用户想要分析某张图片的内容，或需要AI根据图片回答问题时使用此技能。"
---

# Image Analysis Skill

## 图片接口

**GET** `http://localhost:3000/photo.jpeg`

**响应示例**:
```json
{
  "image": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
  "mimeType": "image/jpeg"
}
```

## 使用方式

1. 调用 GET `http://localhost:3000/photo.jpeg` 获取图片数据（base64 格式）
2. 将返回的 `image` 字段（data URL）和用户的文本问题一起发送给多模态模型
3. 多模态 prompt 示例：

```json
{
  "role": "user",
  "content": [
    { "type": "text", "text": "请描述这张图片的内容" },
    { "type": "image", "source": { "type": "base64", "media_type": "image/jpeg", "data": "/9j/4AAQSkZJRg..." } }
  ]
}
```

## 注意

- 图片数据在返回的 `image` 字段中，格式为 `data:image/jpeg;base64,...`
- 调用接口后，直接把 `image` 字段的值作为 `ImageContent.data` 发送给模型即可
- `mimeType` 字段为 `image/jpeg`
