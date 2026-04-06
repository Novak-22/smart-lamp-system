#!/bin/bash

# OpenClaw 智能台灯系统 - 快速设置脚本

echo "🦞 OpenClaw 智能台灯系统 - Cron 任务设置"
echo "=========================================="
echo ""

# 检查 OpenClaw 是否运行
if ! openclaw health &> /dev/null; then
  echo "❌ OpenClaw Gateway 未运行"
  echo "请先启动: openclaw gateway start"
  exit 1
fi

echo "✅ OpenClaw Gateway 运行正常"
echo ""

# 检查本地服务是否运行
if ! curl -s http://localhost:3001/health &> /dev/null; then
  echo "❌ 本地智能台灯服务未运行"
  echo "请在项目目录运行: npm run dev"
  exit 1
fi

echo "✅ 本地服务运行正常"
echo ""

# 示例任务配置
echo "📋 可用的任务示例："
echo ""
echo "1. 每天 17:00 检查做作业"
echo "2. 每天 20:00 检查阅读"
echo "3. 每天 14:00 检查午休"
echo "4. 自定义任务"
echo ""

read -p "请选择 (1-4): " choice

case $choice in
  1)
    NAME="做作业检查"
    SCHEDULE="0 17 * * *"
    ACTION="homework"
    PROMPT="该做作业了，请专心学习！"
    ;;
  2)
    NAME="阅读检查"
    SCHEDULE="0 20 * * *"
    ACTION="reading"
    PROMPT="该阅读了，养成好习惯！"
    ;;
  3)
    NAME="午休检查"
    SCHEDULE="0 14 * * *"
    ACTION="rest"
    PROMPT="该午休了，休息一下吧！"
    ;;
  4)
    read -p "任务名称: " NAME
    read -p "Cron 表达式 (如 0 17 * * *): " SCHEDULE
    read -p "任务类型 (homework/reading/exercise/rest): " ACTION
    read -p "语音提示: " PROMPT
    ;;
  *)
    echo "无效选择"
    exit 1
    ;;
esac

echo ""
echo "📝 任务配置："
echo "  名称: $NAME"
echo "  时间: $SCHEDULE"
echo "  类型: $ACTION"
echo "  提示: $PROMPT"
echo ""

read -p "确认创建? (y/n): " confirm

if [ "$confirm" != "y" ]; then
  echo "已取消"
  exit 0
fi

# 创建 cron 任务
echo ""
echo "🔧 正在创建 OpenClaw cron 任务..."

COMMAND="curl -X POST http://localhost:3001/api/task/execute -H 'Content-Type: application/json' -d '{\"action\":\"$ACTION\",\"prompt\":\"$PROMPT\"}'"

openclaw cron add \
  --name "$NAME" \
  --schedule "$SCHEDULE" \
  --command "$COMMAND"

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ 任务创建成功！"
  echo ""
  echo "📊 查看所有任务: openclaw cron list"
  echo "🗑️  删除任务: openclaw cron rm \"$NAME\""
  echo "▶️  立即测试: openclaw cron run \"$NAME\""
  echo ""
  echo "💡 提示: 打开 http://localhost:3001 查看监控界面"
else
  echo ""
  echo "❌ 任务创建失败"
  exit 1
fi
