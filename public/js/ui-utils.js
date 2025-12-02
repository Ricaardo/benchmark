/**
 * UI工具函数库
 * UI Utilities - Toast notifications, confirm dialogs, and more
 */

// ========== Toast 通知系统 ==========

class ToastManager {
    constructor() {
        this.container = null;
        this.toasts = [];
        this.init();
    }

    init() {
        // 创建Toast容器
        if (!document.getElementById('toast-container')) {
            this.container = document.createElement('div');
            this.container.id = 'toast-container';
            this.container.className = 'toast-container';
            document.body.appendChild(this.container);
        } else {
            this.container = document.getElementById('toast-container');
        }
    }

    show(options) {
        const {
            type = 'info',
            title = '',
            message = '',
            duration = 3000,
            closable = true
        } = typeof options === 'string' ? { message: options } : options;

        // 创建Toast元素
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        // 图标映射
        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };

        // Toast内容
        toast.innerHTML = `
            <div class="toast-icon">${icons[type] || icons.info}</div>
            <div class="toast-content">
                ${title ? `<div class="toast-title">${this.escapeHtml(title)}</div>` : ''}
                <div class="toast-message">${this.escapeHtml(message)}</div>
            </div>
            ${closable ? '<button class="toast-close" aria-label="关闭">✕</button>' : ''}
        `;

        // 添加到容器
        this.container.appendChild(toast);
        this.toasts.push(toast);

        // 关闭按钮事件
        if (closable) {
            const closeBtn = toast.querySelector('.toast-close');
            closeBtn.addEventListener('click', () => this.remove(toast));
        }

        // 自动关闭
        if (duration > 0) {
            setTimeout(() => this.remove(toast), duration);
        }

