import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, ChevronDown, Users, Shield, Briefcase, User, Trash2, Plus } from 'lucide-react';
import { Badge } from './index';

interface UserNode {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  children?: UserNode[];
}

interface TreeNodeProps {
  node: UserNode;
  level?: number;
  onDelete?: (id: string) => void;
  onAddChild?: (parentId: string, parentRole: string) => void;
}

const RoleIcon = ({ role }: { role: string }) => {
  switch (role) {
    case 'chief_engineer': return <Shield className="w-4 h-4 text-red-500" />;
    case 'manager': return <Briefcase className="w-4 h-4 text-purple-500" />;
    case 'supervisor': return <Users className="w-4 h-4 text-blue-500" />;
    default: return <User className="w-4 h-4 text-green-500" />;
  }
};

const RoleLabel = ({ role }: { role: string }) => {
  switch (role) {
    case 'chief_engineer': return '首席工程师';
    case 'manager': return '经理';
    case 'supervisor': return '主管';
    default: return '员工';
  }
};

const TreeNode = ({ node, level = 0, onDelete, onAddChild }: TreeNodeProps) => {
  const [expanded, setExpanded] = useState(level < 2);
  const hasChildren = node.children && node.children.length > 0;

  // 只能在自己非员工角色下添加子级
  const canAddChild = node.role !== 'employee' && node.role !== 'staff';

  return (
    <div className="select-none group">
      <div 
        className={`flex items-center justify-between py-3 px-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-b border-gray-100 dark:border-gray-700 ${level === 0 ? 'bg-gray-50/50 dark:bg-gray-800/30' : ''}`}
        style={{ paddingLeft: `${Math.max(1, level * 2)}rem` }}
      >
        <div 
          className="flex items-center gap-3 flex-1 cursor-pointer"
          onClick={() => hasChildren && setExpanded(!expanded)}
        >
          <div className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-blue-500">
            {hasChildren ? (expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />) : <span className="w-4 h-4" />}
          </div>
          
          <div className="flex items-center gap-2 flex-1">
            <RoleIcon role={node.role} />
            <span className="font-medium text-gray-900 dark:text-white">{node.name || node.email}</span>
            {node.name && <span className="text-sm text-gray-500 dark:text-gray-400">({node.email})</span>}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Badge variant={
            node.role === 'chief_engineer' ? 'danger' :
            node.role === 'manager' ? 'primary' :
            node.role === 'supervisor' ? 'warning' : 'success'
          }>
            <RoleLabel role={node.role} />
          </Badge>
          
          <Badge variant={node.status === 'active' ? 'success' : 'default'}>
            {node.status === 'active' ? '正常' : '已禁用'}
          </Badge>

          {/* 悬浮显示操作按钮 */}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 ml-2">
            {canAddChild && onAddChild && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAddChild(node.id, node.role);
                }}
                className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
                title="添加下属"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
            {node.role !== 'chief_engineer' && onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(node.id);
                }}
                className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                title="删除该成员"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
      
      <AnimatePresence>
        {expanded && hasChildren && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            {node.children!.map(child => (
              <TreeNode 
                key={child.id} 
                node={child} 
                level={level + 1} 
                onDelete={onDelete} 
                onAddChild={onAddChild} 
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function UserTreeView({ 
  data, 
  onDelete, 
  onAddChild 
}: { 
  data: UserNode[], 
  onDelete?: (id: string) => void,
  onAddChild?: (parentId: string, parentRole: string) => void
}) {
  if (!data || data.length === 0) {
    return <div className="p-8 text-center text-gray-500">暂无数据</div>;
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-900">
      {data.map(root => (
        <TreeNode 
          key={root.id} 
          node={root} 
          level={0} 
          onDelete={onDelete} 
          onAddChild={onAddChild} 
        />
      ))}
    </div>
  );
}
