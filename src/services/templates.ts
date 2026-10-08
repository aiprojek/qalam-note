import type { NoteTemplate, AppLanguage } from '../types';

export const DEFAULT_TEMPLATES_ID: NoteTemplate[] = [
  {
    id: 'meeting',
    title: 'Notula Rapat (Meeting Minutes)',
    description: 'Format rapi untuk mencatat agenda, kehadiran, poin diskusi, dan tindak lanjut tugas.',
    category: 'meeting',
    icon: 'Users',
    content: `# Notula Rapat: {{title}}

**Tanggal:** {{date}} | **Waktu:** {{time}}
**Penyelenggara / Pimpinan Rapat:**
**Daftar Peserta:**
- [x] Peserta 1
- [x] Peserta 2

---

## 📌 1. Agenda Utama
1. Evaluasi kemajuan target
2. Pembahasan kendala teknis
3. Penentuan tenggat waktu baru

## 💬 2. Catatan & Poin Diskusi
- Ringkasan poin penting dari pembahasan pertama...
- Masukan dari tim teknis...

## ✅ 3. Tindak Lanjut & Action Items
- [ ] **[Nama Penanggung Jawab]**: Menyelesaikan rancangan fitur (Tenggat: {{date}})
- [ ] **[Nama Penanggung Jawab]**: Mengirimkan dokumentasi revisi
`,
  },
  {
    id: 'daily_planner',
    title: 'Rencana Harian (Daily Plan & Log)',
    description: 'Catatan harian untuk fokus prioritas, daftar tugas, dan refleksi akhir hari.',
    category: 'journal',
    icon: 'Calendar',
    content: `# 📅 Rencana Harian: {{date}}

> *"Fokus pada hal yang paling berdampak hari ini."*

---

## 🎯 3 Prioritas Utama Hari Ini
1. [ ] Menyelesaikan tugas prioritas 1
2. [ ] Meninjau pembaruan kode / dokumen
3. [ ] Rapat koordinasi

## 📋 Daftar Tugas & To-Do
- [ ] Memeriksa surel & pesan penting
- [ ] Mengerjakan deliverable utama
- [ ] Istirahat & olahraga ringan 15 menit

## 💡 Ide & Catatan Cepat
- Catatan ide atau pemikiran yang muncul sepanjang hari...

## 🌙 Refleksi Akhir Hari
- **Hal yang berhasil dicapai:** 
- **Pelajaran hari ini:** 
`,
  },
  {
    id: 'book_summary',
    title: 'Ringkasan Buku & Makalah (Book Summary)',
    description: 'Mencatat ide pokok, kutipan penting, dan aplikasi praktis dari bacaan.',
    category: 'study',
    icon: 'BookOpen',
    content: `# 📚 Ringkasan Buku: {{title}}

**Penulis:** 
**Genre / Topik:** 
**Tanggal Selesai Baca:** {{date}}
**Penilaian Pribadi:** ⭐⭐⭐⭐⭐ (5/5)

---

## 🎯 Ide Pokok (The Big Idea)
Ringkasan satu atau dua paragraf tentang pesan sentral buku ini...

## 🔑 3 Pelajaran Terpenting
1. **Poin 1:** Penjelasan ringkas...
2. **Poin 2:** Penjelasan ringkas...
3. **Poin 3:** Penjelasan ringkas...

## 💬 Kutipan Berkesan (Memorable Quotes)
> "Tulis kutipan yang paling membekas di sini."

## 🚀 Rencana Tindak Lanjut Nyata
- [ ] Menerapkan kebiasaan baru berdasarkan bab 3
`,
  },
  {
    id: 'project_spec',
    title: 'Konsep & Arsitektur Proyek (Project Spec)',
    description: 'Kerangka spesifikasi fitur, tujuan, arsitektur teknis, dan milestone peluncuran.',
    category: 'project',
    icon: 'Target',
    content: `# 🚀 Spesifikasi Proyek: {{title}}

**Pemilik Proyek:** 
**Status:** Draf / Perencanaan
**Tanggal Dimulai:** {{date}}

---

## 1. Latar Belakang & Masalah
Jelaskan permasalahan apa yang ingin dipecahkan oleh proyek ini...

## 2. Sasaran & Metrik Keberhasilan
- Pengguna dapat menyelesaikan alur dalam kurang dari 2 menit
- Keandalan sistem 99.9%

## 3. Arsitektur Teknis
- **Penyimpanan:** Local-first IndexedDB
- **Keamanan:** E2EE AES-GCM
- **Sinkronisasi:** WebDAV / Dropbox

## 4. Rencana Rilis (Milestones)
- [ ] Fase 1: Desain antarmuka & prototipe
- [ ] Fase 2: Implementasi logika bisnis
- [ ] Fase 3: Pengujian menyeluruh & peluncuran
`,
  },
  {
    id: 'cornell_notes',
    title: 'Catatan Belajar Cornell (Cornell Notes)',
    description: 'Format studi akademis dengan kolom kata kunci, catatan utama, dan rangkuman akhir.',
    category: 'study',
    icon: 'GraduationCap',
    content: `# 🎓 Catatan Kuliah: {{title}}

**Mata Kuliah / Subjek:** 
**Dosen / Pembicara:** 
**Tanggal:** {{date}}

---

## ❓ Pertanyaan & Kata Kunci (Cue Column)
- Apa konsep dasarnya?
- Mengapa hal ini penting?
- Bagaimana rumus/penerapannya?

## 📝 Catatan Utama (Notes Column)
- Penjelasan materi secara terperinci...
- Contoh kasus dan penjabaran...
- Diagram atau rumus terkait:
  $$ E = mc^2 $$

---

## 📌 Rangkuman Singkat (Summary)
Tuliskan 2-3 kalimat yang merangkum inti sari materi kuliah ini...
`,
  },
];

