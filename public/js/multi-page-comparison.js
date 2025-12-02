/**
 * 多页面均值比较表组件
 * 生成页面为行、指标为列的对比表格
 */

/**
 * 创建多页面均值比较表（Initialization）
 * @param {Array} successfulResults - 成功的测试结果数组
 * @param {Array} metrics - 指标配置数组
 * @returns {string} HTML字符串
 */
function createInitializationComparisonTable(successfulResults, metrics) {
    if (!successfulResults || successfulResults.length === 0) {
        return '<div style="padding: 20px; color: #6b7280;">没有可用的测试数据</div>';
    }

    // 计算每个页面的指标均值
    const pageStats = successfulResults.map((result, index) => {
        const stats = {
            description: result.description,
            color: index
        };

        // 计算每个指标的均值
        metrics.forEach(metric => {
            const iterations = result.data[`${metric.key}-iterations`];
            stats[metric.id] = calculateAverage(iterations);
        });

        return stats;
    });

    // 如果只有一个页面，不显示差值列
    const showDiff = pageStats.length > 1;

    // 找出基准页面（第一个页面）的数据
    const baseline = pageStats[0];

    // 开始构建表格
    let html = `
        <div class="multi-page-comparison-table" style="margin-bottom: 32px; margin-top: 24px;">
            <h4 style="color: #2d3748; margin-bottom: 16px;">
                📈 多页面均值比较表
                ${showDiff ? '<span style="font-size: 0.875rem; color: #6b7280; font-weight: 400; margin-left: 12px;">（差值百分比以第一个页面为基准）</span>' : ''}
            </h4>
            <div style="overflow-x: auto;">
                <table class="stats-table" style="min-width: 100%;">
                    <thead>
                        <tr>
                            <th style="min-width: 200px; position: sticky; left: 0; background: #f9fafb; z-index: 2;">页面名称</th>
    `;

    // 添加指标列头
    metrics.forEach(metric => {
        html += `<th style="text-align: center;">${metric.label}<br><span style="font-size: 0.75rem; color: #6b7280; font-weight: 400;">${metric.unit || ''}</span></th>`;
    });

    // 如果有多个页面，添加"平均差值"列
    if (showDiff) {
        html += `<th style="text-align: center; background: #f0f9ff; color: #1e40af;">平均差值<br><span style="font-size: 0.75rem; font-weight: 400;">%</span></th>`;
    }

    html += `
                        </tr>
                    </thead>
                    <tbody>
    `;

    // 为每个页面添加一行
    pageStats.forEach((page, pageIndex) => {
        // 计算该页面相对于基准的平均差值百分比
        let totalDiffPercent = 0;
        let diffCount = 0;

        if (showDiff && pageIndex > 0) {
            metrics.forEach(metric => {
                const baseValue = baseline[metric.id];
                const currentValue = page[metric.id];
                if (baseValue > 0) {
                    const diffPercent = ((currentValue - baseValue) / baseValue) * 100;
                    totalDiffPercent += diffPercent;
                    diffCount++;
                }
            });
        }

        const avgDiffPercent = diffCount > 0 ? totalDiffPercent / diffCount : 0;

        // 添加行
        html += `
            <tr${pageIndex === 0 ? ' style="background: #f0f9ff;"' : ''}>
                <td style="position: sticky; left: 0; background: ${pageIndex === 0 ? '#f0f9ff' : '#ffffff'}; font-weight: 600; color: #1f2937; z-index: 1; border-right: 2px solid #e5e7eb;">
                    ${pageIndex === 0 ? '📍 ' : ''}${escapeHtml(page.description)}
                    ${pageIndex === 0 ? '<span style="font-size: 0.75rem; color: #1e40af; margin-left: 8px;">(基准)</span>' : ''}
                </td>
        `;

        // 添加每个指标的值
        metrics.forEach(metric => {
            const value = page[metric.id];
            const baseValue = baseline[metric.id];

            // 计算相对于基准的差值百分比
            let diffPercent = 0;
            let showDiffInCell = false;
            if (showDiff && pageIndex > 0 && baseValue > 0) {
                diffPercent = ((value - baseValue) / baseValue) * 100;
                showDiffInCell = true;
            }

            const diffClass = diffPercent > 5 ? 'stats-diff-positive' :
                            (diffPercent < -5 ? 'stats-diff-negative' : 'stats-diff-neutral');
            const diffSymbol = diffPercent > 0 ? '+' : '';

            html += `
                <td style="text-align: center; ${pageIndex === 0 ? 'background: #f0f9ff;' : ''}">
                    <div style="font-weight: 600; font-size: 1rem; color: #1f2937; margin-bottom: 2px;">
                        ${value.toFixed(metric.id === 'cls' ? 4 : 1)}
                    </div>
                    ${showDiffInCell ? `
                        <div class="${diffClass}" style="font-size: 0.75rem; font-weight: 500;">
                            ${diffSymbol}${diffPercent.toFixed(1)}%
                        </div>
                    ` : '<div style="height: 18px;"></div>'}
                </td>
            `;
        });

        // 如果有多个页面，添加平均差值列
        if (showDiff) {
            if (pageIndex === 0) {
                html += `<td style="text-align: center; background: #f0f9ff; color: #6b7280;">-</td>`;
            } else {
                const diffClass = avgDiffPercent > 5 ? 'stats-diff-positive' :
                                (avgDiffPercent < -5 ? 'stats-diff-negative' : 'stats-diff-neutral');
                const diffSymbol = avgDiffPercent > 0 ? '+' : '';

                html += `
                    <td style="text-align: center; background: #fef3c7;">
                        <div class="${diffClass}" style="font-size: 1.125rem; font-weight: 700;">
                            ${diffSymbol}${avgDiffPercent.toFixed(1)}%
                        </div>
                    </td>
                `;
            }
        }

        html += `</tr>`;
    });

    html += `
                    </tbody>
                </table>
            </div>
        </div>
    `;

    // 添加说明
    if (showDiff) {
        html += `
            <div style="padding: 12px 16px; background: #f9fafb; border-left: 4px solid #3b82f6; border-radius: 6px; margin-bottom: 24px;">
                <div style="font-size: 0.875rem; color: #4b5563; line-height: 1.6;">
                    <strong style="color: #1f2937;">📊 表格说明：</strong><br>
                    • 第一行为基准页面，其他页面的差值均相对于基准计算<br>
                    • <span class="stats-diff-positive" style="padding: 2px 6px; border-radius: 4px; background: #fee2e2;">红色</span> 表示性能下降（数值增大）超过5%<br>
                    • <span class="stats-diff-negative" style="padding: 2px 6px; border-radius: 4px; background: #d1fae5;">绿色</span> 表示性能提升（数值减小）超过5%<br>
                    • 平均差值列显示该页面相对于基准页面的整体性能差异
                </div>
            </div>
        `;
    }

    return html;
}

