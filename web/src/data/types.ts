export type Level = "kozep" | "emelt";
export type Subject = "informatika" | "digitalis_kultura";
export type Variant = "normal" | "idegen";

export type TopicKey =
  | "szoveg"
  | "tablazat"
  | "adatbazis"
  | "programozas"
  | "weblap"
  | "prezentacio"
  | "prezentacio_grafika";

export interface Exam {
  id: string;
  year: number;
  month: number;
  level: Level;
  subject: Subject;
  variant: Variant;
  period_label: string;
  period_raw: string;
  storage_dir: string;
  topics: TopicKey[];
  file_counts: { feladatlap_pdf: number; forras: number; megoldas: number };
  source_types: Record<string, number>;
  solution_types: Record<string, number>;
  has: Record<string, boolean>;
  pages: { feladatlap: number; utmutato: number };
  text_ok: { feladatlap: boolean | null; utmutato: boolean | null };
  ocr_needed: boolean;
  total_points: number | null;
  layout: "rmg_tools" | "oh_raw";
  notes: string | null;
  warnings: string[];
}

export interface ExamsFile {
  generated_by: string;
  digkult_from_year: number;
  topic_labels: Record<TopicKey, string>;
  exams: Exam[];
}

export interface MetricsFile {
  generated_by: string;
  /** vizsga-azonosító -> kulcs -> darabszám */
  by_exam: Record<string, Record<string, number>>;
}

export interface VocabFunction {
  canon: string;
  aliases: string[];
  family: string;
  since?: number;
}

export interface VocabFile {
  functions: VocabFunction[];
  function_families: Record<string, string>;
  tablazat_skills: VocabLabel[];
  sql_keywords: VocabLabel[];
  algorithms: VocabLabel[];
  programozas_io: VocabLabel[];
}

export interface VocabLabel {
  key: string;
  label: string;
}
