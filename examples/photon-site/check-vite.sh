#!/bin/bash

# Vite 開發伺服器診斷腳本

echo "🔍 檢查 Vite 開發伺服器狀態..."
echo ""

# 檢查端口 5173
echo "1. 檢查端口 5173："
if lsof -i :5173 > /dev/null 2>&1; then
    echo "   ✅ 端口 5173 正在使用中"
    echo "   進程詳情："
    lsof -i :5173 | head -3
    echo ""
    echo "   檢查是否在正確的目錄運行："
    VITE_PID=$(lsof -ti :5173 | head -1)
    if [ -n "$VITE_PID" ]; then
        VITE_CWD=$(lsof -p $VITE_PID 2>/dev/null | grep cwd | awk '{print $9}')
        CURRENT_DIR=$(pwd)
        if [ "$VITE_CWD" != "$CURRENT_DIR" ]; then
            echo "   ⚠️  警告：Vite 進程在另一個目錄運行："
            echo "      Vite 目錄: $VITE_CWD"
            echo "      當前目錄: $CURRENT_DIR"
            echo "   → 建議：終止舊進程並在當前目錄重新啟動"
        else
            echo "   ✅ Vite 在正確的目錄運行"
        fi
    fi
else
    echo "   ❌ 端口 5173 未被使用"
    echo "   → 請運行: bun run dev:vite"
fi
echo ""

# 測試 Vite 伺服器連接
echo "2. 測試 Vite 伺服器連接："
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5173/@vite/client 2>/dev/null)
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "304" ]; then
    echo "   ✅ Vite 伺服器正常響應 (HTTP $HTTP_CODE)"
elif [ "$HTTP_CODE" = "000" ]; then
    echo "   ❌ 無法連接到 Vite 伺服器"
    echo "   → 請檢查 Vite 是否正在運行"
    echo "   → 嘗試重啟: pkill -f vite && bun run dev:vite"
else
    echo "   ⚠️  Vite 伺服器返回 HTTP $HTTP_CODE"
fi
echo ""

# 檢查後端伺服器
echo "3. 檢查後端伺服器 (端口 3333)："
if lsof -i :3333 > /dev/null 2>&1; then
    echo "   ✅ 後端伺服器正在運行"
else
    echo "   ❌ 後端伺服器未運行"
    echo "   → 請運行: bun run dev:server"
fi
echo ""

# 建議
echo "📋 建議操作："
echo ""
echo "如果 Vite 伺服器無法連接，請嘗試："
echo "  1. 停止所有相關進程："
echo "     pkill -f vite"
echo "     pkill -f 'node.*5173'"
echo ""
echo "  2. 重新啟動 Vite："
echo "     bun run dev:vite"
echo ""
echo "  3. 在另一個終端啟動後端："
echo "     bun run dev:server"
echo ""
echo "  4. 或使用單一命令（推薦）："
echo "     bun run dev"
echo ""