/**
 * 创建多页面均值比较表（Runtime）
 * @param {Array} successfulResults - 成功的测试结果数组
 * @param {Array} metrics - 指标配置数组
 * @returns {string} HTML字符串
 */
function createRuntimeComparisonTable(successfulResults, metrics) {
    if (!successfulResults || successfulResults.length === 0) {
        return '<div style="padding: 20px; color: #6b7280;">没有可用的测试数据</div>';
    }

    // 计算每个页面的指标均值
    const pageStats = successfulResults.map((result, index) => {
        const stats = {
            description: result.description,
            color: index
        };

        // 计算每个指标的均值（Runtime数据结构不同）
        metrics.forEach(metric => {
            // 尝试使用metric.id（records.html中使用的键）
            const dataKey = metric.id || metric.key;
            if (result.data && result.data[dataKey] !== undefined) {
                if (Array.isArray(result.data[dataKey])) {
                    // 如果是数组，计算平均值
                    stats[metric.id] = calculateAverage(result.data[dataKey]);
                } else {
                    // 如果是单个值，直接使用
                    stats[metric.id] = result.data[dataKey];
                }
            } else {
                stats[metric.id] = 0;
            }
        });

        return stats;
    });

    // 使用与Initialization相同的表格生成逻辑
    const showDiff = pageStats.length > 1;
    const baseline = pageStats[0];

    let html = `
        <div class="multi-page-comparison-table" style="margin-bottom: 32px; margin-top: 24px;">
            <h4 style="color: #2d3748; margin-bottom: 16px;">
                📈 多页面均值比较表
                ${showDiff ? '<span style="font-size: 0.875rem; color: #6b7280; font-weight: 400; margin-left: 12px;">（差值百分比以第一个页面为基准）</span>' : ''}
            </h4>
            <div style="overflow-x: auto;">
                <table class="stats-table" style="min-width: 100%;">
                    <thead>
                        <tr>
                            <th style="min-width: 200px; position: sticky; left: 0; background: #f9fafb; z-index: 2;">页面名称</th>
    `;

    metrics.forEach(metric => {
        html += `<th style="text-align: center;">${metric.label}<br><span style="font-size: 0.75rem; color: #6b7280; font-weight: 400;">${metric.unit || ''}</span></th>`;
    });

    if (showDiff) {
        html += `<th style="text-align: center; background: #f0f9ff; color: #1e40af;">平均差值<br><span style="font-size: 0.75rem; font-weight: 400;">%</span></th>`;
    }

    html += `
                        </tr>
                    </thead>
                    <tbody>
    `;

    pageStats.forEach((page, pageIndex) => {
        let totalDiffPercent = 0;
        let diffCount = 0;

        if (showDiff && pageIndex > 0) {
            metrics.forEach(metric => {
                const baseValue = baseline[metric.id];
                const currentValue = page[metric.id];
                if (baseValue > 0) {
                    const diffPercent = ((currentValue - baseValue) / baseValue) * 100;
                    totalDiffPercent += diffPercent;
                    diffCount++;
                }
            });
        }

        const avgDiffPercent = diffCount > 0 ? totalDiffPercent / diffCount : 0;

        html += `
            <tr${pageIndex === 0 ? ' style="background: #f0f9ff;"' : ''}>
                <td style="position: sticky; left: 0; background: ${pageIndex === 0 ? '#f0f9ff' : '#ffffff'}; font-weight: 600; color: #1f2937; z-index: 1; border-right: 2px solid #e5e7eb;">
                    ${pageIndex === 0 ? '📍 ' : ''}${escapeHtml(page.description)}
                    ${pageIndex === 0 ? '<span style="font-size: 0.75rem; color: #1e40af; margin-left: 8px;">(基准)</span>' : ''}
                </td>
        `;

        metrics.forEach(metric => {
            const value = page[metric.id];
            const baseValue = baseline[metric.id];

            let diffPercent = 0;
            let showDiffInCell = false;
            if (showDiff && pageIndex > 0 && baseValue > 0) {
                diffPercent = ((value - baseValue) / baseValue) * 100;
                showDiffInCell = true;
            }

            const diffClass = diffPercent > 5 ? 'stats-diff-positive' :
                            (diffPercent < -5 ? 'stats-diff-negative' : 'stats-diff-neutral');
            const diffSymbol = diffPercent > 0 ? '+' : '';

            html += `
                <td style="text-align: center; ${pageIndex === 0 ? 'background: #f0f9ff;' : ''}">
                    <div style="font-weight: 600; font-size: 1rem; color: #1f2937; margin-bottom: 2px;">
                        ${value.toFixed(metric.decimals || 2)}
                    </div>
                    ${showDiffInCell ? `
                        <div class="${diffClass}" style="font-size: 0.75rem; font-weight: 500;">
                            ${diffSymbol}${diffPercent.toFixed(1)}%
                        </div>
                    ` : '<div style="height: 18px;"></div>'}
                </td>
            `;
        });

        if (showDiff) {
            if (pageIndex === 0) {
                html += `<td style="text-align: center; background: #f0f9ff; color: #6b7280;">-</td>`;
            } else {
                const diffClass = avgDiffPercent > 5 ? 'stats-diff-positive' :
                                (avgDiffPercent < -5 ? 'stats-diff-negative' : 'stats-diff-neutral');
                const diffSymbol = avgDiffPercent > 0 ? '+' : '';

                html += `
                    <td style="text-align: center; background: #fef3c7;">
                        <div class="${diffClass}" style="font-size: 1.125rem; font-weight: 700;">
                            ${diffSymbol}${avgDiffPercent.toFixed(1)}%
                        </div>
                    </td>
                `;
            }
        }

        html += `</tr>`;
    });

    html += `
                    </tbody>
                </table>
            </div>
        </div>
    `;

    if (showDiff) {
        html += `
            <div style="padding: 12px 16px; background: #f9fafb; border-left: 4px solid #3b82f6; border-radius: 6px; margin-bottom: 24px;">
                <div style="font-size: 0.875rem; color: #4b5563; line-height: 1.6;">
                    <strong style="color: #1f2937;">📊 表格说明：</strong><br>
                    • 第一行为基准页面，其他页面的差值均相对于基准计算<br>
                    • <span class="stats-diff-positive" style="padding: 2px 6px; border-radius: 4px; background: #fee2e2;">红色</span> 表示性能下降（数值增大）超过5%<br>
                    • <span class="stats-diff-negative" style="padding: 2px 6px; border-radius: 4px; background: #d1fae5;">绿色</span> 表示性能提升（数值减小）超过5%<br>
                    • 平均差值列显示该页面相对于基准页面的整体性能差异
                </div>
            </div>
        `;
    }

    return html;
}

console.log('✓ Multi-page comparison table loaded');
