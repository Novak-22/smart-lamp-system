#!/bin/bash

# 测试 OpenClaw 集成

echo "🦞 测试 OpenClaw 集成"
echo "===================="
echo ""

# 检查 OpenClaw Gateway
echo "1. 检查 OpenClaw Gateway..."
if ! openclaw health &> /dev/null; then
  echo "❌ OpenClaw Gateway 未运行"
  exit 1
fi
echo "✅ OpenClaw Gateway 运行正常"
echo ""

# 测试 agent 命令
echo "2. 测试 OpenClaw agent 命令..."
PHONE="+8618611978067"

echo "发送测试消息到 WhatsApp..."
response=$(openclaw agent --to $PHONE \
  --message "这是智能台灯系统的测试消息，请回复：收到" \
  --json 2>&1)

if [ $? -eq 0 ]; then
  echo "✅ 消息发送成功"
  echo "响应："
  echo "$response" | jq '.' 2>/dev/null || echo "$response"
else
  echo "❌ 消息发送失败"
  echo "$response"
fi

echo ""
echo "3. 测试图像分析提示词..."
response=$(openclaw agent --to $PHONE \
  --message "请分析：假设有一张图片显示一个人坐在书桌前，手持笔在写字。请判断这个人是否在做作业？请只回答：是 或 否" \
  --json 2>&1)

if [ $? -eq 0 ]; then
  echo "✅ 分析请求发送成功"
  echo "响应："
  echo "$response" | jq '.' 2>/dev/null || echo "$response"
else
  echo "❌ 分析请求失败"
  echo "$response"
fi

echo ""
echo "💡 提示："
echo "- 检查你的 WhatsApp 是否收到消息"
echo "- OpenClaw 的回复会通过 WhatsApp 返回"
echo "- 查看完整日志: openclaw logs"
