/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  BookOpen, 
  ChevronRight, 
  FileText, 
  History, 
  Home, 
  Layers, 
  Loader2, 
  Printer, 
  RotateCcw, 
  Sparkles,
  Search,
  PlusCircle,
  CheckCircle2,
  Download,
  Edit3,
  Calendar,
  BarChart3,
  TrendingUp,
  UserPlus,
  Trash2,
  ChevronLeft,
  Palette,
  Cpu
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';
import { Grade, Subject, RPMData, StudentScore, PerformanceInsight, DesignTemplate } from './types.ts';
import { generateRPMContent, getSuggestedTopics, generatePerformanceInsights } from './services/geminiService.ts';
import { cn } from './lib/utils.ts';

const GRADES: Grade[] = [1, 2, 3, 4, 5, 6];
const SUBJECTS: Subject[] = [
  'Bahasa Indonesia',
  'IPAS',
  'Matematika',
  'Pendidikan Pancasila',
  'Bahasa Inggris',
  'PJOK',
  'Pendidikan Agama Islam',
  'Pendidikan Agama Kristen',
  'SBDP'
];

export default function App() {
  const [step, setStep] = useState<'home' | 'form' | 'generating' | 'preview' | 'analysis'>('home');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [assessmentStep, setAssessmentStep] = useState<'input' | 'result'>('input');
  const [studentScores, setStudentScores] = useState<StudentScore[]>([
    { studentName: 'Murid 1', diagnostik: 70, formatif: 75, sumatif: 80 },
    { studentName: 'Murid 2', diagnostik: 65, formatif: 70, sumatif: 75 },
    { studentName: 'Murid 3', diagnostik: 85, formatif: 90, sumatif: 95 },
  ]);
  const [formData, setFormData] = useState({
    grade: 1 as Grade,
    subject: 'Bahasa Indonesia' as Subject,
    topic: '',
    semester: 1 as 1 | 2,
    schoolName: '',
    teacherName: '',
    teacherNip: '',
    principalName: '',
    principalNip: '',
    academicYear: '2023/2024',
    meetings: 2,
    studentCount: 28,
    timeAllocation: '2 JP x 35 Menit',
    capaianPembelajaran: '',
    tujuanPembelajaran: '',
    pgCount: 5,
    essayCount: 3,
    isianCount: 5,
    template: 'modern' as DesignTemplate,
  });
  const [currentRPM, setCurrentRPM] = useState<RPMData | null>(null);
  const [history, setHistory] = useState<RPMData[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSubject, setFilterSubject] = useState<Subject | 'All'>('All');
  const [filterGrade, setFilterGrade] = useState<Grade | 'All'>('All');
  const [filterTeacher, setFilterTeacher] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);

  React.useEffect(() => {
    const fetchSuggestions = async () => {
      setIsFetchingSuggestions(true);
      try {
        const topics = await getSuggestedTopics(formData.grade, formData.subject);
        setSuggestions(topics);
      } catch (error) {
        console.error("Failed to fetch suggestions");
      } finally {
        setIsFetchingSuggestions(false);
      }
    };

    if (step === 'form') {
      fetchSuggestions();
    }
  }, [formData.grade, formData.subject, step]);

  const filteredHistory = history.filter(item => {
    const matchesSearch = item.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.grade.toString().includes(searchQuery) ||
      item.teacherName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesSubject = filterSubject === 'All' || item.subject === filterSubject;
    const matchesGrade = filterGrade === 'All' || item.grade === filterGrade;
    const matchesTeacher = filterTeacher === '' || item.teacherName.toLowerCase().includes(filterTeacher.toLowerCase());
    
    let matchesDate = true;
    if (dateRange.start) {
      matchesDate = matchesDate && item.createdAt >= new Date(dateRange.start).getTime();
    }
    if (dateRange.end) {
      const endOfDay = new Date(dateRange.end);
      endOfDay.setHours(23, 59, 59, 999);
      matchesDate = matchesDate && item.createdAt <= endOfDay.getTime();
    }

    return matchesSearch && matchesSubject && matchesGrade && matchesTeacher && matchesDate;
  });

  const isFiltering = !!(searchQuery || filterSubject !== 'All' || filterGrade !== 'All' || filterTeacher || dateRange.start || dateRange.end);

  const handleGenerate = async () => {
    setStep('generating');
    try {
      const content = await generateRPMContent({
        grade: formData.grade,
        subject: formData.subject,
        topic: formData.topic,
        semester: formData.semester,
        academicYear: formData.academicYear,
        meetings: formData.meetings,
        studentCount: formData.studentCount,
        timeAllocation: formData.timeAllocation,
        capaianPembelajaran: formData.capaianPembelajaran,
        tujuanPembelajaran: formData.tujuanPembelajaran,
        pgCount: formData.pgCount,
        essayCount: formData.essayCount,
        isianCount: formData.isianCount
      });

      const newRPM: RPMData = {
        id: Date.now().toString(),
        ...formData,
        date: new Date().toLocaleDateString('id-ID'),
        createdAt: Date.now(),
        content: content || 'No content generated.',
      };

      setCurrentRPM(newRPM);
      setHistory(prev => [newRPM, ...prev]);
      setStep('preview');
    } catch (error) {
      alert('Gagal menghasilkan RPM. Silakan periksa koneksi atau kunci API Anda.');
      setStep('form');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleRunAnalysis = async () => {
    if (!currentRPM) return;
    setIsAnalyzing(true);
    try {
      const insight = await generatePerformanceInsights({
        grade: currentRPM.grade,
        subject: currentRPM.subject,
        topic: currentRPM.topic,
        scores: studentScores
      });
      
      const updatedRPM = { ...currentRPM, assessments: studentScores, insight };
      setCurrentRPM(updatedRPM);
      setHistory(prev => prev.map(item => item.id === updatedRPM.id ? updatedRPM : item));
      setAssessmentStep('result');
    } catch (error) {
      alert('Gagal menganalisis data. Silakan coba lagi.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAddStudent = () => {
    setStudentScores(prev => [
      ...prev,
      { studentName: `Murid ${prev.length + 1}`, diagnostik: 0, formatif: 0, sumatif: 0 }
    ]);
  };

  const handleUpdateScore = (index: number, field: keyof StudentScore, value: string | number) => {
    setStudentScores(prev => prev.map((s, i) => {
      if (i === index) {
        return { ...s, [field]: value };
      }
      return s;
    }));
  };

  const handleRemoveStudent = (index: number) => {
    setStudentScores(prev => prev.filter((_, i) => i !== index));
  };

  const handleDownloadPDF = async () => {
    const element = document.getElementById('printable-content');
    if (!element) return;

    setIsDownloading(true);
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      const filename = `RPM_${formData.subject}_Kelas_${formData.grade}_${formData.topic.replace(/\s+/g, '_')}.pdf`;
      pdf.save(filename);
    } catch (error) {
      console.error('PDF generation failed:', error);
      alert('Gagal mengunduh PDF. Silakan coba lagi.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSyncCalendar = () => {
    if (!currentRPM) return;

    // More robust regex to find the Kalender Akademik table
    // It looks for a table that has "Tanggal / Pertemuan" in the first column header
    const lines = currentRPM.content.split('\n');
    let tableLines: string[] = [];
    let isInsideTable = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.toLowerCase().includes('tanggal / pertemuan') && line.includes('|')) {
        isInsideTable = true;
        // Skip header and separator
        i += 2; 
        continue;
      }
      
      if (isInsideTable) {
        if (line.includes('|')) {
          tableLines.push(line);
        } else if (line === '' && tableLines.length > 0) {
          break;
        }
      }
    }

    if (tableLines.length === 0) {
      alert('Tabel Kalender Akademik tidak ditemukan. Pastikan konten mengandung tabel jadwal pengerjaan.');
      return;
    }

    const events = tableLines.map(row => {
      const cols = row.split('|').filter(c => c !== undefined).map(c => c.trim()).filter(Boolean);
      // Expected: [Date, Step, Desc]
      return {
        title: `${formData.subject}: ${cols[1] || 'Kegiatan Pembelajaran'}`,
        date: cols[0] || 'Minggu Terkait',
        description: cols[2] || 'Keterangan Target'
      };
    });

    // Generate ICS content
    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//GuruPro//RPM Calendar//ID',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH'
    ];

    const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    
    events.forEach((event, index) => {
      // Heuristic: if it's "Minggu 1", "Pertemuan 1", etc., we just use today as base
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + (index * 7)); // Spread them weekly
      const dateStr = startDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
      const endDateStr = endDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

      icsContent.push('BEGIN:VEVENT');
      icsContent.push(`UID:${Date.now()}-${index}@gurupro.com`);
      icsContent.push(`DTSTAMP:${now}`);
      icsContent.push(`DTSTART:${dateStr}`);
      icsContent.push(`DTEND:${endDateStr}`);
      icsContent.push(`SUMMARY:${event.title}`);
      icsContent.push(`DESCRIPTION:${event.description} (Waktu asli: ${event.date})`);
      icsContent.push('END:VEVENT');
    });

    icsContent.push('END:VCALENDAR');

    const blob = new Blob([icsContent.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Kalender_RPM_${formData.subject.replace(/\s+/g, '_')}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    alert(`Berhasil mengekstrak ${events.length} jadwal. File .ics telah diunduh.\n\nAnda dapat mengimpor file ini ke:\n1. Google Calendar (Impor di Setelan)\n2. Microsoft Outlook\n3. Apple Calendar`);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex text-slate-800 font-sans">
      {/* Sidebar - Desktop */}
      <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col">
        <div className="p-6 border-bottom border-slate-100">
          <div className="flex items-center gap-2 mb-1">
            <div className="bg-indigo-600 p-1.5 rounded-lg">
              <BookOpen className="text-white w-5 h-5" />
            </div>
            <h1 className="font-bold text-xl tracking-tight">GuruPro</h1>
          </div>
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Education OS</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <button 
            onClick={() => setStep('home')}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200",
              step === 'home' ? "bg-indigo-50 text-indigo-700" : "text-slate-500 hover:bg-slate-50"
            )}
            id="nav-home"
          >
            <Home className="w-5 h-5" />
            <span className="font-medium text-sm">Dashboard</span>
          </button>
          <button 
            onClick={() => setStep('form')}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200",
              (step === 'form' || step === 'generating') ? "bg-indigo-50 text-indigo-700" : "text-slate-500 hover:bg-slate-50"
            )}
            id="nav-create"
          >
            <PlusCircle className="w-5 h-5" />
            <span className="font-medium text-sm">Buat RPM Baru</span>
          </button>
          <div className="pt-6 pb-2 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
            {isFiltering ? `Hasil Filter (${filteredHistory.length})` : 'Riwayat Terbaru'}
          </div>
          <div className="space-y-1 max-h-[40vh] overflow-y-auto no-scrollbar">
            {filteredHistory.length === 0 ? (
              <p className="px-3 py-4 text-xs text-slate-400 italic">
                {searchQuery ? 'Tidak ada hasil cocok' : 'Belum ada riwayat'}
              </p>
            ) : (
              filteredHistory.slice(0, searchQuery ? undefined : 10).map(item => (
                <button 
                  key={item.id}
                  onClick={() => {
                    setCurrentRPM(item);
                    setStep('preview');
                  }}
                  className="w-full flex flex-col gap-0.5 px-3 py-2 rounded-xl text-left hover:bg-slate-50 group transition-all"
                >
                  <span className="text-[10px] text-slate-400 font-medium">{item.date} • {item.timeAllocation}</span>
                  <span className="text-xs font-semibold truncate group-hover:text-indigo-600">{item.topic || 'Tanpa Judul'}</span>
                  <span className="text-[10px] text-slate-500 capitalize">{item.subject} • Kelas {item.grade} • {item.academicYear}</span>
                </button>
              ))
            )}
          </div>
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="bg-slate-50 rounded-2xl p-4">
            <h4 className="text-xs font-bold text-slate-900 mb-1">Kurikulum Merdeka</h4>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Dukungan penuh untuk pembuatan administrasi guru jenjang SD sesuai standar terbaru.
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative no-print h-screen">
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 md:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="md:hidden">
              <BookOpen className="text-indigo-600 w-6 h-6" />
            </div>
            <div className="h-4 w-px bg-slate-200 hidden md:block mx-1"></div>
            <nav className="flex items-center text-xs text-slate-400 font-medium">
              <span className="hover:text-slate-600 cursor-pointer">App</span>
              <ChevronRight className="w-3.5 h-3.5 mx-1.5" />
              <span className="text-slate-900 capitalize">{step === 'home' ? 'Dashboard' : step}</span>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3" />
              <input 
                type="text" 
                placeholder="Cari RPM..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 bg-slate-100 border-transparent rounded-full text-xs focus:bg-white focus:ring-2 focus:ring-indigo-100 outline-none w-48 transition-all"
              />
            </div>
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "p-2 rounded-lg transition-colors border",
                showFilters ? "bg-indigo-50 border-indigo-200 text-indigo-600" : "text-slate-500 hover:text-indigo-600 border-transparent"
              )}
              title="Filter Lanjutan"
            >
              <TrendingUp className="w-4 h-4" />
            </button>
            <button 
              onClick={() => {
                setSearchQuery('');
                setFilterSubject('All');
                setFilterGrade('All');
                setFilterTeacher('');
                setDateRange({ start: '', end: '' });
              }}
              className="p-2 text-slate-500 hover:text-indigo-600 transition-colors"
              title="Reset Pencarian"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </header>

        <AnimatePresence>
          {showFilters && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-white border-b border-slate-200 overflow-hidden no-print"
            >
              <div className="p-4 md:px-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mata Pelajaran</label>
                  <select 
                    value={filterSubject}
                    onChange={(e) => setFilterSubject(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs font-medium outline-none focus:ring-1 focus:ring-indigo-100"
                  >
                    <option value="All">Semua Mapel</option>
                    {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kelas</label>
                  <select 
                    value={filterGrade}
                    onChange={(e) => setFilterGrade(e.target.value === 'All' ? 'All' : parseInt(e.target.value) as Grade)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs font-medium outline-none focus:ring-1 focus:ring-indigo-100"
                  >
                    <option value="All">Semua Kelas</option>
                    {GRADES.map(g => <option key={g} value={g}>Kelas {g}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nama Guru</label>
                  <input 
                    type="text"
                    placeholder="Filter Guru..."
                    value={filterTeacher}
                    onChange={(e) => setFilterTeacher(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs font-medium outline-none focus:ring-1 focus:ring-indigo-100"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rentang Tanggal</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="date"
                      value={dateRange.start}
                      onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                      className="flex-1 bg-slate-50 border border-slate-100 rounded-lg px-2 py-2 text-[10px] font-medium outline-none"
                    />
                    <span className="text-slate-300">-</span>
                    <input 
                      type="date"
                      value={dateRange.end}
                      onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                      className="flex-1 bg-slate-50 border border-slate-100 rounded-lg px-2 py-2 text-[10px] font-medium outline-none"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="p-4 md:p-8 max-w-5xl mx-auto">
          <AnimatePresence mode="wait">
            {step === 'home' && (
              <motion.div 
                key="home"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Hero Card */}
                  <div className="col-span-full bg-gradient-to-br from-indigo-600 to-violet-700 rounded-[32px] p-8 text-white relative overflow-hidden shadow-xl shadow-indigo-200">
                    <div className="relative z-10 max-w-lg">
                      <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-lg px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-6">
                        <Sparkles className="w-3 h-3" />
                        AI Integrated
                      </div>
                      <h2 className="text-4xl font-bold mb-4 leading-tight">Buat RPM Profesional Dalam Hitungan Detik.</h2>
                      <p className="text-white/80 text-sm mb-8 leading-relaxed">
                        Sempurnakan administrasi kelas Anda dengan bantuan kecerdasan buatan. Dirancang khusus untuk guru SD Indonesia kelas 1-6.
                      </p>
                      <motion.button 
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setStep('form')}
                        className="bg-white text-indigo-700 px-6 py-3 rounded-2xl font-bold text-sm shadow-lg hover:shadow-xl transition-all"
                        id="hero-create-btn"
                      >
                        Mulai Buat Sekarang
                      </motion.button>
                    </div>
                    {/* Decorative Elements */}
                    <div className="absolute top-10 right-10 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                    <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-indigo-400/20 rounded-full blur-3xl"></div>
                  </div>

                  {/* Summary Cards */}
                  <div className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100">
                    <div className="bg-orange-100 text-orange-600 w-10 h-10 rounded-xl flex items-center justify-center mb-4">
                      <FileText className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Total Generate</h3>
                    <p className="text-3xl font-black text-slate-900">{history.length}</p>
                  </div>

                  <div className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100">
                    <div className="bg-emerald-100 text-emerald-600 w-10 h-10 rounded-xl flex items-center justify-center mb-4">
                      <Layers className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Mata Pelajaran</h3>
                    <p className="text-3xl font-black text-slate-900">{SUBJECTS.length}</p>
                  </div>

                  <div className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100">
                    <div className="bg-blue-100 text-blue-600 w-10 h-10 rounded-xl flex items-center justify-center mb-4">
                      <History className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Efisiensi</h3>
                    <p className="text-3xl font-black text-slate-900">95%</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-slate-900">Mata Pelajaran Tercover</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {SUBJECTS.map((sub) => (
                      <div key={sub} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span className="text-xs font-semibold text-slate-700">{sub}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {step === 'form' && (
              <motion.div 
                key="form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden"
              >
                <div className="p-8 border-b border-slate-100 bg-slate-50/50">
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">Konfigurasi RPM</h2>
                  <p className="text-sm text-slate-500">Lengkapi detail di bawah untuk menghasilkan rencana pembelajaran otomatis.</p>
                </div>
                
                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pilih Kelas</label>
                      <div className="grid grid-cols-6 gap-2">
                        {GRADES.map((g) => (
                          <button
                            key={g}
                            onClick={() => setFormData(prev => ({ ...prev, grade: g }))}
                            className={cn(
                              "aspect-square rounded-xl text-sm font-bold transition-all",
                              formData.grade === g 
                                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" 
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            )}
                          >
                            {g}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mata Pelajaran</label>
                      <select 
                        value={formData.subject}
                        onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value as Subject }))}
                        className="w-full bg-slate-100 border-none rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-100"
                        id="subject-select"
                      >
                        {SUBJECTS.map(sub => (
                          <option key={sub} value={sub}>{sub}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Topik / Materi Pembelajaran</label>
                      <input 
                        type="text"
                        placeholder="Contoh: Operasi Penjumlahan Bilangan Bulat"
                        value={formData.topic}
                        onChange={(e) => setFormData(prev => ({ ...prev, topic: e.target.value }))}
                        className="w-full bg-slate-100 border-none rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-100"
                        id="topic-input"
                      />
                      <div className="mt-2 flex flex-wrap gap-2">
                        {isFetchingSuggestions ? (
                          <div className="flex items-center gap-1.5 px-2 py-1 text-xs text-slate-400">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Mencari saran...
                          </div>
                        ) : (
                          suggestions.map((suggestion) => (
                            <button
                              key={suggestion}
                              onClick={() => setFormData(prev => ({ ...prev, topic: suggestion }))}
                              className="px-3 py-1 bg-white border border-slate-200 rounded-full text-[10px] font-bold text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition-all"
                            >
                              + {suggestion}
                            </button>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Capaian Pembelajaran (Opsional)</label>
                      <textarea 
                        placeholder="Masukkan Capaian Pembelajaran jika ada..."
                        value={formData.capaianPembelajaran}
                        onChange={(e) => setFormData(prev => ({ ...prev, capaianPembelajaran: e.target.value }))}
                        className="w-full bg-slate-100 border-none rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-100 min-h-[80px]"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tujuan Pembelajaran (Opsional)</label>
                      <textarea 
                        placeholder="Masukkan Tujuan Pembelajaran jika ada..."
                        value={formData.tujuanPembelajaran}
                        onChange={(e) => setFormData(prev => ({ ...prev, tujuanPembelajaran: e.target.value }))}
                        className="w-full bg-slate-100 border-none rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-100 min-h-[80px]"
                      />
                    </div>
                  </div>

                    <div className="space-y-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Template Visual GuruPro</label>
                          <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full uppercase tracking-widest">Baru</span>
                        </div>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                          {[
                            { id: 'modern', icon: <Sparkles className="w-4 h-4" />, label: 'Modern', color: 'bg-indigo-600', desc: 'Bersih & Profesional' },
                            { id: 'classic', icon: <BookOpen className="w-4 h-4" />, label: 'Classic', color: 'bg-emerald-600', desc: 'Formal & Editorial' },
                            { id: 'creative', icon: <Palette className="w-4 h-4" />, label: 'Creative', color: 'bg-amber-500', desc: 'Ceria & Inspiratif' },
                            { id: 'technical', icon: <Cpu className="w-4 h-4" />, label: 'Technical', color: 'bg-slate-900', desc: 'Logis & Terstruktur' }
                          ].map((t) => (
                            <button
                              key={t.id}
                              onClick={() => setFormData(prev => ({ ...prev, template: t.id as DesignTemplate }))}
                              className={cn(
                                "flex flex-col items-start gap-3 p-5 rounded-3xl text-left transition-all border-2 relative overflow-hidden group",
                                formData.template === t.id 
                                  ? "bg-white border-indigo-600 shadow-xl shadow-indigo-100/50 -translate-y-1" 
                                  : "bg-white text-slate-400 border-slate-100 hover:border-slate-200 hover:bg-slate-50"
                              )}
                            >
                              <div className={cn(
                                "p-2 rounded-xl transition-all",
                                formData.template === t.id ? t.color + " text-white" : "bg-slate-100 text-slate-400"
                              )}>
                                {t.icon}
                              </div>
                              <div>
                                <p className={cn(
                                  "text-[11px] font-black uppercase tracking-wider mb-0.5",
                                  formData.template === t.id ? "text-slate-900" : "text-slate-500"
                                )}>{t.label}</p>
                                <p className="text-[9px] text-slate-400 font-medium leading-tight">{t.desc}</p>
                              </div>
                              {formData.template === t.id && (
                                <motion.div 
                                  layoutId="active-check"
                                  className="absolute top-3 right-3"
                                >
                                  <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                                </motion.div>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Semester</label>
                      <div className="flex gap-2">
                        {[1, 2].map((s) => (
                          <button
                            key={s}
                            onClick={() => setFormData(prev => ({ ...prev, semester: s as 1 | 2 }))}
                            className={cn(
                              "flex-1 py-3 rounded-xl text-sm font-bold transition-all",
                              formData.semester === s 
                                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" 
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            )}
                          >
                            Semester {s}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nama Sekolah</label>
                      <input 
                        type="text"
                        placeholder="Nama SD Anda..."
                        value={formData.schoolName}
                        onChange={(e) => setFormData(prev => ({ ...prev, schoolName: e.target.value }))}
                        className="w-full bg-slate-100 border-none rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-100"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tahun Pembelajaran</label>
                      <input 
                        type="text"
                        placeholder="Contoh: 2023/2024"
                        value={formData.academicYear}
                        onChange={(e) => setFormData(prev => ({ ...prev, academicYear: e.target.value }))}
                        className="w-full bg-slate-100 border-none rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-100"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Alokasi Waktu</label>
                      <input 
                        type="text"
                        placeholder="Contoh: 2 JP x 35 Menit"
                        value={formData.timeAllocation}
                        onChange={(e) => setFormData(prev => ({ ...prev, timeAllocation: e.target.value }))}
                        className="w-full bg-slate-100 border-none rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-100"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Jumlah Pertemuan</label>
                      <div className="flex items-center gap-4">
                        <input 
                          type="range"
                          min="1"
                          max="8"
                          value={formData.meetings}
                          onChange={(e) => setFormData(prev => ({ ...prev, meetings: parseInt(e.target.value) }))}
                          className="flex-1 accent-indigo-600 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                        />
                        <span className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold min-w-[100px] text-center text-xs">
                          {formData.meetings} Pertemuan
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Jumlah Murid</label>
                      <div className="flex items-center gap-4">
                        <input 
                          type="range"
                          min="1"
                          max="50"
                          value={formData.studentCount}
                          onChange={(e) => setFormData(prev => ({ ...prev, studentCount: parseInt(e.target.value) }))}
                          className="flex-1 accent-indigo-600 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                        />
                        <span className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold min-w-[100px] text-center text-xs">
                          {formData.studentCount} Murid
                        </span>
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Asesmen Pembelajaran (Generate Otomatis)</label>
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase tracking-widest">Wajib</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Jumlah Soal PG</label>
                          <input 
                            type="number"
                            min="1"
                            max="20"
                            value={formData.pgCount}
                            onChange={(e) => setFormData(prev => ({ ...prev, pgCount: parseInt(e.target.value) }))}
                            className="w-full bg-slate-100 border-none rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-100"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Jumlah Soal Isian</label>
                          <input 
                            type="number"
                            min="1"
                            max="20"
                            value={formData.isianCount}
                            onChange={(e) => setFormData(prev => ({ ...prev, isianCount: parseInt(e.target.value) }))}
                            className="w-full bg-slate-100 border-none rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-100"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Jumlah Soal Esai</label>
                          <input 
                            type="number"
                            min="1"
                            max="10"
                            value={formData.essayCount}
                            onChange={(e) => setFormData(prev => ({ ...prev, essayCount: parseInt(e.target.value) }))}
                            className="w-full bg-slate-100 border-none rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-100"
                          />
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400 italic font-medium">*Asesmen Awal (3 soal) & Formatif akan digenerate otomatis.</p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nama Guru & NIP</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <input 
                          type="text"
                          placeholder="Nama Lengkap Guru..."
                          value={formData.teacherName}
                          onChange={(e) => setFormData(prev => ({ ...prev, teacherName: e.target.value }))}
                          className="w-full bg-slate-100 border-none rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-100"
                        />
                        <input 
                          type="text"
                          placeholder="NIP Guru..."
                          value={formData.teacherNip}
                          onChange={(e) => setFormData(prev => ({ ...prev, teacherNip: e.target.value }))}
                          className="w-full bg-slate-100 border-none rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-100"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nama Kepala Sekolah & NIP</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <input 
                          type="text"
                          placeholder="Nama Kepala Sekolah..."
                          value={formData.principalName}
                          onChange={(e) => setFormData(prev => ({ ...prev, principalName: e.target.value }))}
                          className="w-full bg-slate-100 border-none rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-100"
                        />
                        <input 
                          type="text"
                          placeholder="NIP Kepala Sekolah..."
                          value={formData.principalNip}
                          onChange={(e) => setFormData(prev => ({ ...prev, principalNip: e.target.value }))}
                          className="w-full bg-slate-100 border-none rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-100"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end gap-4">
                  <button 
                    onClick={() => setStep('home')}
                    className="px-6 py-3 rounded-xl text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors"
                  >
                    Batal
                  </button>
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleGenerate}
                    disabled={!formData.topic || !formData.schoolName || !formData.teacherName}
                    className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold text-sm shadow-lg hover:shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    Buat RPM Sekarang
                  </motion.button>
                </div>
              </motion.div>
            )}

            {step === 'generating' && (
              <motion.div 
                key="generating"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-20 bg-white rounded-[32px] shadow-sm border border-slate-100"
              >
                <div className="relative mb-8">
                  <div className="w-24 h-24 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                  <Sparkles className="w-8 h-8 text-indigo-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Menyusun RPM...</h3>
                <p className="text-slate-500 text-sm max-w-xs text-center leading-relaxed">
                  Kecerdasan buatan sedang merancang rencana pembelajaran yang kreatif dan berstandar untuk Anda.
                </p>
                <div className="mt-8 flex gap-1">
                  <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce delay-75"></div>
                  <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce delay-150"></div>
                  <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce delay-300"></div>
                </div>
              </motion.div>
            )}

            {step === 'preview' && currentRPM && (
              <motion.div 
                key="preview"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                className="space-y-6"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">Pratinjau RPM</h2>
                    <p className="text-sm text-slate-500">Hasil generate otomatis. Siap cetak atau edit.</p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setStep('analysis')}
                      className="px-5 py-2.5 bg-emerald-50 border border-emerald-100 rounded-xl text-xs font-bold text-emerald-700 hover:bg-emerald-100 flex items-center gap-2 shadow-sm"
                    >
                      <BarChart3 className="w-3.5 h-3.5" />
                      Analisis Kelulusan
                    </button>
                    <button 
                      onClick={() => setStep('form')}
                      className="px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Edit RPM
                    </button>
                    <button 
                      onClick={handleDownloadPDF}
                      disabled={isDownloading}
                      className="px-5 py-2.5 bg-indigo-50 border border-indigo-100 rounded-xl text-xs font-bold text-indigo-700 hover:bg-indigo-100 flex items-center gap-2 shadow-sm disabled:opacity-50"
                    >
                      {isDownloading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Download className="w-3.5 h-3.5" />
                      )}
                      {isDownloading ? 'Mengunduh...' : 'Unduh PDF'}
                    </button>
                    <button 
                      onClick={handlePrint}
                      className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 flex items-center gap-2 shadow-lg shadow-slate-100"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Cetak RPM
                    </button>
                  </div>
                </div>

                <div className={cn(
                  "bg-white shadow-sm border border-slate-100 overflow-hidden",
                  currentRPM.template === 'modern' && "rounded-[32px]",
                  currentRPM.template === 'classic' && "rounded-none",
                  currentRPM.template === 'creative' && "rounded-[48px]",
                  currentRPM.template === 'technical' && "rounded-sm border-2 border-slate-900"
                )}>
                  <div className={cn(
                    "p-8 md:p-12",
                    currentRPM.template === 'modern' && "font-sans",
                    currentRPM.template === 'classic' && "font-serif",
                    currentRPM.template === 'creative' && "font-sans",
                    currentRPM.template === 'technical' && "font-mono text-[13px]"
                  )} id="printable-content">
                    {/* Header Document */}
                    <div className={cn(
                      "relative mb-12",
                      currentRPM.template === 'modern' && "border-b-2 border-slate-900 pb-8",
                      currentRPM.template === 'classic' && "border-y-4 border-double border-slate-800 py-10 px-6 bg-stone-50/30",
                      currentRPM.template === 'creative' && "bg-rose-50/50 p-8 rounded-[40px] border-4 border-rose-100 border-dashed mb-16",
                      currentRPM.template === 'technical' && "border-2 border-slate-900 p-8 bg-slate-50 font-mono shadow-[8px_8px_0px_0px_rgba(15,23,42,1)]"
                    )}>
                      {currentRPM.template === 'creative' && (
                        <div className="absolute -top-6 -left-6 rotate-12 bg-amber-400 text-amber-900 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">
                          School Plan
                        </div>
                      )}
                      {currentRPM.template === 'technical' && (
                        <div className="absolute top-4 right-4 text-[10px] text-slate-400">
                          ID: {currentRPM.id} // SYS_001
                        </div>
                      )}

                      <div className={cn(
                        "flex flex-col gap-6",
                        currentRPM.template === 'modern' && "sm:flex-row sm:items-end sm:justify-between",
                        currentRPM.template === 'classic' && "text-center",
                        currentRPM.template === 'creative' && "text-center sm:text-left",
                        currentRPM.template === 'technical' && "text-left"
                      )}>
                        <div className="flex-1">
                          <h1 className={cn(
                            "font-black uppercase tracking-tight mb-2",
                            currentRPM.template === 'modern' && "text-3xl text-slate-900",
                            currentRPM.template === 'classic' && "text-4xl text-stone-900 font-serif italic mb-6",
                            currentRPM.template === 'creative' && "text-4xl text-rose-600 mb-1 leading-none",
                            currentRPM.template === 'technical' && "text-2xl text-slate-900 mb-4"
                          )}>Rencana Pelaksanaan Modul</h1>
                          
                          {currentRPM.template === 'creative' && (
                            <p className="text-rose-400 font-bold text-sm uppercase tracking-[0.3em] mb-6">Kurikulum Merdeka • Fase {currentRPM.grade <= 2 ? 'A' : currentRPM.grade <= 4 ? 'B' : 'C'}</p>
                          )}
                          {currentRPM.template === 'technical' && (
                            <div className="mb-6 flex gap-3">
                              <span className="bg-slate-900 text-white px-2 py-0.5 text-[10px]">VER: 2026.4</span>
                              <span className="bg-slate-200 text-slate-700 px-2 py-0.5 text-[10px] uppercase font-bold">Approved</span>
                            </div>
                          )}
                        </div>

                        <div className={cn(
                          "sm:min-w-[300px]",
                          currentRPM.template === 'classic' && "mx-auto"
                        )}>
                          <div className={cn(
                            "grid gap-x-6 gap-y-1.5 text-xs",
                            currentRPM.template === 'modern' && "grid-cols-2",
                            currentRPM.template === 'classic' && "grid-cols-1 max-w-sm mx-auto",
                            currentRPM.template === 'creative' && "grid-cols-2 sm:grid-cols-3",
                            currentRPM.template === 'technical' && "grid-cols-1 border-left-4 border-slate-900 pl-4"
                          )}>
                            {[
                              { label: 'Satuan Pendidikan', value: currentRPM.schoolName },
                              { label: 'Tahun Pembelajaran', value: currentRPM.academicYear },
                              { label: 'Jumlah Murid', value: `${currentRPM.studentCount} Murid` },
                              { label: 'Alokasi Waktu', value: currentRPM.timeAllocation },
                              { label: 'Jumlah Pertemuan', value: `${currentRPM.meetings} Pertemuan` },
                              { label: 'Kelas / Semester', value: `${currentRPM.grade} / ${currentRPM.semester}` },
                              { label: 'Mata Pelajaran', value: currentRPM.subject },
                              { label: 'Topik / Materi', value: currentRPM.topic },
                              { label: 'Nama Guru', value: currentRPM.teacherName },
                              { label: 'Tgl Generate', value: currentRPM.date }
                            ].map((item, i) => (
                              <div key={i} className={cn(
                                "flex flex-col py-1",
                                currentRPM.template === 'modern' && "border-b border-slate-100",
                                currentRPM.template === 'classic' && "border-b border-stone-200 py-1.5",
                                currentRPM.template === 'creative' && "bg-white/80 p-3 rounded-2xl mb-1",
                                currentRPM.template === 'technical' && "mb-1"
                              )}>
                                <span className={cn(
                                  "font-bold uppercase tracking-widest text-[9px]",
                                  currentRPM.template === 'modern' && "text-slate-400",
                                  currentRPM.template === 'classic' && "text-stone-500",
                                  currentRPM.template === 'creative' && "text-rose-400",
                                  currentRPM.template === 'technical' && "text-slate-500"
                                )}>{item.label}</span>
                                <span className={cn(
                                  "font-black truncate",
                                  currentRPM.template === 'modern' && "text-slate-700",
                                  currentRPM.template === 'classic' && "text-stone-900 text-sm",
                                  currentRPM.template === 'creative' && "text-rose-900",
                                  currentRPM.template === 'technical' && "text-slate-900 font-mono"
                                )}>{item.value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-8 flex justify-end no-print">
                        <button 
                          onClick={handleSyncCalendar}
                          className={cn(
                            "px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-wider flex items-center gap-2 transition-all shadow-sm border",
                            currentRPM.template === 'modern' && "bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100",
                            currentRPM.template === 'classic' && "bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100",
                            currentRPM.template === 'creative' && "bg-rose-50 text-rose-700 border-rose-100 hover:bg-rose-100",
                            currentRPM.template === 'technical' && "bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200"
                          )}
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          Sinkronisasi ke Kalender
                        </button>
                      </div>
                    </div>

                    {/* Content */}
                    <div className={cn(
                      "prose prose-sm max-w-none prose-p:leading-relaxed prose-li:leading-relaxed",
                      currentRPM.template === 'modern' && "prose-slate prose-headings:font-black prose-headings:uppercase prose-headings:text-slate-900 prose-strong:text-indigo-600",
                      currentRPM.template === 'classic' && "prose-stone prose-headings:font-serif prose-headings:text-stone-900 prose-strong:text-emerald-700 font-serif",
                      currentRPM.template === 'creative' && "prose-rose prose-headings:font-black prose-headings:text-rose-900 prose-strong:text-amber-600",
                      currentRPM.template === 'technical' && "prose-slate prose-headings:font-mono prose-headings:text-slate-900 prose-strong:text-blue-600 font-mono"
                    )}>
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          h2: ({ children }) => (
                            <h2 className={cn(
                              "mt-16 mb-8 pb-3 border-b-2",
                              currentRPM.template === 'modern' && "border-slate-100 text-xl font-black uppercase tracking-tight",
                              currentRPM.template === 'classic' && "border-stone-200 text-3xl italic font-serif text-stone-900 bg-stone-50/50 py-3 px-6",
                              currentRPM.template === 'creative' && "border-rose-100 text-3xl font-black text-rose-700 bg-rose-50/20 rounded-2xl px-6 py-4 border-none shadow-sm shadow-rose-100/50",
                              currentRPM.template === 'technical' && "border-slate-900 border-4 text-xl bg-slate-900 text-white px-6 py-3 font-mono"
                            )}>{children}</h2>
                          ),
                          ol: ({ children }) => (
                            <ol className={cn(
                              "space-y-6 my-8 list-none pr-4",
                              currentRPM.template === 'modern' && "border-l-4 border-indigo-50 pl-8",
                              currentRPM.template === 'classic' && "prose-stone pl-8 border-l border-stone-200 italic",
                              currentRPM.template === 'creative' && "bg-white p-8 rounded-[40px] border-2 border-rose-50 shadow-xl shadow-rose-50/50",
                              currentRPM.template === 'technical' && "border-2 border-slate-900 border-double p-8 bg-slate-50 font-mono"
                            )}>{children}</ol>
                          ),
                          ul: ({ children }) => (
                            <ul className={cn(
                              "space-y-3 my-6",
                              currentRPM.template === 'modern' && "list-disc pl-8 marker:text-indigo-500",
                              currentRPM.template === 'classic' && "list-square pl-8 marker:text-stone-400",
                              currentRPM.template === 'creative' && "list-none space-y-4",
                              currentRPM.template === 'technical' && "list-none pr-4 border-l-2 border-slate-200 pl-6"
                            )}>{children}</ul>
                          ),
                          li: ({ children, ...props }) => {
                            // Search for text content in children to identify special sections
                            const containsText = (nodes: React.ReactNode, text: string): boolean => {
                              return React.Children.toArray(nodes).some(child => {
                                if (typeof child === 'string') return child.includes(text);
                                if (React.isValidElement(child)) {
                                  const props = child.props as { children?: React.ReactNode };
                                  if (props.children) {
                                    return containsText(props.children, text);
                                  }
                                }
                                return false;
                              });
                            };

                            if (containsText(children, 'Kegiatan Pengayaan')) {
                              return (
                                <li className={cn(
                                  "list-none my-6 p-6 border shadow-sm",
                                  currentRPM.template === 'modern' && "bg-indigo-50 rounded-3xl border-indigo-100 shadow-indigo-50/50",
                                  currentRPM.template === 'classic' && "bg-emerald-50 rounded-none border-emerald-200",
                                  currentRPM.template === 'creative' && "bg-amber-50 rounded-[40px] border-amber-200 shadow-amber-100/50",
                                  currentRPM.template === 'technical' && "bg-slate-50 rounded-none border-slate-900 border-2"
                                )}>
                                  <div className="flex items-center gap-2 mb-3">
                                    <div className={cn(
                                      "p-1 rounded-lg",
                                      currentRPM.template === 'modern' && "bg-indigo-600",
                                      currentRPM.template === 'classic' && "bg-emerald-600",
                                      currentRPM.template === 'creative' && "bg-amber-500",
                                      currentRPM.template === 'technical' && "bg-slate-900"
                                    )}>
                                      <Sparkles className="w-4 h-4 text-white" />
                                    </div>
                                    <span className={cn(
                                      "text-xs font-black uppercase tracking-wider",
                                      currentRPM.template === 'modern' && "text-indigo-700",
                                      currentRPM.template === 'classic' && "text-emerald-700",
                                      currentRPM.template === 'creative' && "text-amber-700",
                                      currentRPM.template === 'technical' && "text-slate-900"
                                    )}>Aktivitas Pengayaan</span>
                                  </div>
                                  <div className="text-slate-700 font-medium">{children}</div>
                                </li>
                              );
                            }
                            if (containsText(children, 'Kegiatan Remedial')) {
                              return (
                                <li className={cn(
                                  "list-none my-6 p-6 border shadow-sm",
                                  currentRPM.template === 'modern' && "bg-amber-50 rounded-3xl border-amber-100 shadow-amber-50/50",
                                  currentRPM.template === 'classic' && "bg-stone-50 rounded-none border-stone-200",
                                  currentRPM.template === 'creative' && "bg-rose-50 rounded-[40px] border-rose-200 shadow-rose-100/50",
                                  currentRPM.template === 'technical' && "bg-white rounded-none border-slate-400 border-2 border-dashed"
                                )}>
                                  <div className="flex items-center gap-2 mb-3">
                                    <div className={cn(
                                      "p-1 rounded-lg",
                                      currentRPM.template === 'modern' && "bg-amber-600",
                                      currentRPM.template === 'classic' && "bg-stone-600",
                                      currentRPM.template === 'creative' && "bg-rose-500",
                                      currentRPM.template === 'technical' && "bg-slate-700"
                                    )}>
                                      <RotateCcw className="w-4 h-4 text-white" />
                                    </div>
                                    <span className={cn(
                                      "text-xs font-black uppercase tracking-wider",
                                      currentRPM.template === 'modern' && "text-amber-700",
                                      currentRPM.template === 'classic' && "text-stone-700",
                                      currentRPM.template === 'creative' && "text-rose-700",
                                      currentRPM.template === 'technical' && "text-slate-700"
                                    )}>Aktivitas Remedial</span>
                                  </div>
                                  <div className="text-slate-700 font-medium">{children}</div>
                                </li>
                              );
                            }
                            return <li {...props}>{children}</li>;
                          },
                          strong: ({ children, ...props }) => {
                            const text = String(React.Children.toArray(children).join(''));
                            if (text.includes('Kegiatan Pengayaan') || text.includes('Kegiatan Remedial')) {
                              return <span className={cn(
                                "font-black text-lg block mb-1",
                                currentRPM.template === 'classic' && "italic"
                              )}>{children}</span>;
                            }
                            return <strong {...props}>{children}</strong>;
                          },
                          table: ({ children, ...props }) => (
                            <div className={cn(
                              "my-6 overflow-x-auto border shadow-sm",
                              currentRPM.template === 'modern' && "border-slate-200 rounded-2xl",
                              currentRPM.template === 'classic' && "border-stone-300 rounded-none",
                              currentRPM.template === 'creative' && "border-rose-100 rounded-[32px]",
                              currentRPM.template === 'technical' && "border-slate-900 rounded-none"
                            )}>
                              <table className="w-full border-collapse" {...props}>
                                {children}
                              </table>
                            </div>
                          ),
                          thead: ({ children }) => (
                            <thead className={cn(
                              "border-b",
                              currentRPM.template === 'modern' && "bg-slate-50 border-slate-200",
                              currentRPM.template === 'classic' && "bg-stone-100 border-stone-300",
                              currentRPM.template === 'creative' && "bg-rose-50 border-rose-100",
                              currentRPM.template === 'technical' && "bg-slate-900 border-slate-900 text-white"
                            )}>
                              {children}
                            </thead>
                          ),
                          th: ({ children }) => (
                            <th className={cn(
                              "px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider border-r last:border-r-0",
                              currentRPM.template === 'modern' && "text-slate-500 border-slate-200",
                              currentRPM.template === 'classic' && "text-stone-600 border-stone-300",
                              currentRPM.template === 'creative' && "text-rose-600 border-rose-100",
                              currentRPM.template === 'technical' && "text-white border-slate-700"
                            )}>
                              {children}
                            </th>
                          ),
                          td: ({ children }) => (
                            <td className={cn(
                              "px-4 py-3 text-sm border-r last:border-r-0 border-b last:border-b-0",
                              currentRPM.template === 'modern' && "border-slate-200 border-slate-100 text-slate-700",
                              currentRPM.template === 'classic' && "border-stone-300 text-stone-800",
                              currentRPM.template === 'creative' && "border-rose-50 text-slate-700",
                              currentRPM.template === 'technical' && "border-slate-200 text-slate-900"
                            )}>
                              {children}
                            </td>
                          )
                        }}
                      >
                        {currentRPM.content}
                      </ReactMarkdown>
                    </div>

                    {/* Signatures */}
                    <div className={cn(
                      "mt-24 grid grid-cols-2 gap-12 pt-12 border-t",
                      currentRPM.template === 'modern' && "border-slate-100",
                      currentRPM.template === 'classic' && "border-stone-200 font-serif",
                      currentRPM.template === 'creative' && "border-rose-100",
                      currentRPM.template === 'technical' && "border-slate-900 font-mono"
                    )}>
                      <div className="text-center">
                        <p className={cn(
                          "text-xs font-bold uppercase tracking-widest mb-20",
                          currentRPM.template === 'classic' && "italic",
                          currentRPM.template === 'creative' && "text-rose-400"
                        )}>
                          Mengetahui,<br />Kepala Sekolah
                        </p>
                        <p className="font-black text-sm uppercase underline decoration-2 underline-offset-4">{currentRPM.principalName || '..........................'}</p>
                        <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-tighter">NIP. {currentRPM.principalNip || '..........................'}</p>
                      </div>
                      <div className="text-center">
                        <p className={cn(
                          "text-xs font-bold uppercase tracking-widest mb-20",
                          currentRPM.template === 'classic' && "italic",
                          currentRPM.template === 'creative' && "text-rose-400"
                        )}>
                          {currentRPM.schoolName}, {currentRPM.date}<br />Guru Mata Pelajaran
                        </p>
                        <p className="font-black text-sm uppercase underline decoration-2 underline-offset-4">{currentRPM.teacherName}</p>
                        <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-tighter">NIP. {currentRPM.teacherNip || '..........................'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
            {step === 'analysis' && currentRPM && (
              <motion.div
                key="analysis"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <button 
                    onClick={() => setStep('preview')}
                    className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold text-sm transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Kembali ke RPM
                  </button>
                  <div className="flex gap-2">
                    {assessmentStep === 'result' && (
                      <button 
                        onClick={() => setAssessmentStep('input')}
                        className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Edit Data
                      </button>
                    )}
                  </div>
                </div>

                {assessmentStep === 'input' ? (
                  <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-8 border-b border-slate-100 bg-slate-50/50">
                      <h2 className="text-2xl font-bold text-slate-900 mb-2">Input Data Asesmen</h2>
                      <p className="text-sm text-slate-500">Masukkan nilai murid untuk mendapatkan analisis kinerja otomatis.</p>
                    </div>
                    <div className="p-8">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="text-left border-b border-slate-100">
                              <th className="pb-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Nama Murid</th>
                              <th className="pb-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Diagnostik</th>
                              <th className="pb-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Formatif</th>
                              <th className="pb-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Sumatif</th>
                              <th className="pb-4 text-xs font-bold text-slate-400 uppercase tracking-wider w-10"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {studentScores.map((score, idx) => (
                              <tr key={idx}>
                                <td className="py-4 pr-4">
                                  <input 
                                    type="text"
                                    value={score.studentName}
                                    onChange={(e) => handleUpdateScore(idx, 'studentName', e.target.value)}
                                    className="w-full bg-slate-50 border-none rounded-lg px-3 py-2 text-sm font-medium outline-none focus:ring-1 focus:ring-indigo-200"
                                  />
                                </td>
                                <td className="py-4 pr-4">
                                  <input 
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={score.diagnostik}
                                    onChange={(e) => handleUpdateScore(idx, 'diagnostik', parseInt(e.target.value) || 0)}
                                    className="w-20 bg-slate-50 border-none rounded-lg px-3 py-2 text-sm font-medium outline-none focus:ring-1 focus:ring-indigo-200"
                                  />
                                </td>
                                <td className="py-4 pr-4">
                                  <input 
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={score.formatif}
                                    onChange={(e) => handleUpdateScore(idx, 'formatif', parseInt(e.target.value) || 0)}
                                    className="w-20 bg-slate-50 border-none rounded-lg px-3 py-2 text-sm font-medium outline-none focus:ring-1 focus:ring-indigo-200"
                                  />
                                </td>
                                <td className="py-4 pr-4">
                                  <input 
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={score.sumatif}
                                    onChange={(e) => handleUpdateScore(idx, 'sumatif', parseInt(e.target.value) || 0)}
                                    className="w-20 bg-slate-50 border-none rounded-lg px-3 py-2 text-sm font-medium outline-none focus:ring-1 focus:ring-indigo-200"
                                  />
                                </td>
                                <td className="py-4">
                                  <button 
                                    onClick={() => handleRemoveStudent(idx)}
                                    className="text-slate-300 hover:text-red-500 transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <button 
                        onClick={handleAddStudent}
                        className="mt-6 flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-bold text-xs"
                      >
                        <UserPlus className="w-4 h-4" />
                        Tambah Murid
                      </button>
                    </div>
                    <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end">
                      <button 
                        onClick={handleRunAnalysis}
                        disabled={isAnalyzing || studentScores.length === 0}
                        className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold text-sm shadow-lg hover:shadow-indigo-200 disabled:opacity-50 transition-all flex items-center gap-2"
                      >
                        {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
                        {isAnalyzing ? 'Menganalisis...' : 'Jalankan Analisis'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <div className="lg:col-span-2 bg-white rounded-[32px] p-8 shadow-sm border border-slate-100">
                        <h3 className="text-lg font-bold text-slate-900 mb-6">Visualisasi Perkembangan Kelas</h3>
                        <div className="h-[300px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={currentRPM.insight?.visualData}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                              <XAxis 
                                dataKey="category" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
                                dy={10}
                              />
                              <YAxis 
                                hide 
                                domain={[0, 100]}
                              />
                              <Tooltip 
                                cursor={{ fill: '#f8fafc' }}
                                content={({ active, payload }) => {
                                  if (active && payload && payload.length) {
                                    return (
                                      <div className="bg-slate-900 text-white px-3 py-2 rounded-lg text-xs font-bold shadow-xl">
                                        Rata-rata: {payload[0].value?.toString()}
                                      </div>
                                    );
                                  }
                                  return null;
                                }}
                              />
                              <Bar 
                                dataKey="average" 
                                radius={[10, 10, 10, 10]} 
                                barSize={60}
                              >
                                {currentRPM.insight?.visualData.map((_entry, index) => (
                                  <Cell 
                                    key={`cell-${index}`} 
                                    fill={index === 0 ? '#6366f1' : index === 1 ? '#8b5cf6' : '#ec4899'} 
                                  />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      <div className="bg-indigo-600 rounded-[32px] p-8 text-white shadow-xl shadow-indigo-100 flex flex-col justify-between">
                        <div>
                          <div className="bg-white/20 w-12 h-12 rounded-2xl flex items-center justify-center mb-6">
                            <Sparkles className="w-6 h-6 text-white" />
                          </div>
                          <h3 className="text-xl font-bold mb-4">Wawasan AI</h3>
                          <p className="text-indigo-50/80 text-sm leading-relaxed mb-6">
                            {currentRPM.insight?.summary}
                          </p>
                        </div>
                        <div className="pt-6 border-t border-white/10">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-200">Total Sampel</p>
                          <p className="text-2xl font-black">{studentScores.length} Murid</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100">
                        <div className="flex items-center gap-2 mb-6">
                          <div className="bg-emerald-100 p-1.5 rounded-lg">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          </div>
                          <h4 className="font-bold text-slate-900">Kekuatan Terdeteksi</h4>
                        </div>
                        <ul className="space-y-4">
                          {currentRPM.insight?.strengths.map((s, i) => (
                            <li key={i} className="flex gap-3 text-sm text-slate-600 leading-relaxed italic">
                              <span className="text-emerald-500 font-bold">•</span>
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100">
                        <div className="flex items-center gap-2 mb-6">
                          <div className="bg-blue-100 p-1.5 rounded-lg">
                            <RotateCcw className="w-4 h-4 text-blue-600" />
                          </div>
                          <h4 className="font-bold text-slate-900">Rekomendasi Tindak Lanjut</h4>
                        </div>
                        <div className="space-y-3">
                          {currentRPM.insight?.recommendations.map((r, i) => (
                            <div key={i} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-sm text-slate-700 font-medium">
                              {r}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Global CSS for Printing */}
      <style>{`
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          main { overflow: visible !important; height: auto !important; }
          #printable-content { padding: 0 !important; border: none !important; box-shadow: none !important; }
          header { display: none !important; }
          aside { display: none !important; }
          .prose { font-size: 11pt !important; }
          .prose table { border: 1px solid #e2e8f0 !important; width: 100% !important; border-collapse: collapse !important; }
          .prose th, .prose td { border: 1px solid #e2e8f0 !important; padding: 8px !important; }
          .prose thead { background-color: #f8fafc !important; }
        }
        .prose table { width: 100%; border-collapse: collapse; }
        .prose thead th { background-color: #f8fafc; text-transform: uppercase; font-size: 0.65rem; letter-spacing: 0.05em; color: #64748b; font-weight: 800; border: 1px solid #e2e8f0; }
        .prose td { border: 1px solid #e2e8f0; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
