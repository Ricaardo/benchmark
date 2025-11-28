/**
 * 批量测试分发组件
 * 支持选择多个测试用例批量分发到不同 Worker 执行
 */

class BatchDispatcher {
    constructor() {
        this.selectedCases = new Set();
        this.isDispatching = false;
        this.dispatchResults = [];
    }

    /**
     * 初始化批量分发功能
     */
    init() {
        this.addBatchControls();
        this.addCheckboxes();
        return this;
    }

    /**
     * 添加批量操作控制栏
     */
    addBatchControls() {
        const toolbar = document.querySelector('.toolbar-left');
        if (!toolbar) return;

        // 添加批量操作按钮
        const batchControls = document.createElement('div');
        batchControls.className = 'batch-controls';
        batchControls.style.cssText = 'display: flex; gap: 10px; align-items: center; margin-left: 20px;';

        batchControls.innerHTML = `
            <button class="btn btn-primary" id="batch-dispatch-btn" style="display: none;">
                <span>批量分发</span>
                <span id="batch-count"></span>
            </button>
            <span id="batch-status" style="font-size: 0.9em; color: #666;"></span>
        `;

        toolbar.appendChild(batchControls);

        // 绑定事件（全选复选框已移除）

        document.getElementById('batch-dispatch-btn').addEventListener('click', () => {
            this.showBatchDispatchModal();
        });
    }

    /**
     * 为每个测试用例添加复选框
     */
    addCheckboxes() {
        // 监听测试用例列表的变化
        const observer = new MutationObserver(() => {
            this.updateCheckboxes();
        });

        const casesContainer = document.getElementById('cases-container');
        if (casesContainer) {
            observer.observe(casesContainer, { childList: true, subtree: true });
            this.updateCheckboxes();
        }
    }

    /**
     * 更新所有复选框
     */
    updateCheckboxes() {
        const caseCards = document.querySelectorAll('.case-card');

        caseCards.forEach(card => {
            // 如果已经有复选框，跳过
            if (card.querySelector('.case-checkbox')) return;

            const caseId = card.dataset.id || card.getAttribute('data-id');
            if (!caseId) return;

            // 创建复选框
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'case-checkbox';
            checkbox.dataset.caseId = caseId;
            checkbox.style.cssText = 'margin-right: 10px; cursor: pointer; width: 18px; height: 18px;';
            checkbox.checked = this.selectedCases.has(caseId);

            checkbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.selectedCases.add(caseId);
                } else {
                    this.selectedCases.delete(caseId);
                }
                this.updateBatchButton();
            });

