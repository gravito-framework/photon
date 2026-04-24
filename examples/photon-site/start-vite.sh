#!/bin/bash

# 啟動 Vite 開發伺服器的腳本
# 確保在正確的目錄運行

cd "$(dirname "$0")"

echo "🔍 檢查端口 5173..."
if lsof -i :5173 > /dev/null 2>&1; then
    echo "⚠️  端口 5173 已被佔用"
    echo "正在檢查佔用端口的進程..."
    
    VITE_PID=$(lsof -ti :5173 | head -1)
    if [ -n "$VITE_PID" ]; then
        VITE_CWD=$(lsof -p $VITE_PID 2>/dev/null | grep cwd | awk '{print $9}')
        CURRENT_DIR=$(pwd)
        
        if [ "$VITE_CWD" != "$CURRENT_DIR" ]; then
            echo "❌ 發現 Vite 在錯誤的目錄運行："
            echo "   Vite 目錄: $VITE_CWD"
            echo "   當前目錄: $CURRENT_DIR"
            echo ""
            echo "🛑 終止舊進程..."
            kill $VITE_PID
            sleep 2
            echo "✅ 已終止"
        else
            echo "✅ Vite 已在正確的目錄運行"
            exit 0
        fi
    fi
fi

echo ""
echo "🚀 啟動 Vite 開發伺服器..."
echo "   目錄: $(pwd)"
echo ""

bun run dev:vite
