export type PhraseResponse = {
  message: string;
  category: string;
};

export type ApiResponse = {
  success: boolean;
  phrase?: PhraseResponse;
  message?: string;
};