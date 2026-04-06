#!/bin/bash

# 手动测试脚本 - 不需要等待 cron 触发

echo "🧪 智能台灯系统 - 手动测试"
echo "=========================="
echo ""

# 检查服务
if ! curl -s http://localhost:3001/health &> /dev/null; then
  echo "❌ 服务未运行，请先启动: npm run dev"
  exit 1
fi

echo "✅ 服务运行正常"
echo ""

echo "📋 选择测试场景："
echo "1. 做作业检测"
echo "2. 阅读检测"
echo "3. 运动检测"
echo "4. 休息检测"
echo ""

read -p "请选择 (1-4): " choice

case $choice in
  1)
    ACTION="homework"
    PROMPT="该做作业了，请专心学习！"
    ;;
  2)
    ACTION="reading"
    PROMPT="该阅读了，养成好习惯！"
    ;;
  3)
    ACTION="exercise"
    PROMPT="该运动了，活动一下身体！"
    ;;
  4)
    ACTION="rest"
    PROMPT="该休息了，放松一下吧！"
    ;;
  *)
    echo "无效选择"
    exit 1
    ;;
esac

echo ""
echo "🚀 开始执行检测..."
echo ""

# 调用 API
response=$(curl -s -X POST http://localhost:3001/api/task/execute \
  -H 'Content-Type: application/json' \
  -d "{\"action\":\"$ACTION\",\"prompt\":\"$PROMPT\"}")

echo "📊 检测结果："
echo "$response" | jq '.'

echo ""
echo "💡 打开 http://localhost:3001 查看详细记录"
