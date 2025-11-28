import { useState } from 'react';
import { Header, Footer, VPSCard, VPSTable, LatencyPanel } from './components';
import { useVPSData } from './hooks';

function App() {
  const {
    nodes,
    latencyTests,
    isLoading,
    isRefreshing,
    isTesting,
    lastUpdate,
    refresh,
    runLatencyTest,
  } = useVPSData();

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  // 格式化最后更新时间
  const formatLastUpdate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">正在加载服务器数据...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        nodes={nodes}
        latencyTests={latencyTests}
        onRefresh={refresh}
        isRefreshing={isRefreshing}
      />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* 工具栏 - 紧凑单行 */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-sm sm:text-base font-semibold text-slate-800 dark:text-white">服务器</h2>
            <span className="text-xs text-slate-500 dark:text-gray-400">{nodes.length}个</span>
            <span className="hidden sm:inline text-xs text-slate-400 dark:text-gray-500">· {formatLastUpdate(lastUpdate)}</span>
          </div>

          {/* 视图切换 */}
          <div className="flex bg-slate-200 dark:bg-slate-800 rounded p-0.5">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-2 py-0.5 rounded text-xs transition-colors ${viewMode === 'grid'
                ? 'bg-indigo-500 text-white'
                : 'text-slate-600 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white'
                }`}
            >
              网格
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-2 py-0.5 rounded text-xs transition-colors ${viewMode === 'list'
                ? 'bg-indigo-500 text-white'
                : 'text-slate-600 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white'
                }`}
            >
              列表
            </button>
          </div>
        </div>

        {/* VPS 卡片网格 / 表格 */}
        <div className="mb-4">
          {viewMode === 'grid' ? (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {nodes.map(node => {
                const latencyTest = latencyTests.find(t => t.nodeId === node.id);
                return (
                  <VPSCard
                    key={node.id}
                    node={node}
                    latencyTest={latencyTest}
                    viewMode={viewMode}
                  />
                );
              })}
            </div>
          ) : (
            <VPSTable nodes={nodes} latencyTests={latencyTests} />
          )}
        </div>

        {/* 延迟测试面板 */}
        <LatencyPanel
          nodes={nodes}
          latencyTests={latencyTests}
          onRunTest={runLatencyTest}
          isTesting={isTesting}
        />

        {/* 说明信息 */}
        <div className="mt-4 bg-white/80 dark:bg-slate-800/50 rounded-xl p-6 border border-slate-200 dark:border-slate-700/50">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">使用说明</h3>
          <div className="grid md:grid-cols-2 gap-6 text-sm text-slate-600 dark:text-gray-400">
            <div>
              <h4 className="text-slate-700 dark:text-white font-medium mb-2">关于数据</h4>
              <ul className="space-y-1 list-disc list-inside">
                <li>当前显示为模拟数据，实际部署需配合后端 API</li>
                <li>数据每 5 秒自动更新一次</li>
                <li>点击刷新按钮可手动获取最新数据</li>
              </ul>
            </div>
            <div>
              <h4 className="text-slate-700 dark:text-white font-medium mb-2">部署方式</h4>
              <ul className="space-y-1 list-disc list-inside">
                <li>支持 Vercel、Netlify、GitHub Pages 等平台</li>
                <li>运行 <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">npm run build</code> 构建生产版本</li>
                <li>修改 <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">src/data/mockData.ts</code> 配置节点</li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default App;
