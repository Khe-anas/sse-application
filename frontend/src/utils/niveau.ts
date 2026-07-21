import { Niveau } from '@/types';

const niveauTranslationKeys: Record<Niveau, string> = {
  [Niveau.N0]: 'evaluation.niveau0',
  [Niveau.N1]: 'evaluation.niveau1',
  [Niveau.N2]: 'evaluation.niveau2',
  [Niveau.N3]: 'evaluation.niveau3',
};

export function getNiveauTranslationKey(niveau: Niveau | string) {
  return niveauTranslationKeys[niveau as Niveau] || 'evaluation.niveau0';
}
