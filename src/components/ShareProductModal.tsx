import React, { useState } from 'react';
import Button from './ui/Button';
import Modal from './ui/Modal';

export default function ShareProductModal({ 
  product, 
  onClose, 
  showToast 
}: { 
  product: any; 
  onClose: () => void; 
  showToast: (msg: string, type?: 'success' | 'error') => void;
}) {
  const [template, setTemplate] = useState(product?.template_id || 'default');
  const [generating, setGenerating] = useState(false);
  const [posterUrl, setPosterUrl] = useState('');

  const TEMPLATES = [
    { id: 'default', name: '默认' },
    { id: 'daifu', name: '代付' },
    { id: 'meituan', name: '美团' },
    { id: 'eleme', name: '饿了么' },
    { id: 'jd', name: '京东' },
    { id: 'ctrip', name: '携程' },
    { id: 'douyin', name: '抖音' },
    { id: 'kuaishou', name: '快手' },
  ];

  const copyShareLink = () => {
    if (!product) return;
    const link = `${window.location.origin}/h5/${product.id}?template=${template}`;
    navigator.clipboard.writeText(link);
    showToast('链接已复制到剪贴板');
  };

  const handleGenerate = async () => {
    if (!product) return;
    setGenerating(true);
    setPosterUrl('');
    try {
      const response = await fetch('/api/poster/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id, template }),
      });
      if (response.ok) {
        const blob = await response.blob();
        setPosterUrl(URL.createObjectURL(blob));
      } else {
        const data = await response.json();
        showToast(data.error || '生成失败', 'error');
      }
    } catch (error) {
      showToast('生成失败，请重试', 'error');
    } finally {
      setGenerating(false);
    }
  };

  if (!product) return null;

  return (
    <Modal isOpen={!!product} onClose={onClose} title="分享商品">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">商品链接</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={`${window.location.origin}/h5/${product.id}?template=${template}`}
              className="flex-1 px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-500 text-sm"
            />
            <Button variant="secondary" onClick={copyShareLink}>复制</Button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">选择海报模板</label>
          <div className="grid grid-cols-4 gap-2">
            {TEMPLATES.map(t => (
              <button
                key={t.id}
                onClick={() => {
                  setTemplate(t.id);
                  setPosterUrl('');
                }}
                className={`py-2 px-1 rounded-lg text-xs font-medium border-2 transition-all ${
                  template === t.id 
                    ? 'border-blue-500 bg-blue-50 text-blue-600' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>

        <Button 
          variant="primary" 
          className="w-full" 
          loading={generating} 
          onClick={handleGenerate}
        >
          {generating ? '生成中...' : '生成海报'}
        </Button>

        {posterUrl && (
          <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col items-center">
            <p className="text-xs text-gray-500 mb-2">长按或右键保存海报</p>
            <img src={posterUrl} alt="分享海报" className="w-48 rounded-xl shadow-lg border border-gray-100" />
          </div>
        )}
      </div>
    </Modal>
  );
}