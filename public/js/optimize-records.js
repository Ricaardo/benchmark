/**
 * Records页面优化脚本
 * 将alert和confirm替换为Toast和Confirm
 */

// 重写deleteRecord函数
window.deleteRecord = async function(id) {
    const confirmed = await Confirm.show({
        title: '删除测试记录',
        message: '确定要删除这条测试记录吗？',
        type: 'warning',
        confirmText: '删除',
        cancelText: '取消'
    });

    if (!confirmed) return;

    try {
        const response = await fetch(`/api/test-records/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            Toast.success('记录已删除');
            await loadRecords();
        } else {
            Toast.error('删除失败');
        }
    } catch (error) {
        console.error('Failed to delete record:', error);
        Toast.error('删除失败');
    }
};

// 重写clearAllRecords函数
window.clearAllRecords = async function() {
    const confirmed = await Confirm.show({
        title: '清空所有记录',
        message: '确定要清空所有测试记录吗？此操作不可恢复！',
        type: 'danger',
        confirmText: '清空',
        cancelText: '取消',
        dangerousAction: true
    });

    if (!confirmed) return;

    try {
        const response = await fetch('/api/test-records/clear', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });

        if (response.ok) {
            Toast.success('所有记录已清空');
            await loadRecords();
        } else {
            Toast.error('清空失败');
        }
    } catch (error) {
        console.error('Failed to clear records:', error);
        Toast.error('清空失败');
    }
};

// 重写refreshRecords函数
window.refreshRecords = async function() {
    currentPage = 0;
    await loadRecords();
    Toast.success('已刷新', '');
};

// 重写showToast为使用新的Toast系统
if (typeof showToast !== 'undefined') {
    window.showToast = function(message, type = 'success') {
        return Toast.show({ message, type });
    };
}

console.log('✓ Records optimization loaded');