export const DEFAULT_TEMPLATES_EN: NoteTemplate[] = [
  {
    id: 'meeting',
    title: 'Meeting Minutes',
    description: 'Structured layout for agenda, attendees, discussion points, and action items.',
    category: 'meeting',
    icon: 'Users',
    content: `# Meeting Minutes: {{title}}

**Date:** {{date}} | **Time:** {{time}}
**Organizer:** 
**Attendees:**
- [x] Attendee 1
- [x] Attendee 2

---

## 📌 1. Agenda
1. Progress review
2. Technical bottlenecks
3. Updated timeline

## 💬 2. Discussion Notes
- Key takeaways from discussion...

## ✅ 3. Action Items
- [ ] **[Owner]**: Finalize feature proposal (Due: {{date}})
- [ ] **[Owner]**: Update documentation
`,
  },
  {
    id: 'daily_planner',
    title: 'Daily Planner & Log',
    description: 'Focus on top priorities, to-do list, and evening reflection.',
    category: 'journal',
    icon: 'Calendar',
    content: `# 📅 Daily Plan: {{date}}

> *"Focus on what makes the biggest impact today."*

---

## 🎯 Top 3 Priorities Today
1. [ ] Priority task 1
2. [ ] Review updates
3. [ ] Alignment meeting

## 📋 To-Do List
- [ ] Check inbox & notifications
- [ ] Complete core deliverable
- [ ] 15-min walk / break

## 💡 Quick Notes & Ideas
- Thoughts and observations throughout the day...

## 🌙 Evening Reflection
- **Wins today:** 
- **Lesson learned:** 
`,
  },
  {
    id: 'book_summary',
    title: 'Book / Article Summary',
    description: 'Capture core ideas, key insights, quotes, and practical applications.',
    category: 'study',
    icon: 'BookOpen',
    content: `# 📚 Book Summary: {{title}}

**Author:** 
**Topic / Genre:** 
**Finished Reading:** {{date}}
**Rating:** ⭐⭐⭐⭐⭐ (5/5)

---

## 🎯 The Big Idea
A brief summary of the book's central message...

## 🔑 Key Takeaways
1. **Insight 1:** Brief explanation...
2. **Insight 2:** Brief explanation...
3. **Insight 3:** Brief explanation...

## 💬 Memorable Quotes
> "Paste your favorite quote here."

## 🚀 Practical Action Steps
- [ ] Apply chapter 3 strategy
`,
  },
];

export function getTemplates(lang: AppLanguage = 'id'): NoteTemplate[] {
  return lang === 'id' ? DEFAULT_TEMPLATES_ID : DEFAULT_TEMPLATES_EN;
}

/**
 * Replaces template variables {{date}}, {{time}}, {{title}}, {{day}}
 */
export function renderTemplateContent(templateContent: string, noteTitle: string = ''): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const dayStr = now.toLocaleDateString('id-ID', { weekday: 'long' });

  return templateContent
    .replace(/\{\{title\}\}/g, noteTitle || 'Catatan Baru')
    .replace(/\{\{date\}\}/g, dateStr)
    .replace(/\{\{time\}\}/g, timeStr)
    .replace(/\{\{day\}\}/g, dayStr);
}
