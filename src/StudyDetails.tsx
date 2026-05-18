
import React from 'react';
import { ClipboardList, Hash, Settings, Calendar, GitBranch, FileText, UserCheck, LayoutGrid } from 'lucide-react';
import { Language, translations } from './locales';
import { AppTheme, StudyInfo } from './types';

interface StudyDetailsProps {
  info: StudyInfo;
  setInfo: React.Dispatch<React.SetStateAction<StudyInfo>>;
  language: Language;
  theme?: AppTheme;
  themeColor?: {
    border: string;
    text: string;
    hex: string;
  };
  themeMode?: 'light' | 'dark';
  isDemoMode?: boolean;
}

const StudyDetails: React.FC<StudyDetailsProps> = ({ info, setInfo, language, theme = 'soft', themeColor, themeMode = 'light', isDemoMode = false }) => {
  const t = translations[language];

  // Default fallback
  const activeColor = themeColor || {
    border: 'border-amber-500',
    text: 'text-amber-500',
    hex: '#f59e0b'
  };

  const handleChange = (field: keyof StudyInfo, value: string) => {
    setInfo(prev => ({ ...prev, [field]: value }));
  };

  const containerClass = `${themeMode === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white ' + activeColor.border} rounded-none shadow-none border-[3px] h-full flex flex-col`;
  const headerClass = `${themeMode === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white ' + activeColor.border + ' text-slate-900'} border-b-[3px]`;
  const iconColor = activeColor.text;
  const labelColor = `font-mono ${themeMode === 'dark' ? 'text-slate-100' : 'text-black'}`;
  const inputClass = `${themeMode === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500' : 'bg-white ' + activeColor.border + ' text-slate-900 placeholder:text-slate-600'} border-2 focus:ring-2 focus:ring-opacity-50 rounded-sm outline-none`;
  
  // Dynamic SVG color for select arrow
  const arrowColor = activeColor.hex.replace('#', '');
  const selectStyle = `block w-full px-3 md:px-4 h-[36px] md:h-[40px] text-sm font-bold ${themeMode === 'dark' ? 'bg-slate-800 text-slate-100 border-slate-700' : 'bg-white text-slate-900 ' + activeColor.border} border-2 rounded-sm appearance-none focus:outline-none focus:ring-2 focus:ring-opacity-50 focus:border-transparent transition-all cursor-pointer bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22%23${arrowColor}%22%3E%3Cpath%20fill-rule%3D%22evenodd%22%20d%3D%22M5.293%207.293a1%201%200%20011.414%200L10%2010.586l3.293-3.293a1%201%200%20111.414%201.414l-4%204a1%201%200%2001-1.414%200l-4-4a1%201%200%20010-1.414z%22%20clip-rule%3D%22evenodd%22%20%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-no-repeat bg-[right_0.5rem_center] shadow-sm`;

  return (
    <div className={`${containerClass} h-full break-inside-avoid overflow-hidden print:shadow-none print:border print:border-slate-300 print:rounded-none`}>
      <div className={`${headerClass} px-4 h-12 md:h-14 flex items-center justify-between shrink-0 print:bg-white print:border-b print:border-slate-200`}>
        <div className="flex items-center gap-2">
          <ClipboardList className={`w-4 h-4 md:w-6 md:h-6 ${themeMode === 'dark' ? 'text-slate-100' : 'text-black'}`} />
          <h2 className="text-sm md:text-base font-bold uppercase tracking-wider">{t.studyInfo}</h2>
        </div>
      </div>
      
      <div className="p-3 md:p-4 space-y-3 md:space-y-6 flex-1">
        
        {/* Studietyp */}
        <div className="relative group">
            <div className="flex items-center mb-1 h-5 md:h-6">
                <label className={`flex items-center gap-2 text-[10px] md:text-[12px] font-bold uppercase tracking-wider ${labelColor} select-none`}>
                    <LayoutGrid className="w-4 h-4 md:w-4.5 md:h-4.5 shrink-0" /> {t.typeStudy}
                </label>
            </div>
            <select
                value={info.studyType}
                onChange={(e) => handleChange('studyType', e.target.value)}
                className={selectStyle}
            >
                <option value="Machine">{t.typeMachine}</option>
                <option value="Process">{t.typeProcess}</option>
                <option value="Performance">{t.typePerformance}</option>
            </select>
        </div>

        {/* Rad 1: Artikelnummer (50%) + Utgåva (50%) - Åtgärdat för mobil */}
        <div className="grid grid-cols-2 gap-3 md:gap-4">
            <div className="relative group">
                <div className="flex items-center mb-1 h-5 md:h-6">
                    <label className={`flex items-center gap-2 text-[10px] md:text-[12px] font-bold uppercase tracking-wider ${labelColor} select-none truncate`}>
                        <Hash className="w-4 h-4 md:w-4.5 md:h-4.5 shrink-0" /> {t.partNo}
                    </label>
                </div>
                <input
                    type="text"
                    value={info.partNumber}
                    onChange={(e) => handleChange('partNumber', e.target.value)}
                    placeholder="207-554"
                    className={`w-full px-3 md:px-4 py-1.5 md:py-2 h-[36px] md:h-[40px] text-sm font-medium placeholder:text-slate-600 transition-all border-2 ${inputClass}`}
                />
            </div>
            <div className="relative group">
                <div className="flex items-center mb-1 h-5 md:h-6">
                    <label className={`flex items-center gap-2 text-[10px] md:text-[12px] font-bold uppercase tracking-wider ${labelColor} select-none truncate`}>
                        <GitBranch className="w-4 h-4 md:w-4.5 md:h-4.5 shrink-0" /> {t.revision}
                    </label>
                </div>
                <input
                    type="text"
                    value={info.revision}
                    onChange={(e) => handleChange('revision', e.target.value)}
                    placeholder="001"
                    className={`w-full px-3 md:px-4 py-1.5 md:py-2 h-[36px] md:h-[40px] text-sm font-medium placeholder:text-slate-600 transition-all border-2 ${inputClass}`}
                />
            </div>
        </div>

        {/* Rad 2: Maskinnummer + Datum */}
        <div className="grid grid-cols-2 gap-3 md:gap-4">
            <div className="relative group">
                <div className="flex items-center mb-1 h-5 md:h-6">
                    <label className={`flex items-center gap-2 text-[10px] md:text-[12px] font-bold uppercase tracking-wider ${labelColor} select-none`}>
                        <Settings className="w-4 h-4 md:w-4.5 md:h-4.5 shrink-0" /> {t.machineNo}
                    </label>
                </div>
                <input
                    type="text"
                    value={info.machineNumber}
                    onChange={(e) => handleChange('machineNumber', e.target.value)}
                    placeholder="-"
                    className={`w-full px-3 md:px-4 py-1.5 md:py-2 h-[36px] md:h-[40px] text-sm font-medium placeholder:text-slate-600 transition-all border-2 ${inputClass}`}
                />
            </div>
            <div className="relative group">
                <div className="flex items-center mb-1 h-5 md:h-6">
                    <label className={`flex items-center gap-2 text-[10px] md:text-[12px] font-bold uppercase tracking-wider ${labelColor} select-none`}>
                        <Calendar className="w-4 h-4 md:w-4.5 md:h-4.5 shrink-0" /> {t.date}
                    </label>
                </div>
                <input
                    type="date"
                    value={info.date}
                    onChange={(e) => handleChange('date', e.target.value)}
                    className={`w-full px-3 md:px-4 py-1.5 md:py-2 h-[36px] md:h-[40px] text-sm font-medium transition-all border-2 ${inputClass}`}
                />
            </div>
        </div>

        {/* Rad 3: Utförd av */}
        <div className="relative group">
            <div className="flex items-center mb-1 h-5 md:h-6">
                <label className={`flex items-center gap-2 text-[10px] md:text-[12px] font-bold uppercase tracking-wider ${labelColor} select-none`}>
                    <UserCheck className="w-4 h-4 md:w-4.5 md:h-4.5 shrink-0" /> {t.performedBy}
                </label>
            </div>
            <input
                type="text"
                value={info.performedBy || ''}
                onChange={(e) => handleChange('performedBy', e.target.value)}
                placeholder="-"
                className={`w-full px-3 md:px-4 py-1.5 md:py-2 h-[36px] md:h-[40px] text-sm font-medium placeholder:text-slate-600 transition-all border-2 ${inputClass}`}
            />
        </div>

        {/* Rad 4: Syfte med studien */}
        <div className="relative group">
            <div className="flex items-center mb-1 h-5 md:h-6">
                <label className={`flex items-center gap-2 text-[10px] md:text-[12px] font-bold uppercase tracking-wider ${labelColor} select-none`}>
                    <FileText className="w-4 h-4 md:w-4.5 md:h-4.5 shrink-0" /> {t.studyPurpose}
                </label>
            </div>
            <textarea
                value={info.studyPurpose}
                onChange={(e) => handleChange('studyPurpose', e.target.value)}
                placeholder="-"
                className={`w-full px-3 md:px-4 py-1.5 md:py-2 h-[80px] md:h-[110px] text-sm font-medium placeholder:text-slate-600 transition-all print:font-bold resize-none leading-tight border-2 ${inputClass}`}
            />
        </div>
      </div>
    </div>
  );
};

export default StudyDetails;
