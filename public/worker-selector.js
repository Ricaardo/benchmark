/**
 * Worker 节点选择器
 * 用于在前端选择执行节点
 */

class WorkerSelector {
    constructor() {
        this.workers = [];
        this.selectedWorkerId = null;
        this.ws = null;
        this.onWorkerChangeCallbacks = [];
    }

    /**
     * 初始化
     */
    async init() {
        await this.loadWorkers();
        this.connectWebSocket();
        this.startAutoRefresh();
        return this;
    }

    /**
     * 加载 Workers
     */
    async loadWorkers() {
        try {
            const res = await fetch('/api/workers');
            const data = await res.json();
            this.workers = data.workers || [];
            this.notifyChange();
            return this.workers;
        } catch (error) {
            console.error('Failed to load workers:', error);
            return [];
        }
    }

    /**
     * 连接 WebSocket 接收实时更新
     */
    connectWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}`;

        this.ws = new WebSocket(wsUrl);

        this.ws.onmessage = (event) => {
            const message = JSON.parse(event.data);

            if (message.type === 'worker-status-update') {
                this.updateWorker(message.data);
            } else if (message.type === 'worker-offline') {
                this.updateWorker(message.data);
            } else if (message.type === 'workers-list') {
                this.workers = message.data.workers || [];
                this.notifyChange();
            }
        };

        this.ws.onclose = () => {
            console.log('Worker selector WebSocket disconnected, reconnecting...');
            setTimeout(() => this.connectWebSocket(), 5000);
        };
    }

    /**
     * 更新单个 Worker
     */
    updateWorker(workerData) {
        const index = this.workers.findIndex(w => w.id === workerData.id);
        if (index >= 0) {
            this.workers[index] = { ...this.workers[index], ...workerData };
        } else {
            this.workers.push(workerData);
        }
        this.notifyChange();
    }

    /**
     * 获取所有 Workers
     */
    getWorkers() {
        return this.workers;
    }

    /**
     * 获取在线 Workers
     */
    getOnlineWorkers() {
        return this.workers.filter(w => w.status === 'online');
    }

    /**
     * 获取可用 Workers（在线且不忙）
     */
    getAvailableWorkers() {
        return this.workers.filter(w => w.status === 'online' && !w.currentTask);
    }

    /**
     * 获取选中的 Worker ID
     */
    getSelectedWorkerId() {
        return this.selectedWorkerId;
    }

    /**
     * 设置选中的 Worker
     */
    setSelectedWorkerId(workerId) {
        this.selectedWorkerId = workerId;
        this.notifyChange();
    }

    /**
     * 渲染选择器到指定容器
     */
    render(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const onlineWorkers = this.getOnlineWorkers();
        const availableWorkers = this.getAvailableWorkers();

        container.innerHTML = `
            <div class="worker-selector-container">
                <label class="worker-selector-label">
                    <span>🖥️ 执行节点：</span>
                    <select id="workerSelect" class="worker-select">
                        <option value="">自动分配（推荐）</option>
                        ${this.workers.length === 0 ?
                            '<option value="" disabled>暂无 Worker 节点</option>' :
                            this.workers.map(w => `
                                <option value="${w.id}"
                                        ${w.status !== 'online' ? 'disabled' : ''}
                                        ${this.selectedWorkerId === w.id ? 'selected' : ''}>
                                    ${this.getWorkerDisplayName(w)}
                                </option>
                            `).join('')
                        }
                    </select>
                </label>

                ${this.workers.length > 0 ? `
                    <div class="worker-stats">
                        <span class="stat">在线: ${onlineWorkers.length}</span>
                        <span class="stat">可用: ${availableWorkers.length}</span>
                        <a href="/workers.html" target="_blank" class="view-all-link">查看所有节点 →</a>
                    </div>
                ` : `
                    <div class="worker-hint">
                        <span>💡 提示：启动 Worker 客户端后可以选择执行节点</span>
                        <a href="/workers.html" target="_blank">查看节点管理 →</a>
                    </div>
                `}
            </div>
        `;

        // 绑定选择事件
        const select = document.getElementById('workerSelect');
        if (select) {
            select.addEventListener('change', (e) => {
                this.setSelectedWorkerId(e.target.value || null);
            });
        }
    }

    /**
     * 获取 Worker 显示名称
     */
    getWorkerDisplayName(worker) {
        const platform = this.getPlatformIcon(worker.platform);
        const status = this.getStatusBadge(worker.status);
        const cpu = worker.cpuUsage ? ` [CPU: ${worker.cpuUsage.toFixed(0)}%]` : '';
        return `${platform} ${worker.name} ${status}${cpu}`;
    }

    /**
     * 获取平台图标
     */
    getPlatformIcon(platform) {
        const map = {
            win32: '🪟',
            darwin: '🍎',
            linux: '🐧'
        };
        return map[platform] || '🖥️';
    }

    /**
     * 获取状态标识
     */
    getStatusBadge(status) {
        const map = {
            online: '✅',
            busy: '⚙️',
            offline: '❌'
        };
        return map[status] || '';
    }

    /**
     * 自动刷新
     */
    startAutoRefresh() {
        setInterval(() => {
            this.loadWorkers();
        }, 30000); // 30秒刷新一次
    }

    /**
     * 监听变化
     */
    onChange(callback) {
        this.onWorkerChangeCallbacks.push(callback);
    }

    /**
     * 通知变化
     */
    notifyChange() {
        for (const callback of this.onWorkerChangeCallbacks) {
            try {
                callback(this.workers, this.selectedWorkerId);
            } catch (error) {
                console.error('Worker change callback error:', error);
            }
        }
    }

    /**
     * 清理资源
     */
    destroy() {
        if (this.ws) {
            this.ws.close();
        }
    }
}

// 导出为全局变量
window.WorkerSelector = WorkerSelector;
