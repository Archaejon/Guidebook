import type {
  Claim,
  DocComment,
  Experiment,
  ManuscriptDoc,
  Method,
  Quotation,
  ReadingNote,
  ResearchSource,
  ScaleImpact,
  ScaleKey,
  Section,
} from '../types';

export const now = () => new Date().toISOString();

export function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export const blankScale = (): ScaleImpact => ({
  direct: '',
  indirect: '',
  beneficiaries: '',
  costs: '',
  dependencies: '',
  unintended: '',
});

export const blankScales = (): Record<ScaleKey, ScaleImpact> => ({
  self: blankScale(),
  family: blankScale(),
  community: blankScale(),
  region: blankScale(),
  global: blankScale(),
  ecological: blankScale(),
});

export function blankMethod(partial: Partial<Method> = {}): Method {
  const ts = now();
  return {
    id: uid('m'),
    title: 'Untitled method',
    summary: '',
    primaryDomainId: '',
    primarySectionId: '',
    secondaryDomainIds: [],
    relatedSectionIds: [],
    tags: [],
    status: 'Idea',
    createdAt: ts,
    updatedAt: ts,
    purpose: { problem: '', importance: '', outcomes: '', suitableFor: '', unsuitableWhen: '' },
    instructions: {
      preparation: '',
      steps: [],
      frequency: '',
      beginner: '',
      intermediate: '',
      advanced: '',
      adaptations: '',
      mistakes: '',
      safety: '',
    },
    rationale: { mechanisms: '', evidence: '', counterEvidence: '', assumptions: '', uncertainties: '' },
    knowledge: { science: '', books: '', philosophy: '', history: '', observations: '' },
    evaluation: { success: '', measures: '', timeframe: '', costs: '', confidence: '' },
    application: { self: '', family: '', community: '', society: '', ecological: '' },
    notes: { questions: [], disagreements: '', reflections: '', improvements: '', futureExperiments: '' },
    scales: blankScales(),
    hiddenSections: [],
    ...partial,
  };
}

export function blankSection(partial: Partial<Section> = {}): Section {
  const ts = now();
  return {
    id: uid('sec'),
    domainId: '',
    title: 'New section',
    description: '',
    outcomes: [],
    frameworks: [],
    draft: '',
    questions: [],
    relatedSectionIds: [],
    createdAt: ts,
    updatedAt: ts,
    ...partial,
  };
}

export function blankDocument(partial: Partial<ManuscriptDoc> = {}): ManuscriptDoc {
  const ts = now();
  return {
    id: uid('doc'),
    parentId: null,
    kind: 'chapter',
    title: 'Untitled chapter',
    content: '',
    status: 'Draft',
    order: 0,
    comments: [],
    createdAt: ts,
    updatedAt: ts,
    ...partial,
  };
}

export function blankSource(partial: Partial<ResearchSource> = {}): ResearchSource {
  const ts = now();
  return {
    id: uid('src'),
    kind: 'book',
    title: 'Untitled source',
    creator: '',
    year: '',
    publication: '',
    identifier: '',
    url: '',
    pages: '',
    summary: '',
    keyClaims: '',
    evidence: '',
    limitations: '',
    interpretation: '',
    implications: '',
    verification: 'Needs verification',
    readingStatus: 'Unread',
    tags: [],
    createdAt: ts,
    updatedAt: ts,
    ...partial,
  };
}

export function blankNote(partial: Partial<ReadingNote> = {}): ReadingNote {
  const ts = now();
  return {
    id: uid('note'),
    sourceId: '',
    title: 'Untitled reading note',
    body: '',
    tags: [],
    createdAt: ts,
    updatedAt: ts,
    ...partial,
  };
}

export function blankQuotation(partial: Partial<Quotation> = {}): Quotation {
  return {
    id: uid('quote'),
    sourceId: '',
    text: '',
    page: '',
    note: '',
    createdAt: now(),
    ...partial,
  };
}

export function blankClaim(partial: Partial<Claim> = {}): Claim {
  const ts = now();
  return {
    id: uid('claim'),
    statement: '',
    status: 'Needs source',
    sourceIds: [],
    notes: '',
    createdAt: ts,
    updatedAt: ts,
    ...partial,
  };
}

export function blankExperiment(partial: Partial<Experiment> = {}): Experiment {
  const ts = now();
  return {
    id: uid('exp'),
    title: 'Untitled experiment',
    hypothesis: '',
    context: '',
    participants: '',
    procedure: '',
    expected: '',
    observations: '',
    startDate: '',
    endDate: '',
    worked: '',
    failed: '',
    confounders: '',
    lessons: '',
    revisions: '',
    scale: 'Individual',
    status: 'Planned',
    createdAt: ts,
    updatedAt: ts,
    ...partial,
  };
}

export function blankComment(partial: Partial<DocComment> = {}): DocComment {
  return {
    id: uid('c'),
    excerpt: '',
    body: '',
    resolved: false,
    createdAt: now(),
    ...partial,
  };
}
