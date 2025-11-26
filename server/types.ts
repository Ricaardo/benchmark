/**
 * 分布式架构类型定义
 */

// Worker 节点状态
export type WorkerStatus = 'online' | 'offline' | 'busy';

// Worker 性能等级
export type PerformanceTier = 'high' | 'medium' | 'low' | 'custom';

// Worker 节点信息
export interface WorkerNode {
    id: string;              // 唯一标识 (UUID)
    name: string;            // 节点名称 (用户自定义)
    host: string;            // IP地址
    port: number;            // 端口号
    platform: string;        // 操作系统 (win32/darwin/linux)
    arch: string;            // CPU架构 (x64/arm64)
    cpuCount: number;        // CPU核心数
    memory: number;          // 内存大小 (GB)
    performanceTier?: PerformanceTier;  // 性能等级 (高/中/低配)
    description?: string;    // 机器描述 (如: "MacBook Pro M1, 32GB RAM")
    status: WorkerStatus;    // 节点状态
    lastHeartbeat: number;   // 最后心跳时间戳
    currentTask?: string;    // 当前执行的任务ID（兼容旧版，已废弃）
    currentTasks: string[];  // 当前执行的任务ID列表（并发支持）
    maxConcurrency: number;  // 最大并发任务数
    capabilities: string[];  // 能力标签 (如: ['chromium', 'firefox'])
    tags: string[];          // 自定义标签 (如: ['production', 'testing'])
    registeredAt: number;    // 注册时间
    cpuUsage?: number;       // CPU使用率 (%)
    memoryUsage?: number;    // 内存使用率 (%)
}

// Worker 注册请求
export interface WorkerRegistration {
    name: string;
    host: string;
    port: number;
    platform: string;
    arch: string;
    cpuCount: number;
    memory: number;
    performanceTier?: PerformanceTier;  // 性能等级
    description?: string;    // 机器描述
    maxConcurrency?: number; // 最大并发任务数（默认根据CPU核心数）
    capabilities?: string[];
    tags?: string[];
}

// Worker 心跳数据
export interface WorkerHeartbeat {
    cpuUsage: number;
    memoryUsage: number;
    status: WorkerStatus;
    currentTask?: string;
}

// 分布式任务状态
export type DistributedTaskStatus =
    | 'pending'      // 等待分发
    | 'dispatched'   // 已分发
    | 'running'      // 执行中
    | 'completed'    // 已完成
    | 'failed'       // 失败
    | 'cancelled';   // 已取消

// 分布式任务
export interface DistributedTask {
    id: string;              // 任务ID
    testCaseId: string;      // 测试用例ID
    testCaseName: string;    // 测试用例名称
    workerId: string;        // Worker节点ID
    workerName: string;      // Worker节点名称
    runner: string;          // Runner类型
    status: DistributedTaskStatus;
    progress: number;        // 进度 (0-100)
    createdAt: number;       // 创建时间
    dispatchedAt?: number;   // 分发时间
    startedAt?: number;      // 开始时间
    completedAt?: number;    // 完成时间
    error?: string;          // 错误信息
    exitCode?: number;       // 退出码
    perfcatUrl?: string;     // Perfcat报告URL
    localReportPath?: string; // 本地报告路径
}

// 任务分发请求
export interface TaskDispatchRequest {
    testCaseId: string;
    workerId: string;        // 指定执行节点
    runner: string;
}

// 任务执行结果
export interface TaskExecutionResult {
    taskId: string;
    status: 'completed' | 'failed';
    exitCode: number;
    error?: string;
    perfcatUrl?: string;
    reportPath?: string;
    duration: number;
}

// WebSocket 消息类型
export type WSMessageType =
    | 'worker-registered'    // Worker注册成功
    | 'worker-status-update' // Worker状态更新
    | 'worker-offline'       // Worker离线
    | 'task-assigned'        // 任务已分配
    | 'task-progress'        // 任务进度更新
    | 'task-log'            // 任务日志
    | 'task-completed'       // 任务完成
    | 'task-failed'         // 任务失败
    | 'heartbeat-ack'       // 心跳确认
    | 'tasks'               // 任务列表（Master发送给前端）
    | 'status';             // 状态更新（Master发送给前端）

// WebSocket 消息
export interface WSMessage {
    type: WSMessageType;
    data: any;
    timestamp: number;
}

// 节点统计信息
export interface WorkerStats {
    totalWorkers: number;
    onlineWorkers: number;
    busyWorkers: number;
    offlineWorkers: number;
    totalTasks: number;
    runningTasks: number;
    completedTasks: number;
    failedTasks: number;
}
