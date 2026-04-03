import { fetchApi } from '../utils/apiClient';
import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Activity, Database, Users, HardDrive, Cpu, Clock, Code } from 'lucide-react';
import { Card, CardContent, CardHeader, PageHeader } from '../components/ui';

export default function ChiefEngineerDashboard() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchStatus = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetchApi('/api/system/status', {
        headers: { }
      });
      const data = await res.json();
      if (!data.error) {
        setStatus(data);
      }
    } catch (e) {
      console.error('Failed to fetch system status', e);
    } finally {
      setLoading(false);
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / (3600 * 24));
    const hours = Math.floor((seconds % (3600 * 24)) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${days}天 ${hours}小时 ${mins}分`;
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading && !status) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div></div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="系统监控大盘" 
        subtitle="实时监控服务器资源与项目运行状态"
        breadcrumbs={[{ label: '管理' }, { label: '监控大盘' }]}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">系统运行时长</p>
                  <p className="text-2xl font-bold mt-1">{status ? formatUptime(status.uptime) : '-'}</p>
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">数据库容量</p>
                  <p className="text-2xl font-bold mt-1">{status?.db?.size || '-'}</p>
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Database className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">总用户数</p>
                  <p className="text-2xl font-bold mt-1">{status?.db?.userCount || 0}</p>
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm">Node 环境</p>
                  <p className="text-2xl font-bold mt-1">{status?.nodeVersion || '-'}</p>
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Code className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="服务器资源" />
          <CardContent className="p-6 space-y-6">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <Cpu className="w-4 h-4" /> CPU 负载 (1m, 5m, 15m)
                </span>
                <span className="text-sm text-gray-500">
                  {status?.cpuLoad?.map((l: number) => l.toFixed(2)).join(', ') || '-'}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full" 
                  style={{ width: `${Math.min(100, (status?.cpuLoad?.[0] || 0) * 10)}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <HardDrive className="w-4 h-4" /> 系统内存使用
                </span>
                <span className="text-sm text-gray-500">
                  {status ? `${formatBytes(status.systemMemory.total - status.systemMemory.free)} / ${formatBytes(status.systemMemory.total)}` : '-'}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-purple-600 h-2 rounded-full" 
                  style={{ width: status ? `${((status.systemMemory.total - status.systemMemory.free) / status.systemMemory.total) * 100}%` : '0%' }}
                ></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <Activity className="w-4 h-4" /> Node 进程内存 (RSS)
                </span>
                <span className="text-sm text-gray-500">
                  {status ? formatBytes(status.memoryUsage.rss) : '-'}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full" 
                  style={{ width: status ? `${(status.memoryUsage.rss / status.systemMemory.total) * 100}%` : '0%' }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="系统配置与日志状态" />
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <span className="text-sm text-gray-600 dark:text-gray-400">总订单数</span>
                <span className="font-semibold">{status?.db?.orderCount || 0}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <span className="text-sm text-gray-600 dark:text-gray-400">Web 服务器</span>
                <span className="font-semibold text-green-600">正常运行 (Express)</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <span className="text-sm text-gray-600 dark:text-gray-400">错误日志</span>
                <span className="font-semibold text-blue-600 cursor-pointer hover:underline">点击查看 (需接入日志系统)</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
