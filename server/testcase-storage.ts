import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==================== 数据模型 ====================

/**
 * 单个URL的配置项（可覆盖测试用例级别的默认配置）
 */
export interface PerUrlConfig {
    cookie?: string | Record<string, any>;
    extraHTTPHeaders?: Record<string, string>;
    blockList?: string[];
    customCss?: string;
    deviceOptions?: [string, Record<string, any>]; // ['Desktop' | 'Mobile', options]
    hooks?: {
        beforePageLoad?: string;
        onPageLoaded?: string;
        onPageTesting?: string;
        onPageCollecting?: string;
        onPageUnload?: string;
    };
    delayMs?: number;
    networkConditions?: {
        offline?: boolean;
        downloadThroughput?: number; // bytes/s
        uploadThroughput?: number; // bytes/s
        latency?: number; // ms
        connectionType?: string; // 'none' | 'cellular2g' | 'cellular3g' | 'cellular4g' | 'bluetooth' | 'ethernet' | 'wifi' | 'wimax' | 'other'
    };
}

/**
 * URL配置（支持描述和独立配置）
 */
export interface UrlConfig {
    url: string;
    description: string;
    config?: PerUrlConfig; // 可选的独立配置，会覆盖测试用例级别的默认配置
}

/**
 * Runner配置
 */
export interface RunnerConfig {
    Initialization?: {
        enabled: boolean;
        iterations: number;
    };
    Runtime?: {
        enabled: boolean;
        durationMs: number;
        delayMs: number;
    };
    MemoryLeak?: {
        enabled: boolean;
        intervalMs: number;
        iterations: number;
        onPageTesting?: string;
    };
}

/**
 * 高级配置（测试用例级别的默认配置）
 */
export interface AdvancedConfig {
    delayMs?: number;
    autoCookie?: {
        uid: string;
        env: string;
    };
    cookie?: string | Record<string, any>;
    extraHTTPHeaders?: Record<string, string>;
    blockList?: string[];
    customCss?: string;
    deviceOptions?: [string, Record<string, any>];
    networkConditions?: {
        offline?: boolean;
        downloadThroughput?: number; // bytes/s
        uploadThroughput?: number; // bytes/s
        latency?: number; // ms
        connectionType?: string; // 'none' | 'cellular2g' | 'cellular3g' | 'cellular4g' | 'bluetooth' | 'ethernet' | 'wifi' | 'wimax' | 'other'
    };
    hooks?: {
        beforePageLoad?: string;
        onPageLoaded?: string;
        onPageTesting?: string;
        onPageCollecting?: string;
        onPageUnload?: string;
    };
}

/**
 * 测试用例（后端存储版本，解耦执行状态）
 */
export interface TestCase {
    id: string; // 格式: testcase_${timestamp}_${randomId}
    name: string;
    runners: RunnerConfig;
    urlsWithDesc: UrlConfig[]; // 支持每个URL的独立配置
    mode: string; // 'headless' | 'normal'
    repeatCount: number;
    anonymous: boolean;
    cpuThrottling: number;
    description: string;
    tags: string[];
    advancedConfig?: AdvancedConfig; // 默认配置（应用于所有URL，除非URL有自己的配置）
    workerId?: string; // Worker节点ID（可选，用于指定执行节点）
    createdAt: string; // ISO timestamp
    updatedAt: string; // ISO timestamp
    executionHistory?: string[]; // 执行记录ID数组（关联到ExecutionRecord）
}

/**
 * 执行记录（增强版，关联到测试用例）
 */
export interface ExecutionRecord {
    id: string;
    testCaseId: string; // 关联的测试用例ID
    name: string;
    runner: string;
    status: 'completed' | 'error';
    startTime: Date;
    endTime: Date;
    duration: number; // 毫秒
    perfcatId?: string;
    perfcatUrl?: string;
    perfcatChartUrl?: string;
    exitCode?: number;
}

// ==================== 存储管理 ====================

let testCases: TestCase[] = [];
const testCasesFile = path.join(__dirname, '../testcases.json');

/**
 * 加载测试用例
 */