        return toast;
    }

    remove(toast) {
        if (!toast || !toast.parentElement) return;

        toast.classList.add('hiding');
        setTimeout(() => {
            if (toast.parentElement) {
                toast.parentElement.removeChild(toast);
                this.toasts = this.toasts.filter(t => t !== toast);
            }
        }, 300);
    }

    success(message, title = '成功') {
        return this.show({ type: 'success', title, message });
    }

    error(message, title = '错误') {
        return this.show({ type: 'error', title, message, duration: 5000 });
    }

    warning(message, title = '警告') {
        return this.show({ type: 'warning', title, message });
    }

    info(message, title = '') {
        return this.show({ type: 'info', title, message });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// 创建全局Toast实例
window.Toast = new ToastManager();

// 兼容旧的showToast函数
window.showToast = function(message, type = 'success') {
    return window.Toast.show({ message, type });
};

// ========== 确认对话框 ==========

class ConfirmDialog {
    show(options) {
        const {
            title = '确认操作',
            message = '确定要执行此操作吗？',
            type = 'warning',
            confirmText = '确定',
            cancelText = '取消',
            onConfirm = null,
            onCancel = null,
            dangerousAction = false
        } = options;

        return new Promise((resolve) => {
            // 创建遮罩层
            const overlay = document.createElement('div');
            overlay.className = 'confirm-dialog-overlay';

            // 图标映射
            const icons = {
                danger: '⚠',
                warning: '⚠',
                info: 'ℹ'
            };

            // 对话框内容
            overlay.innerHTML = `
                <div class="confirm-dialog">
                    <div class="confirm-dialog-header">
                        <h3 class="confirm-dialog-title">
                            <div class="confirm-dialog-icon ${type}">
                                ${icons[type] || icons.warning}
                            </div>
                            <span>${this.escapeHtml(title)}</span>
                        </h3>
                    </div>
                    <div class="confirm-dialog-body">
                        <div class="confirm-dialog-message">${this.escapeHtml(message)}</div>
                    </div>
                    <div class="confirm-dialog-footer">
                        <button class="btn btn-secondary" data-action="cancel">${cancelText}</button>
                        <button class="btn ${dangerousAction ? 'btn-danger' : 'btn-primary'}" data-action="confirm">${confirmText}</button>
                    </div>
                </div>
            `;

            // 添加到页面
            document.body.appendChild(overlay);

            // 处理点击事件
            const handleAction = (confirmed) => {
                // 移除对话框
                overlay.style.animation = 'fadeOut 0.2s ease';
                setTimeout(() => {
                    if (overlay.parentElement) {
                        overlay.parentElement.removeChild(overlay);
                    }
                }, 200);

                // 执行回调
                if (confirmed && onConfirm) {
                    onConfirm();
                } else if (!confirmed && onCancel) {
                    onCancel();
                }

                resolve(confirmed);
            };

            // 按钮事件
            overlay.querySelector('[data-action="confirm"]').addEventListener('click', () => handleAction(true));
            overlay.querySelector('[data-action="cancel"]').addEventListener('click', () => handleAction(false));

            // 点击遮罩关闭
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    handleAction(false);
                }
            });

            // ESC键关闭
            const escHandler = (e) => {
                if (e.key === 'Escape') {
                    handleAction(false);
                    document.removeEventListener('keydown', escHandler);
                }
            };
            document.addEventListener('keydown', escHandler);
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// 创建全局Confirm实例
window.Confirm = new ConfirmDialog();

// 增强的confirm函数
window.confirmAction = async function(message, title = '确认操作', dangerousAction = false) {
    return await window.Confirm.show({
        title,
        message,
        type: dangerousAction ? 'danger' : 'warning',
        dangerousAction
    });
};

// ========== 表单验证工具 ==========

class FormValidator {
    constructor(formElement) {
        this.form = formElement;
        this.errors = {};
    }

    // 验证URL格式
    isValidURL(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    // 验证必填字段
    required(value, fieldName) {
        if (!value || value.trim() === '') {
            this.errors[fieldName] = `${fieldName}不能为空`;
            return false;
        }
        return true;
    }

    // 验证数字范围
    inRange(value, min, max, fieldName) {
        const num = Number(value);
        if (isNaN(num) || num < min || num > max) {
            this.errors[fieldName] = `${fieldName}必须在${min}到${max}之间`;
            return false;
        }
        return true;
    }

    // 显示错误信息
    showError(fieldId, message) {
        const field = document.getElementById(fieldId);
        if (!field) return;

        // 移除旧的错误提示
        this.clearError(fieldId);

        // 添加错误样式
        field.style.borderColor = '#ef4444';

        // 创建错误提示
        const errorDiv = document.createElement('div');
        errorDiv.className = 'field-error';
        errorDiv.style.cssText = 'color: #ef4444; font-size: 0.875rem; margin-top: 4px;';
        errorDiv.textContent = message;
        errorDiv.id = `${fieldId}-error`;

        // 插入错误提示
        field.parentElement.appendChild(errorDiv);
    }

    // 清除错误信息
    clearError(fieldId) {
        const field = document.getElementById(fieldId);
        if (!field) return;

        field.style.borderColor = '';

        const errorDiv = document.getElementById(`${fieldId}-error`);
        if (errorDiv) {
            errorDiv.remove();
        }
    }

    // 清除所有错误
    clearAllErrors() {
        this.errors = {};
        const errorDivs = document.querySelectorAll('.field-error');
        errorDivs.forEach(div => div.remove());

        const fields = this.form.querySelectorAll('input, select, textarea');
        fields.forEach(field => {
            field.style.borderColor = '';
        });
    }

    // 验证整个表单
    validate() {
        this.clearAllErrors();
        return Object.keys(this.errors).length === 0;
    }
}

window.FormValidator = FormValidator;

// ========== 加载指示器 ==========

window.showLoading = function(target, text = '加载中...') {
    const element = typeof target === 'string' ? document.getElementById(target) : target;
    if (!element) return;

    element.style.position = 'relative';

    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'loading-overlay';
    loadingDiv.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(255, 255, 255, 0.9);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        z-index: 100;
        border-radius: 8px;
    `;

    loadingDiv.innerHTML = `
        <div class="spinner"></div>
        <div style="margin-top: 12px; color: #6b7280; font-size: 0.875rem;">${text}</div>
    `;

    element.appendChild(loadingDiv);
    return loadingDiv;
};

window.hideLoading = function(target) {
    const element = typeof target === 'string' ? document.getElementById(target) : target;
    if (!element) return;

    const loading = element.querySelector('.loading-overlay');
    if (loading) {
        loading.remove();
    }
};

// ========== 工具函数 ==========

// 防抖函数
window.debounce = function(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

// 节流函数
window.throttle = function(func, limit = 300) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
};

// 复制到剪贴板
window.copyToClipboard = async function(text) {
    try {
        await navigator.clipboard.writeText(text);
        Toast.success('已复制到剪贴板');
        return true;
    } catch (err) {
        Toast.error('复制失败，请手动复制');
        return false;
    }
};

// 格式化文件大小
window.formatFileSize = function(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i];
};

// 格式化时间（相对时间）
window.formatRelativeTime = function(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} 天前`;
    if (hours > 0) return `${hours} 小时前`;
    if (minutes > 0) return `${minutes} 分钟前`;
    if (seconds > 0) return `${seconds} 秒前`;
    return '刚刚';
};

console.log('✓ UI Utils loaded');
