import { GoogleGenAI } from "@google/genai";
import { Grade, Subject, StudentScore, PerformanceInsight } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generatePerformanceInsights(
  params: {
    grade: Grade;
    subject: Subject;
    topic: string;
    scores: StudentScore[];
  }
): Promise<PerformanceInsight> {
  const { grade, subject, topic, scores } = params;
  
  const avgDiagnostik = scores.length > 0 ? scores.reduce((a, b) => a + b.diagnostik, 0) / scores.length : 0;
  const avgFormatif = scores.length > 0 ? scores.reduce((a, b) => a + b.formatif, 0) / scores.length : 0;
  const avgSumatif = scores.length > 0 ? scores.reduce((a, b) => a + b.sumatif, 0) / scores.length : 0;

  const prompt = `
    Analisis data nilai murid berikut untuk Mata Pelajaran ${subject} Kelas ${grade} SD dengan topik "${topic}".
    Data Nilai Rata-rata:
    - Diagnostik (Awal): ${avgDiagnostik.toFixed(2)}
    - Formatif (Proses): ${avgFormatif.toFixed(2)}
    - Sumatif (Akhir): ${avgSumatif.toFixed(2)}

    Berdasarkan data ini, berikan:
    1. Ringkasan singkat kinerja kelas keseluruhan (maks 2 kalimat).
    2. 3 kekuatan utama yang teramati.
    3. 3 rekomendasi konkret untuk perbaikan atau tindak lanjut.

    Format respons kudu JSON murni dengan struktur:
    {
      "summary": "string",
      "strengths": ["string", "string", "string"],
      "recommendations": ["string", "string", "string"]
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const data = JSON.parse(response.text || '{}');

    return {
      summary: data.summary || "Analisis kinerja kelas telah selesai diproses.",
      strengths: data.strengths || ["Partisipasi kelas", "Ketepatan waktu", "Minat belajar"],
      recommendations: data.recommendations || ["Berikan pengayaan materi", "Evaluasi metode pengajaran", "Gunakan alat peraga visual"],
      visualData: [
        { category: 'Diagnostik', average: avgDiagnostik },
        { category: 'Formatif', average: avgFormatif },
        { category: 'Sumatif', average: avgSumatif },
      ]
    };
  } catch (error) {
    console.error("Error generating insights:", error);
    return {
      summary: "Gagal menghasilkan analisis otomatis. Berdasarkan data, rata-rata nilai menunjukkan perkembangan dari tahap awal ke akhir.",
      strengths: ["Kedisiplinan mengikuti tes", "Ketelitian pengerjaan"],
      recommendations: ["Berikan pengayaan pada murid dengan nilai tinggi", "Lakukan remedial untuk murid di bawah KKM"],
      visualData: [
        { category: 'Diagnostik', average: avgDiagnostik },
        { category: 'Formatif', average: avgFormatif },
        { category: 'Sumatif', average: avgSumatif },
      ]
    };
  }
}

export async function getSuggestedTopics(grade: Grade, subject: Subject): Promise<string[]> {
  const prompt = `
    Berikan daftar 5 topik atau materi pembelajaran yang paling relevan untuk mata pelajaran ${subject} di Kelas ${grade} Sekolah Dasar berdasarkan Kurikulum Merdeka di Indonesia.
    Hanya berikan daftar nama topik saja, dipisahkan dengan koma. Jangan ada penjelasan tambahan.
    Contoh: Topik 1, Topik 2, Topik 3
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    const text = response.text || '';
    return text.split(',').map(s => s.trim().replace(/^[\d.]+\s*/, '')).filter(Boolean);
  } catch (error) {
    console.error("Error fetching suggestions:", error);
    return [];
  }
}

