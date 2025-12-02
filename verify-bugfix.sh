#!/bin/bash

echo "🔍 验证Bug修复..."
echo ""

# 1. 检查HTML结构
echo "1️⃣ 检查HTML结束标签位置..."
html_closes=$(grep -n "</html>" public/index.html | wc -l)
if [ "$html_closes" -eq 2 ]; then
    echo "   ✅ 找到2个</html>标签（正常）"
else
    echo "   ❌ </html>标签数量异常: $html_closes"
fi

# 2. 检查关键函数定义
echo ""
echo "2️⃣ 检查关键函数定义..."
if grep -q "function showAddCaseModal()" public/index.html; then
    echo "   ✅ showAddCaseModal 函数已定义"
else
    echo "   ❌ showAddCaseModal 函数未找到"
fi

if grep -q "function loadPresetCases()" public/index.html; then
    echo "   ✅ loadPresetCases 函数已定义"
else
    echo "   ❌ loadPresetCases 函数未找到"
fi

# 3. 检查ui-utils引用
echo ""
echo "3️⃣ 检查ui-utils.js引用..."
ui_utils_count=$(grep -c 'src="/js/ui-utils.js"' public/index.html)
echo "   📌 ui-utils.js引用次数: $ui_utils_count"

# 4. 检查新文件
echo ""
echo "4️⃣ 检查优化文件..."
files=(
    "public/css/common-components.css"
    "public/js/ui-utils.js"
    "public/js/optimize-records.js"
    "public/ui-showcase.html"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        size=$(du -h "$file" | cut -f1)
        echo "   ✅ $file ($size)"
    else
        echo "   ❌ $file 不存在"
    fi
done

# 5. 检查修复的copyLogs函数
echo ""
echo "5️⃣ 检查日志复制函数优化..."
if grep -q "tip.textContent = '✓ 日志已复制到剪贴板'" public/index.html; then
    echo "   ✅ copyLogs函数已使用内联Toast样式"
else
    echo "   ❌ copyLogs函数仍使用alert"
fi

echo ""
echo "🎉 验证完成！"
echo ""
echo "📝 下一步："
echo "   1. 启动服务器: npm start"
echo "   2. 访问主页: http://localhost:3000/"
echo "   3. 测试功能: 点击'添加用例'和'加载预设'按钮"
echo "   4. 查看UI展示: http://localhost:3000/ui-showcase.html"
