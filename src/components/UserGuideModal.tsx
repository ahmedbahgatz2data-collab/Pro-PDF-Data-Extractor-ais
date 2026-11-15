import React from 'react';
import { X, FileText, CheckCircle, Sparkles, Table, Search, ListOrdered, Download } from 'lucide-react';
import { generateUserGuidePDF } from '../utils/generateUserGuidePDF';

interface UserGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UserGuideModal({ isOpen, onClose }: UserGuideModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-slate-950 text-slate-100 rounded-2xl border border-slate-800 shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">دليل استخدام تطبيق Pro PDF Data Extractor</h3>
              <p className="text-xs text-slate-400">الدليل الشامل لاستخراج النصوص، الكلمات المفتاحية، والجداول المتقدمة.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-xl transition-colors cursor-pointer"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-sm text-slate-300">
          
          {/* Download PDF Action Banner */}
          <div className="p-4 bg-blue-950/40 border border-blue-800/60 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-md shadow-blue-600/30">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-white text-xs sm:text-sm">تحميل الدليل الرسمي بصيغة PDF</h4>
                <p className="text-xs text-slate-300">احصل على نسخة مرئية جاهزة للطباعة أو المشاركة.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => generateUserGuidePDF()}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-blue-600/20"
            >
              <FileText className="w-4 h-4" />
              <span>تحميل ملف PDF الآن</span>
            </button>
          </div>

          {/* Feature 1 */}
          <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-xl space-y-2">
            <div className="flex items-center gap-2 font-bold text-white text-xs sm:text-sm">
              <span className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-mono">1</span>
              <ListOrdered className="w-4 h-4 text-blue-400" />
              <span>استخراج سطر محدد (Line Numbers Extraction)</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed pr-8">
              حدد أرقام الأسطر المطلوبة بدقة (مثل: <code className="bg-slate-800 px-1 py-0.5 rounded text-blue-300">1, 3, 5-8</code>) لاستخراج النصوص الموجودة في تلك الأسطر عبر ملف واحد أو عدة ملفات PDF دفعة واحدة.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-xl space-y-2">
            <div className="flex items-center gap-2 font-bold text-white text-xs sm:text-sm">
              <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-mono">2</span>
              <Search className="w-4 h-4 text-emerald-400" />
              <span>البحث بالكلمات المفتاحية (Keywords Search)</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed pr-8">
              ابحث عن كلمات مفتاحية مثل (<code className="bg-slate-800 px-1 py-0.5 rounded text-emerald-300">التاريخ، الإجمالي، رقم الفاتورة</code>)، مع إمكانية اختيار <b className="text-emerald-300">Next Line(s)</b> لاستخراج سطر واحد أو عدة أسطر متتالية بعد الكلمة المفتاحية (مع تحديد عدد الأسطر ونقطة البداية والفاصل)، أو استخراج القيمة على نفس السطر. يدعم النظام معالجة وتطبيع اللغة العربية بذكاء.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-xl space-y-2">
            <div className="flex items-center gap-2 font-bold text-white text-xs sm:text-sm">
              <span className="w-6 h-6 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs font-mono">3</span>
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>الوضع المدمج (Combined Mode)</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed pr-8">
              يتيح لك استخراج أسطر معينة والبحث عن كلمات مفتاحية في آن واحد، ليتم تجميع النتائج في صف موحد لكل ملف لسهولة المقارنة والتحليل.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-xl space-y-2">
            <div className="flex items-center gap-2 font-bold text-white text-xs sm:text-sm">
              <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-mono">4</span>
              <Table className="w-4 h-4 text-amber-400" />
              <span>التعرف التلقائي على الجداول (Table Auto-Detect)</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed pr-8">
              تقنية التحليل الهندسي المتقدم (Spatial Clustering) لتحديد الجداول، العرائس، وعواميد البيانات تلقائياً دون الحاجة لإدخال أسطر أو كلمات مفتاحية يدوياً.
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            فهمت. إغلاق الدليل
          </button>
        </div>

      </div>
    </div>
  );
}