export async function generateRPMContent(params: {
  grade: Grade;
  subject: Subject;
  topic: string;
  semester: number;
  academicYear: string;
  meetings: number;
  studentCount: number;
  timeAllocation: string;
  capaianPembelajaran?: string;
  tujuanPembelajaran?: string;
  pgCount?: number;
  essayCount?: number;
  isianCount?: number;
}) {
  const { 
    grade, 
    subject, 
    topic, 
    semester, 
    academicYear, 
    meetings, 
    studentCount, 
    timeAllocation,
    capaianPembelajaran,
    tujuanPembelajaran,
    pgCount,
    essayCount,
    isianCount
  } = params;

  const prompt = `
    Bertindaklah sebagai ahli kurikulum pendidikan dasar di Indonesia dan spesialis pedagogi "Deep Learning" (Pembelajaran Mendalam) terbaru. 
    Buatkan Rencana Pelaksanaan Pembelajaran (RPP/RPM) Kurikulum Merdeka yang sangat detail, profesional, inspiratif, dan berpusat pada murid.
    
    Data Spesifik:
    - Mata Pelajaran: ${subject}
    - Kelas: ${grade} Sekolah Dasar
    - Semester: ${semester}
    - Tahun Pembelajaran: ${academicYear}
    - Jumlah Pertemuan: ${meetings} Pertemuan
    - Jumlah Murid: ${studentCount} Murid
    - Alokasi Waktu: ${timeAllocation}
    - Topik/Materi Utama: ${topic}
    ${capaianPembelajaran ? `- Capaian Pembelajaran (Input): ${capaianPembelajaran}` : ''}
    ${tujuanPembelajaran ? `- Tujuan Pembelajaran (Input): ${tujuanPembelajaran}` : ''}
    
    Instruksi Khusus Deep Learning:
    - Integrasikan strategi yang mendorong pemahaman mendalam (deep understanding) bukan sekadar hafalan.
    - Sertakan pertanyaan pemantik yang merangsang kognitif tingkat tinggi (HOTS).
    - Pastikan rancangan kegiatan memfasilitasi koneksi antara materi dengan kehidupan nyata murid.
    
    Konten harus mencakup bagian-bagian berikut dengan format Markdown yang sangat terstruktur, **menggunakan tabel untuk sebagian besar bagian** agar rapi:
    
    1. **Identitas Modul** (Gunakan tabel: Nama, Sekolah, Tahun, Kelas, Mapel, Alokasi Waktu)
    2. **IDENTIFIKASI** (Jabarkan secara mendetail dan terperinci):
        *   **Peserta Didik**: Generate secara otomatis mencakup:
            *   **Pengetahuan Awal**: Identifikasi prasyarat kognitif murid untuk topik ${topic}.
            *   **Minat**: Prediksi area minat murid yang dapat dikaitkan dengan materi ini.
            *   **Latar Belakang**: Deskripsi konteks sosial-budaya atau pengalaman keseharian murid yang relevan.
            *   **Kebutuhan Belajar**: Analisis kebutuhan (Diferensiasi: konten, proses, atau produk) berdasarkan tingkat kesiapan.
        *   **Materi Pelajaran** (Sajikan dalam tabel atau list):
            *   **Faktual**: Data, fakta, atau kejadian nyata terkait ${topic}.
            *   **Konseptual**: Klasifikasi, kategori, atau prinsip dasar.
            *   **Prosedural**: Langkah-langkah, teknik, atau metode.
            *   **Metakognitif**: Kesadaran akan proses berpikir dan pengaturan diri dalam mempelajari ${topic}.
        *   **8 Dimensi Profil Lulusan** (Sajikan dalam tabel yang mencakup seluruh 8 dimensi: **Keimanan & Ketakwaan**, **Kewargaan**, **Penalaran Kritis**, **Kreativitas**, **Kolaborasi**, **Kemandirian**, **Kesehatan**, **Komunikasi**):
            *   Format Tabel Kolom: | Pilih (V) | Dimensi | Deskripsi Relevansi dengan ${topic} |
            *   Instruksi: Berikan tanda centang [V] pada kolom "Pilih" hanya untuk beberapa dimensi yang paling sesuai dengan materi pembelajaran ${topic}. Untuk dimensi yang terpilih, berikan deskripsi konkret bagaimana dimensi tersebut dikembangkan.
    3. **DESAIN PEMBELAJARAN** (Generate secara detail dan terperinci):
        *   **Capaian Pembelajaran (CP)**: ${capaianPembelajaran ? `(Gunakan input ini sebagai referensi utama: ${capaianPembelajaran})` : "Generate secara otomatis deskripsi kompetensi akhir fase yang relevan dengan topik ini **sesuai dengan Keputusan Kepala BSKAP Nomor 046/H/KR/2025**."}
        *   **Lintas Disiplin Ilmu**: Generate secara otomatis koneksi materi ${topic} dengan mata pelajaran lain secara relevan dan mendetail.
        *   **Tujuan Pembelajaran (TP)**: ${tujuanPembelajaran ? `(Gunakan input ini sebagai referensi utama: ${tujuanPembelajaran})` : "Generate secara otomatis sasaran spesifik (TP) yang ingin dicapai diderivasi dari CP di atas (Generate secara otomatis dan relevan)."}
        *   **Topik Pembelajaran**: Generate secara otomatis topik yang lebih spesifik yang diderivasi dari materi ${topic}.
        *   **Praktik Pedagogis per Pertemuan**: Pilih secara otomatis dari daftar berikut (Inkuiri, PjBL, PBL, Game Based, Station Learning) mana yang paling cocok untuk setiap pertemuan (${meetings} pertemuan). Jabarkan mengapa praktik tersebut dipilih.
        *   **Kemitraan Pembelajaran**: Generate kemungkinan keterlibatan pihak luar kelas (orang tua, komunitas, ahli) yang relevan untuk memperkaya pembelajaran.
        *   **Lingkungan Pembelajaran**: Penataan setting belajar yang mencakup aspek **fisik, virtual, dan budaya kelas**.
        *   **Pemanfaatan Digital**: Penggunaan teknologi/media digital dalam sesi ini (sertakan **tools online yang spesifik dan relevan** untuk mendukung pembelajaran ${topic}).
    4. **Model & Metode Pembelajaran** (Gunakan tabel):
        *   **Model Pembelajaran**: (Misal: Tatap Muka, PBL, atau PJBL).
        *   **Metode Pembelajaran**: Pilih secara otomatis metode yang paling relevan dengan materi ${topic} dari daftar berikut: Ceramah, Diskusi, Tanya Jawab, Eksperimen, Demonstrasi, Discovery, Studi Kasus, Role Play, Mind Mapping. (Sebutkan metode yang dipilih dan sesuaikan dengan prinsip *Deep Learning*).
    5. **Sarana, Prasarana & Target Murid** (Gunakan tabel)
    6. **Pemahaman Bermakna & Pertanyaan Pemantik** (Gunakan tabel)
    7. **Ringkasan Materi (Materi Deep Learning)**: Sajikan ringkasan materi inti yang esensial, mendalam, dan selaras dengan cakupan materi *deep learning* terbaru. **Materi harus dibagi secara logis sesuai dengan proporsi ${meetings} pertemuan**.
    8. **Kegiatan Pembelajaran (Deep Learning)**: Langkah-langkah detail (Pendahuluan, Inti, Penutup) yang **secara eksplisit disusun untuk masing-masing dari ${meetings} pertemuan**.
        *   **Kegiatan Pendahuluan**: Harus dijabarkan secara mendetail, naratif, kontekstual, dan reflektif. **WAJIB memuat**:
            *   Salam, doa, dan presensi.
            *   Menyanyikan Lagu Nasional (untuk menumbuhkan nasionalisme).
            *   Review/Pembuatan Kesepakatan Kelas.
            *   Unsur KSE (Kompetensi Sosial Emosional) untuk menyiapkan kesiapan belajar murid.
            *   Ice Breaking yang relevan.
            *   Penyampaian Tujuan Pembelajaran secara clear.
            *   Pertanyaan Pemantik HOTS (open-ended) yang memacu rasa ingin tahu.
        *   **Kegiatan Inti**: Harus mengikuti alur *Deep Learning* yang dipisahkan secara eksklusif menjadi 3 tahap utama:
            *   **Memahami (Understanding)**: Jabarkan secara mendetail dan terperinci bagaimana murid membangun pemahaman mendalam tentang konsep ${topic}.
            *   **Mengaplikasi (Applying)**: Jabarkan secara mendetail dan terperinci aktivitas nyata di mana murid menerapkan pemahamannya ke dalam konteks baru atau memecahkan masalah.
            *   **Merefleksi (Reflecting)**: Jabarkan secara mendetail dan terperinci proses kognitif murid dalam meninjau kembali apa yang telah dilakukan dan dipelajari.
            Pastikan setiap tahap dijabarkan dengan langkah-langkah konkret, kreatif, dan berpusat pada murid.
        *   **Kegiatan Penutup**: Jabarkan secara mendetail dan terperinci, WAJIB mencakup:
            *   **Refleksi**: Mengajak murid merenungkan apa yang telah dipelajari dan dirasakan.
            *   **Umpan Balik**: Guru memberikan apresiasi dan masukan membangun terhadap proses belajar.
            *   **Kesimpulan Bersama**: Guru dan murid merumuskan poin penting pembelajaran secara kolaboratif.
            *   **Rencana Pembelajaran Selanjutnya**: Gambaran tentang apa yang akan dipelajari di pertemuan berikutnya.
    9. **ASESMEN PEMBELAJARAN** (Generate secara detail dan lengkap):
        *   **Asesmen Awal (Diagnostik)**: Buatkan **3 soal diagnostik** singkat untuk mengukur kesiapan murid sebelum memulai materi ${topic}.
        *   **Asesmen Formatif**: Sertakan panduan **observasi** selama proses pembelajaran dan **rubrik penilaian** yang jelas, mendetail, dan aplikatif.
        *   **Asesmen Sumatif**:
            *   **Indikator**: Jabarkan indikator ketercapaian tujuan pembelajaran secara terperinci.
            *   **Instrumen**: Sebutkan instrumen penilaian yang digunakan.
            *   **Soal Pilihan Ganda (PG)**: Generate **${pgCount || 5} soal** Pilihan Ganda berkualitas tinggi (HOTS) lengkap dengan pilihan jawaban (A, B, C, D) dan kunci jawaban.
            *   **Soal Isian Singkat**: Generate **${isianCount || 5} soal** Isian Singkat yang menguji pemahaman konsep, lengkap dengan kunci jawaban.
            *   **Soal Esai/Uraian**: Generate **${essayCount || 3} soal** Esai/Uraian mendalam lengkap dengan kunci jawaban dan rubrik penilaiannya.
    10. **Program Remedial & Pengayaan**: Sajikan dalam **format tabel** yang mendetail, mencakup strategi khusus untuk murid yang membutuhkan bimbingan (remedial) dan tantangan lebih (pengayaan) terkait materi ${topic}.
    11. **Peta Pengalaman Belajar Murid**: Uraikan secara **otomatis, terperinci, dan mendetail** peta pengalaman belajar murid berdasarkan materi ${topic} yang mencakup tahapan-tahapan berikut:
        *   **Mengalami**: Deskripsi aktivitas nyata di mana murid bersentuhan langsung dengan materi atau konteks kehidupan sehari-hari secara bermakna.
        *   **Bertanya**: Daftar pertanyaan-pertanyaan kritis dan pemantik yang muncul dari rasa ingin tahu murid untuk mengeksplorasi topik lebih jauh.
        *   **Mengeksplorasi**: Aktivitas investigasi, eksperimen, atau pencarian informasi mendalam yang dilakukan murid secara aktif.
        *   **Merefleksi**: Proses kognitif dan emosional di mana murid memaknai apa yang telah dipelajari dan bagaimana proses belajarnya.
        *   **Mengaplikasikan**: Penerapan pengetahuan dan keterampilan baru ke dalam situasi nyata, proyek kreatif, atau penyelesaian masalah yang relevan.
        
        **Syarat Penulisan Peta Pengalaman**:
        - Harus **sesuai dengan sintaks model pembelajaran** yang digunakan.
        - Sajikan dalam format **naratif yang diperkuat dengan bullet point**.
        - Pastikan seluruh aktivitas mencerminkan pembelajaran yang **aktif, kolaboratif, dan mendalam (deep learning)**.
        - Pastikan pengalaman belajar terasa **bermakna dan menyenangkan** bagi murid.
        (Sajikan dalam format yang sangat terstruktur dan mudah dipahami guru).
    12. **Refleksi Guru & Murid**
        *   **Refleksi Guru**: Sertakan daftar pertanyaan reflektif untuk guru.
        *   **Refleksi Murid**: Sertakan daftar pertanyaan atau aktivitas reflektif untuk murid.
    13. **Lampiran** 
        *   **Lembar Kerja Murid (LKM/LKPD)**: Kerangka dasar yang siap pakai.

    Gunakan gaya bahasa formal namun mudah dipahami guru SD. Pastikan materi dan metode pembelajarannya sesuai dengan cakupan *deep learning* terbaru, AKTIF, dan berpusat pada murid.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    return response.text || '';
  } catch (error) {
    console.error("Error generating RPM:", error);
    throw new Error("Gagal menghasilkan konten RPM. Silakan coba lagi.");
  }
}
