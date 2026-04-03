import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, ChevronDown, Users, Shield, Briefcase, User } from 'lucide-react';
import { Badge } from './index';

interface UserNode {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  children?: UserNode[];
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

const TreeNode = ({ node, level = 0 }: { node: UserNode, level?: number }) => {
  const [expanded, setExpanded] = useState(level < 2);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className="select-none">
      <div 
        className={`flex items-center gap-3 py-3 px-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-b border-gray-100 dark:border-gray-700 ${level === 0 ? 'bg-gray-50/50 dark:bg-gray-800/30' : ''}`}
        style={{ paddingLeft: `${Math.max(1, level * 2)}rem` }}
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        <div className="w-5 h-5 flex items-center justify-center cursor-pointer text-gray-400 hover:text-blue-500">
          {hasChildren ? (expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />) : <span className="w-4 h-4" />}
        </div>
        
        <div className="flex items-center gap-2 flex-1">
          <RoleIcon role={node.role} />
          <span className="font-medium text-gray-900 dark:text-white">{node.name || node.email}</span>
          {node.name && <span className="text-sm text-gray-500 dark:text-gray-400">({node.email})</span>}
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
              <TreeNode key={child.id} node={child} level={level + 1} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function UserTreeView({ data }: { data: UserNode[] }) {
  if (!data || data.length === 0) {
    return <div className="p-8 text-center text-gray-500">暂无数据</div>;
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-900">
      {data.map(root => (
        <TreeNode key={root.id} node={root} level={0} />
      ))}
    </div>
  );
}