export async function loadTestCases(): Promise<void> {
    try {
        const data = await fs.readFile(testCasesFile, 'utf-8');
        testCases = JSON.parse(data);
        console.log(`[TestCaseStorage] 已加载 ${testCases.length} 个测试用例`);
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            console.log('[TestCaseStorage] 测试用例文件不存在，初始化为空数组');
            testCases = [];
        } else {
            console.error('[TestCaseStorage] 加载测试用例失败:', error);
            testCases = [];
        }
    }
}

/**
 * 保存测试用例
 */
export async function saveTestCases(): Promise<void> {
    try {
        await fs.writeFile(testCasesFile, JSON.stringify(testCases, null, 2), 'utf-8');
        console.log(`[TestCaseStorage] 已保存 ${testCases.length} 个测试用例`);
    } catch (error) {
        console.error('[TestCaseStorage] 保存测试用例失败:', error);
        throw error;
    }
}

/**
 * 获取所有测试用例
 */
export function getAllTestCases(): TestCase[] {
    return testCases;
}

/**
 * 根据ID获取测试用例
 */
export function getTestCaseById(id: string): TestCase | undefined {
    return testCases.find(tc => tc.id === id);
}

/**
 * 创建测试用例
 */
export async function createTestCase(testCase: Omit<TestCase, 'id' | 'createdAt' | 'updatedAt' | 'executionHistory'>): Promise<TestCase> {
    const now = new Date().toISOString();
    const randomId = Math.random().toString(36).substring(2, 10);

    const newTestCase: TestCase = {
        ...testCase,
        id: `testcase_${Date.now()}_${randomId}`,
        createdAt: now,
        updatedAt: now,
        executionHistory: []
    };

    testCases.unshift(newTestCase); // 最新的在前面
    await saveTestCases();

    console.log(`[TestCaseStorage] 创建测试用例: ${newTestCase.id} - ${newTestCase.name}`);
    return newTestCase;
}

/**
 * 更新测试用例
 */
export async function updateTestCase(id: string, updates: Partial<Omit<TestCase, 'id' | 'createdAt' | 'executionHistory'>>): Promise<TestCase | null> {
    const index = testCases.findIndex(tc => tc.id === id);
    if (index === -1) {
        return null;
    }

    const updatedTestCase: TestCase = {
        ...testCases[index],
        ...updates,
        updatedAt: new Date().toISOString()
    };

    testCases[index] = updatedTestCase;
    await saveTestCases();

    console.log(`[TestCaseStorage] 更新测试用例: ${id} - ${updatedTestCase.name}`);
    return updatedTestCase;
}

/**
 * 删除测试用例
 */
export async function deleteTestCase(id: string): Promise<boolean> {
    const index = testCases.findIndex(tc => tc.id === id);
    if (index === -1) {
        return false;
    }

    const deletedTestCase = testCases[index];
    testCases.splice(index, 1);
    await saveTestCases();

    console.log(`[TestCaseStorage] 删除测试用例: ${id} - ${deletedTestCase.name}`);
    return true;
}

/**
 * 添加执行记录到测试用例的历史中
 */
export async function addExecutionToHistory(testCaseId: string, executionRecordId: string): Promise<boolean> {
    const testCase = testCases.find(tc => tc.id === testCaseId);
    if (!testCase) {
        return false;
    }

    if (!testCase.executionHistory) {
        testCase.executionHistory = [];
    }

    testCase.executionHistory.unshift(executionRecordId); // 最新的在前面

    // 只保留最近50条执行记录
    if (testCase.executionHistory.length > 50) {
        testCase.executionHistory = testCase.executionHistory.slice(0, 50);
    }

    await saveTestCases();

    console.log(`[TestCaseStorage] 添加执行记录 ${executionRecordId} 到测试用例 ${testCaseId}`);
    return true;
}

/**
 * 根据标签筛选测试用例
 */
export function getTestCasesByTags(tags: string[]): TestCase[] {
    if (!tags || tags.length === 0) {
        return testCases;
    }

    return testCases.filter(tc =>
        tc.tags && tc.tags.some(tag => tags.includes(tag))
    );
}

/**
 * 搜索测试用例（根据名称或描述）
 */
export function searchTestCases(query: string): TestCase[] {
    if (!query) {
        return testCases;
    }

    const lowerQuery = query.toLowerCase();
    return testCases.filter(tc =>
        tc.name.toLowerCase().includes(lowerQuery) ||
        tc.description.toLowerCase().includes(lowerQuery)
    );
}
