export type PhraseCategoryType = "Amor" | "Fe" | "Esperanza" | "Gratitud" | "Fuerza" | string;

export type PhraseResponse = {
  message: string;
  category: PhraseCategoryType;
};

export type ApiResponse = {
  success: boolean;
  phrase?: PhraseResponse;
  message?: string;
};

export type CronJobResponse = {
  success: boolean;
  message: string;
};

export type SupabasePhrase = {
  texto: string;
  categoria: PhraseCategoryType;
  fecha_creacion: string;
  fecha_ultimo_uso: string | null;
};