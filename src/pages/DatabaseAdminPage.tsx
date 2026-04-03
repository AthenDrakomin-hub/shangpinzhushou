import { fetchApi } from '../utils/apiClient';
import { useState, useEffect } from 'react';
import { Database, RefreshCw, Table, FileText, Play, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, PageHeader, Button } from '../components/ui';

interface TableInfo {
  name: string;
  rows: number;
}

interface TableData {
  columns: { column_name: string; data_type: string }[];
  data: any[];
}

export default function DatabaseAdminPage() {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [activeTable, setActiveTable] = useState<string | null>(null);
  const [tableData, setTableData] = useState<TableData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [sqlQuery, setSqlQuery] = useState('');
  const [sqlResult, setSqlResult] = useState<any>(null);
  const [sqlError, setSqlError] = useState<string | null>(null);
  const [sqlLoading, setSqlLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'tables' | 'sql'>('tables');

  useEffect(() => {
    fetchTables();
  }, []);

  const fetchTables = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetchApi('/api/system/db/tables', {
        headers: { }
      });
      const data = await res.json();
      if (data.tables) {
        setTables(data.tables);
        if (data.tables.length > 0 && !activeTable) {
          fetchTableData(data.tables[0].name);
        }
      }
    } catch (e) {
      console.error('Failed to fetch tables:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchTableData = async (tableName: string) => {
    setActiveTable(tableName);
    setDataLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetchApi(`/api/system/db/tables/${tableName}`, {
        headers: { }
      });
      const data = await res.json();
      if (!data.error) {
        setTableData(data);
      }
    } catch (e) {
      console.error(`Failed to fetch data for ${tableName}:`, e);
    } finally {
      setDataLoading(false);
    }
  };

  const executeSql = async () => {
    if (!sqlQuery.trim()) return;
    setSqlLoading(true);
    setSqlError(null);
    setSqlResult(null);
    try {
      const res = await fetchApi('/api/system/db/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: sqlQuery })
      });
      const data = await res.json();
      if (!res.ok) {
        setSqlError(data.error || 'SQL 执行失败');
      } else {
        setSqlResult(data);
      }
    } catch (e) {
      setSqlError('网络请求失败');
    } finally {
      setSqlLoading(false);
    }
  };

  const formatCellValue = (value: any) => {
    if (value === null || value === undefined) return <span className="text-gray-400 italic">null</span>;
    if (typeof value === 'boolean') return <span className={value ? "text-green-600 font-medium" : "text-red-600 font-medium"}>{value.toString()}</span>;
    if (typeof value === 'object') return JSON.stringify(value);
    
    // 截断长文本
    const str = value.toString();
    if (str.length > 50) return <span title={str}>{str.substring(0, 47)}...</span>;
    return str;
  };

  return (
      <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col">
        <PageHeader
          title="数据库管理"
          subtitle="查看和分析系统底层数据表及执行自定义 SQL 操作"
          action={
            <div className="flex items-center gap-4">
              <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('tables')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'tables' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                >
                  表视图
                </button>
                <button
                  onClick={() => setViewMode('sql')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'sql' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                >
                  SQL执行器
                </button>
              </div>
              <Button
                variant="outline"
                icon={<RefreshCw className="w-4 h-4" />}
                onClick={() => {
                  fetchTables();
                  if (activeTable) fetchTableData(activeTable);
                }}
              >
                刷新数据
              </Button>
            </div>
          }
        />

        {viewMode === 'tables' ? (
          <div className="flex gap-6 flex-1 min-h-0">
            {/* 左侧表列表 */}
        <Card className="w-64 shrink-0 flex flex-col h-full overflow-hidden">
          <CardHeader title="数据表" />
          <div className="flex-1 overflow-y-auto p-2">
            {loading ? (
              <div className="flex justify-center p-4"><div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div></div>
            ) : (
              <div className="space-y-1">
                {tables.map(t => (
                  <button
                    key={t.name}
                    onClick={() => fetchTableData(t.name)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors ${
                      activeTable === t.name 
                        ? 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 font-medium' 
                        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Table className="w-4 h-4 shrink-0 opacity-50" />
                      <span className="truncate">{t.name}</span>
                    </div>
                    <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full shrink-0">
                      {t.rows}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* 右侧数据展示 */}
        <Card className="flex-1 flex flex-col h-full overflow-hidden">
          {activeTable && tableData ? (
            <>
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/30 shrink-0">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-gray-500" />
                  <h3 className="font-semibold text-lg">
                    {activeTable}
                  </h3>
                  <span className="text-xs text-gray-500 bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
                    显示最新 50 条记录
                  </span>
                </div>
              </div>

              <div className="flex-1 overflow-auto">
                {dataLoading ? (
                  <div className="flex justify-center items-center h-64">
                    <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : tableData.data.length === 0 ? (
                  <div className="flex justify-center items-center h-64 text-gray-500">表为空</div>
                ) : (
                  <table className="min-w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-gray-50 dark:bg-gray-800/80 sticky top-0 z-10 shadow-sm">
                      <tr>
                        {tableData.columns.map(col => (
                          <th key={col.column_name} className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex flex-col">
                              <span>{col.column_name}</span>
                              <span className="text-[10px] text-gray-400 font-normal mt-0.5">{col.data_type}</span>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {tableData.data.map((row, i) => (
                        <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          {tableData.columns.map(col => (
                            <td key={col.column_name} className="px-4 py-2 text-gray-700 dark:text-gray-300 max-w-[200px] truncate">
                              {formatCellValue(row[col.column_name])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex justify-center items-center text-gray-400 flex-col gap-2">
              <Database className="w-12 h-12 opacity-20" />
              <p>请在左侧选择要查看的数据表</p>
            </div>
          )}
        </Card>
        </div>
        ) : (
          <div className="flex gap-6 flex-1 min-h-0 flex-col">
            <Card className="shrink-0 flex flex-col overflow-hidden">
              <CardHeader title="SQL 执行器" />
              <CardContent className="p-4 flex flex-col gap-4">
                <div className="flex gap-2 flex-wrap">
                  <span className="text-sm font-medium text-gray-500 py-1 mr-2">操作模板 (点击填充):</span>
                  <button onClick={() => setSqlQuery("SELECT * FROM public.users LIMIT 10;")} className="px-3 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100 border border-blue-100 transition-colors">查数据</button>
                  <button onClick={() => setSqlQuery("UPDATE public.users SET role = 'manager' WHERE email = 'xxx@example.com';")} className="px-3 py-1 text-xs bg-orange-50 text-orange-600 rounded hover:bg-orange-100 border border-orange-100 transition-colors">改角色</button>
                  <button onClick={() => setSqlQuery("DELETE FROM public.users WHERE email = 'xxx@example.com';")} className="px-3 py-1 text-xs bg-red-50 text-red-600 rounded hover:bg-red-100 border border-red-100 transition-colors">删记录</button>
                  <button onClick={() => setSqlQuery("ALTER TABLE public.users ADD COLUMN new_column VARCHAR(255);")} className="px-3 py-1 text-xs bg-purple-50 text-purple-600 rounded hover:bg-purple-100 border border-purple-100 transition-colors">增字段</button>
                  <button onClick={() => setSqlQuery("ALTER TABLE public.users DROP COLUMN old_column;")} className="px-3 py-1 text-xs bg-purple-50 text-purple-600 rounded hover:bg-purple-100 border border-purple-100 transition-colors">删字段</button>
                </div>
                <textarea
                  value={sqlQuery}
                  onChange={(e) => setSqlQuery(e.target.value)}
                  className="w-full h-32 p-3 font-mono text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-800 dark:text-gray-200"
                  placeholder="输入 SQL 语句 (例如: SELECT * FROM users LIMIT 10;)"
                ></textarea>
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-500 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-yellow-500" />
                    请谨慎执行 UPDATE 或 DELETE 操作，修改不可逆。
                  </div>
                  <Button variant="primary" loading={sqlLoading} onClick={executeSql} icon={<Play className="w-4 h-4" />}>
                    执行 SQL
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <CardHeader title="执行结果" />
              <CardContent className="flex-1 overflow-auto p-0">
                {sqlError ? (
                  <div className="p-6 text-red-500 bg-red-50 dark:bg-red-900/10 border-b border-red-100 dark:border-red-900/20 m-4 rounded-lg">
                    <p className="font-semibold mb-1">执行失败:</p>
                    <p className="font-mono text-sm">{sqlError}</p>
                  </div>
                ) : sqlResult ? (
                  <div className="p-0">
                    <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 border-b border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300">
                      命令: <span className="font-mono text-blue-600 dark:text-blue-400">{sqlResult.command}</span> |
                      影响行数: <span className="font-mono text-green-600 dark:text-green-400">{sqlResult.rowCount}</span>
                      {sqlResult.message && <span className="ml-2 text-gray-500">({sqlResult.message})</span>}
                    </div>

                    {sqlResult.rows && sqlResult.rows.length > 0 && (
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-left text-sm whitespace-nowrap">
                          <thead className="bg-gray-50 dark:bg-gray-800/80 sticky top-0 z-10 shadow-sm">
                            <tr>
                              {sqlResult.fields?.map((field: string) => (
                                <th key={field} className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                                  {field}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {sqlResult.rows.map((row: any, i: number) => (
                              <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                {sqlResult.fields?.map((field: string) => (
                                  <td key={field} className="px-4 py-2 text-gray-700 dark:text-gray-300 max-w-[200px] truncate">
                                    {formatCellValue(row[field])}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {sqlResult.rows && sqlResult.rows.length === 0 && (
                      <div className="p-8 text-center text-gray-500">
                        执行成功，但没有返回数据。
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex-1 flex justify-center items-center text-gray-400 flex-col gap-2 h-64">
                    <Database className="w-12 h-12 opacity-20" />
                    <p>等待执行 SQL 语句</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    );
  }