            // 插入到卡片标题前
            const header = card.querySelector('.case-header') || card.querySelector('h3');
            if (header) {
                header.insertBefore(checkbox, header.firstChild);
            }
        });

        this.updateBatchButton();
    }

    /**
     * 全选/取消全选
     */
    toggleSelectAll(checked) {
        const checkboxes = document.querySelectorAll('.case-checkbox');
        checkboxes.forEach(cb => {
            cb.checked = checked;
            const caseId = cb.dataset.caseId;
            if (checked) {
                this.selectedCases.add(caseId);
            } else {
                this.selectedCases.delete(caseId);
            }
        });
        this.updateBatchButton();
    }

    /**
     * 更新批量分发按钮
     */
    updateBatchButton() {
        const btn = document.getElementById('batch-dispatch-btn');
        const count = document.getElementById('batch-count');

        if (this.selectedCases.size > 0) {
            btn.style.display = 'block';
            count.textContent = `(${this.selectedCases.size})`;
        } else {
            btn.style.display = 'none';
        }

        // 全选复选框已移除，不再更新全选状态
    }

    /**
     * 显示批量分发模态框
     */
    showBatchDispatchModal() {
        const selectedCount = this.selectedCases.size;
        if (selectedCount === 0) {
            alert('请先选择要执行的测试用例');
            return;
        }

        // 获取可用 Worker
        const workers = window.workerSelector ? window.workerSelector.getOnlineWorkers() : [];

        if (workers.length === 0) {
            if (confirm(`当前没有在线的 Worker 节点。\n\n是否使用本地执行 ${selectedCount} 个测试用例？`)) {
                this.batchDispatch(null); // 本地执行
            }
            return;
        }

        // 创建选择模态框
        const modal = this.createDispatchModal(workers, selectedCount);
        document.body.appendChild(modal);
    }

    /**
     * 创建分发模态框
     */
    createDispatchModal(workers, selectedCount) {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.style.zIndex = '10000';

        const workerOptions = workers.map(w => {
            const tierName = this.getPerformanceTierName(w.performanceTier);
            const name = tierName ? `${tierName} - ${w.name}` : w.name;
            return `<option value="${w.id}">${name}</option>`;
        }).join('');

        modal.innerHTML = `
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">🚀 批量分发测试</div>
                <div style="padding: 20px;">
                    <p style="margin-bottom: 20px; color: #666;">
                        已选择 <strong>${selectedCount}</strong> 个测试用例
                    </p>

                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 500;">
                            分发策略:
                        </label>
                        <select id="dispatch-strategy" class="form-control" style="width: 100%; padding: 8px;">
                            <option value="auto">自动分配 - 优先中配 (推荐)</option>
                            <option value="specific">指定 Worker</option>
                            <option value="local">本地执行</option>
                        </select>
                    </div>

                    <div id="worker-selection" style="display: none; margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 500;">
                            选择 Worker:
                        </label>
                        <select id="target-worker" class="form-control" style="width: 100%; padding: 8px;">
                            ${workerOptions}
                        </select>
                    </div>

                    <div style="display: flex; gap: 10px; justify-content: flex-end;">
                        <button class="btn" onclick="this.closest('.modal').remove()">取消</button>
                        <button class="btn btn-primary" id="confirm-dispatch">开始分发</button>
                    </div>
                </div>
            </div>
        `;

        // 绑定策略选择
        modal.querySelector('#dispatch-strategy').addEventListener('change', (e) => {
            const workerSelection = modal.querySelector('#worker-selection');
            workerSelection.style.display = e.target.value === 'specific' ? 'block' : 'none';
        });

        // 绑定确认按钮
        modal.querySelector('#confirm-dispatch').addEventListener('click', () => {
            const strategy = modal.querySelector('#dispatch-strategy').value;
            const workerId = strategy === 'specific' ?
                           modal.querySelector('#target-worker').value : null;

            modal.remove();
            this.batchDispatch(workerId, strategy);
        });

        return modal;
    }

    /**
     * 执行批量分发
     */
    async batchDispatch(workerId, strategy = 'auto') {
        if (this.isDispatching) {
            alert('正在批量分发中，请稍候...');
            return;
        }

        this.isDispatching = true;
        this.dispatchResults = [];

        const statusEl = document.getElementById('batch-status');
        const selectedIds = Array.from(this.selectedCases);

        statusEl.textContent = `正在分发 0/${selectedIds.length}...`;
        statusEl.style.color = '#667eea';

        let completed = 0;
        const results = {
            success: 0,
            failed: 0
        };

        // 逐个分发测试
        for (const caseId of selectedIds) {
            try {
                await this.dispatchSingleCase(caseId, workerId, strategy);
                results.success++;
            } catch (error) {
                console.error(`分发测试用例 ${caseId} 失败:`, error);
                results.failed++;
            }

            completed++;
            statusEl.textContent = `已分发 ${completed}/${selectedIds.length} (成功: ${results.success}, 失败: ${results.failed})`;
        }

        this.isDispatching = false;

        // 显示完成状态
        statusEl.style.color = results.failed > 0 ? '#f39c12' : '#27ae60';
        statusEl.textContent = `✅ 完成! 成功: ${results.success}, 失败: ${results.failed}`;

        setTimeout(() => {
            statusEl.textContent = '';
        }, 5000);

        // 清空选择
        this.selectedCases.clear();
        this.toggleSelectAll(false);
    }

    /**
     * 分发单个测试用例
     */
    async dispatchSingleCase(caseId, workerId, strategy) {
        // 获取测试用例
        const testCase = window.testCases ? window.testCases.find(tc => tc.id === caseId) : null;
        if (!testCase) {
            throw new Error(`找不到测试用例: ${caseId}`);
        }

        // 🆕 默认中端性能机器：如果strategy是'auto'且没有指定workerId，优先选择中配Worker
        if (strategy === 'auto' && !workerId) {
            const workers = window.workerSelector?.getOnlineWorkers() || [];
            if (workers.length > 0) {
                // 优先选择中配Worker
                const mediumWorker = workers.find(w => w.performanceTier === 'medium');
                if (mediumWorker) {
                    workerId = mediumWorker.id;
                    console.log(`[BatchDispatcher] 🎯 默认选择中配Worker: ${mediumWorker.name}`);
                } else {
                    // 如果没有中配，按优先级选择：low > high > custom
                    const lowWorker = workers.find(w => w.performanceTier === 'low');
                    const highWorker = workers.find(w => w.performanceTier === 'high');
                    const fallbackWorker = lowWorker || highWorker || workers[0];

                    if (fallbackWorker) {
                        workerId = fallbackWorker.id;
                        console.log(`[BatchDispatcher] ⚠️ 无中配Worker，使用备选: ${fallbackWorker.name} (${fallbackWorker.performanceTier})`);
                    }
                }
            }
        }

        // 检查是否使用分布式执行
        const useDistributed = workerId || (strategy === 'auto' && window.workerSelector?.getOnlineWorkers().length > 0);

        if (useDistributed) {
            // 分布式执行
            const response = await fetch('/api/distributed-tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    testCaseId: testCase.id,
                    workerId: workerId || undefined,
                    runner: 'chromium',
                    config: testCase
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } else {
            // 本地执行
            const response = await fetch('/api/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    testCaseId: testCase.id,
                    runners: ['chromium'],
                    config: testCase
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        }
    }

    /**
     * 获取性能等级名称
     */
    getPerformanceTierName(tier) {
        const names = {
            high: '高配',
            medium: '中配',
            low: '低配',
            custom: '自定义'
        };
        return names[tier];
    }

    /**
     * 清理
     */
    destroy() {
        this.selectedCases.clear();
        document.querySelectorAll('.case-checkbox').forEach(cb => cb.remove());
        document.querySelector('.batch-controls')?.remove();
    }
}

// 导出为全局变量
window.BatchDispatcher = BatchDispatcher;
