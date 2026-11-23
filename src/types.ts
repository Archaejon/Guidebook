export type ID = string;

export type DomainAccent = 'physical' | 'emotional' | 'spiritual' | 'social' | 'world';

export interface Domain {
  id: ID;
  roman: string;
  title: string;
  subtitle: string;
  accent: DomainAccent;
  intro: string;
  purpose: string;
  outcomes: string[];
  principles: string[];
  connections: { domainId: ID; note: string }[];
  questions: string[];
  createdAt: string;
  updatedAt: string;
  illustrative?: boolean;
}

export interface Section {
  id: ID;
  domainId: ID;
  title: string;
  description: string;
  outcomes: string[];
  frameworks: string[];
  draft: string;
  questions: string[];
  relatedSectionIds: ID[];
  createdAt: string;
  updatedAt: string;
  illustrative?: boolean;
}

export const METHOD_STATUSES = [
  'Idea',
  'To research',
  'In development',
  'Ready for testing',
  'Being tested',
  'Needs revision',
  'Evidence reviewed',
  'Ready for manuscript',
  'Published',
] as const;

export type MethodStatus = (typeof METHOD_STATUSES)[number];

export const METHOD_STATUS_SHORT: Record<MethodStatus, string> = {
  Idea: 'idea',
  'To research': 'research',
  'In development': 'drafting',
  'Ready for testing': 'testing ready',
  'Being tested': 'testing',
  'Needs revision': 'revision',
  'Evidence reviewed': 'reviewed',
  'Ready for manuscript': 'manuscript',
  Published: 'published',
};

export interface MethodPurpose {
  problem: string;
  importance: string;
  outcomes: string;
  suitableFor: string;
  unsuitableWhen: string;
}

export interface MethodInstructions {
  preparation: string;
  steps: string[];
  frequency: string;
  beginner: string;
  intermediate: string;
  advanced: string;
  adaptations: string;
  mistakes: string;
  safety: string;
}

export interface MethodRationale {
  mechanisms: string;
  evidence: string;
  counterEvidence: string;
  assumptions: string;
  uncertainties: string;
}

export interface MethodKnowledge {
  science: string;
  books: string;
  philosophy: string;
  history: string;
  observations: string;
}

export interface MethodEvaluation {
  success: string;
  measures: string;
  timeframe: string;
  costs: string;
  confidence: string;
}

export interface MethodApplication {
  self: string;
  family: string;
  community: string;
  society: string;
  ecological: string;
}

export interface MethodNotes {
  questions: string[];
  disagreements: string;
  reflections: string;
  improvements: string;
  futureExperiments: string;
}

export interface ScaleImpact {
  direct: string;
  indirect: string;
  beneficiaries: string;
  costs: string;
  dependencies: string;
  unintended: string;
}

export type ScaleKey = 'self' | 'family' | 'community' | 'region' | 'global' | 'ecological';

export const SCALES: { key: ScaleKey; label: string; short: string; description: string }[] = [
  { key: 'self', label: 'Self', short: 'Self', description: 'The individual body, mind and daily life.' },
  { key: 'family', label: 'Close relationships & family', short: 'Family', description: 'Partners, children, friends and household.' },
  { key: 'community', label: 'Local community', short: 'Community', description: 'Neighbours, groups, institutions and shared places.' },
  { key: 'region', label: 'City, region & country', short: 'Region', description: 'Civic structures, policy, land and infrastructure.' },
  { key: 'global', label: 'Global humanity', short: 'Global', description: 'Cross-border systems, culture and cooperation.' },
  { key: 'ecological', label: 'Other living beings & ecosystems', short: 'Ecological', description: 'Non-human life, habitats and planetary systems.' },
];

export type MethodSectionKey =
  | 'purpose'
  | 'instructions'
  | 'rationale'
  | 'knowledge'
  | 'evaluation'
  | 'application'
  | 'scales'
  | 'notes';

export interface Method {
  id: ID;
  title: string;
  summary: string;
  primaryDomainId: ID;
  primarySectionId: ID | '';
  secondaryDomainIds: ID[];
  relatedSectionIds: ID[];
  tags: string[];
  status: MethodStatus;
  createdAt: string;
  updatedAt: string;
  illustrative?: boolean;
  purpose: MethodPurpose;
  instructions: MethodInstructions;
  rationale: MethodRationale;
  knowledge: MethodKnowledge;
  evaluation: MethodEvaluation;
  application: MethodApplication;
  notes: MethodNotes;
  scales: Record<ScaleKey, ScaleImpact>;
  hiddenSections: MethodSectionKey[];
}

export type DocKind = 'part' | 'chapter' | 'section' | 'subsection' | 'passage';

export const DOC_KINDS: DocKind[] = ['part', 'chapter', 'section', 'subsection', 'passage'];

export interface DocComment {
  id: ID;
  excerpt: string;
  body: string;
  resolved: boolean;
  createdAt: string;
}

export type DocStatus = 'Draft' | 'Revising' | 'Review' | 'Ready' | 'Published';

export const DOC_STATUSES: DocStatus[] = ['Draft', 'Revising', 'Review', 'Ready', 'Published'];

export interface ManuscriptDoc {
  id: ID;
  parentId: ID | null;
  kind: DocKind;
  title: string;
  content: string;
  status: DocStatus;
  order: number;
  comments: DocComment[];
  createdAt: string;
  updatedAt: string;
  illustrative?: boolean;
}

export type SourceKind =
  | 'book'
  | 'paper'
  | 'report'
  | 'website'
  | 'text'
  | 'framework'
  | 'observation'
  | 'case-study'
  | 'question';

export const SOURCE_KINDS: { key: SourceKind; label: string }[] = [
  { key: 'book', label: 'Book' },
  { key: 'paper', label: 'Academic paper / study' },
  { key: 'report', label: 'Report / dataset' },
  { key: 'website', label: 'Website / article' },
  { key: 'text', label: 'Religious / philosophical text' },
  { key: 'framework', label: 'Theoretical framework' },
  { key: 'observation', label: 'Personal observation' },
  { key: 'case-study', label: 'Community case study' },
  { key: 'question', label: 'Question / hypothesis' },
];

export type ReadingStatus = 'Unread' | 'Reading' | 'Read' | 'Reviewed';

export const READING_STATUSES: ReadingStatus[] = ['Unread', 'Reading', 'Read', 'Reviewed'];

export type Verification = 'Stated in source' | 'Author interpretation' | 'Proposed application' | 'Needs verification';

export const VERIFICATIONS: Verification[] = [
  'Stated in source',
  'Author interpretation',
  'Proposed application',
  'Needs verification',
];

export interface ResearchSource {
  id: ID;
  kind: SourceKind;
  title: string;
  creator: string;
  year: string;
  publication: string;
  identifier: string;
  url: string;
  pages: string;
  summary: string;
  keyClaims: string;
  evidence: string;
  limitations: string;
  interpretation: string;
  implications: string;
  verification: Verification;
  readingStatus: ReadingStatus;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  illustrative?: boolean;
}

export interface ReadingNote {
  id: ID;
  sourceId: ID | '';
  title: string;
  body: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  illustrative?: boolean;
}

export interface Quotation {
  id: ID;
  sourceId: ID | '';
  text: string;
  page: string;
  note: string;
  createdAt: string;
  illustrative?: boolean;
}

export type ClaimStatus = 'Needs source' | 'Needs verification' | 'Supported' | 'Contested' | 'Interpretive';

export const CLAIM_STATUSES: ClaimStatus[] = [
  'Needs source',
  'Needs verification',
  'Supported',
  'Contested',
  'Interpretive',
];

export interface Claim {
  id: ID;
  statement: string;
  status: ClaimStatus;
  sourceIds: ID[];
  notes: string;
  createdAt: string;
  updatedAt: string;
  illustrative?: boolean;
}

export type ExperimentStatus = 'Planned' | 'Running' | 'Complete' | 'Abandoned';

export const EXPERIMENT_STATUSES: ExperimentStatus[] = ['Planned', 'Running', 'Complete', 'Abandoned'];

export type ExperimentScale = 'Individual' | 'Family / close relationships' | 'Community' | 'Regional' | 'Global';

export const EXPERIMENT_SCALES: ExperimentScale[] = [
  'Individual',
  'Family / close relationships',
  'Community',
  'Regional',
  'Global',
];

export interface Experiment {
  id: ID;
  title: string;
  hypothesis: string;
  context: string;
  participants: string;
  procedure: string;
  expected: string;
  observations: string;
  startDate: string;
  endDate: string;
  worked: string;
  failed: string;
  confounders: string;
  lessons: string;
  revisions: string;
  scale: ExperimentScale;
  status: ExperimentStatus;
  createdAt: string;
  updatedAt: string;
  illustrative?: boolean;
}

export interface InboxItem {
  id: ID;
  text: string;
  createdAt: string;
}

export type RelationshipType =
  | 'supports'
  | 'challenges'
  | 'extends'
  | 'contradicts'
  | 'applies'
  | 'depends_on'
  | 'related_to'
  | 'references'
  | 'tests'
  | 'inspired_by';

export const RELATIONSHIP_TYPES: { key: RelationshipType; label: string; description: string }[] = [
  { key: 'supports', label: 'Supports', description: 'The source or record gives support to the target.' },
  { key: 'challenges', label: 'Challenges', description: 'Raises a difficulty, counterexample or limiting finding.' },
  { key: 'extends', label: 'Extends', description: 'Develops the target further or adds a new dimension.' },
  { key: 'contradicts', label: 'Contradicts', description: 'Makes a claim incompatible with the target.' },
  { key: 'applies', label: 'Applies', description: 'Puts an idea into practice in a particular context.' },
  { key: 'depends_on', label: 'Depends on', description: 'Relies on the target holding true or being available.' },
  { key: 'related_to', label: 'Related to', description: 'A meaningful but untyped connection.' },
  { key: 'references', label: 'References', description: 'Mentions or cites the target in the manuscript.' },
  { key: 'tests', label: 'Tests', description: 'An experiment or observation that tests the target.' },
  { key: 'inspired_by', label: 'Inspired by', description: 'The target prompted this idea or practice.' },
];

export interface Relationship {
  id: ID;
  fromId: ID;
  toId: ID;
  type: RelationshipType;
  note: string;
  createdAt: string;
}

export type TrashCollection = 'methods' | 'sections' | 'notes' | 'quotations' | 'claims';

/** A field on a record that a deletion changed, and how. */
export interface TrashFieldChange {
  collection: TrashCollection;
  id: ID;
  field: string;
}

/**
 * What a deletion changed on *other* records, so a restore can put it back.
 *
 * Deleting a record is not a pure removal: relationships pointing at it go, a
 * method sitting in the deleted section is unassigned, a note loses its
 * source. Without this the record came back alone and those links were lost
 * for good.
 */
export interface TrashEffects {
  /** Relationships removed because they pointed at the deleted record. */
  relationships: Relationship[];
  /** A single-value reference the deletion blanked, and the id it held. */
  cleared: (TrashFieldChange & { previous: ID })[];
  /** An id the deletion took out of a list field. */
  detached: (TrashFieldChange & { value: ID })[];
}

export interface TrashItem {
  id: ID;
  entityType: string;
  label: string;
  deletedAt: string;
  data: unknown;
  /** Absent on entries written before effects were recorded. */
  effects?: TrashEffects;
}

export interface DashboardSettings {
  widgets: string[];
  recentLimit: number;
  pinnedSectionIds: ID[];
}

export interface Settings {
  authorName: string;
  projectTitle: string;
  readerTitle: string;
  dashboard: DashboardSettings;
  showIllustrativeBadges: boolean;
}

export interface Project {
  version: number;
  domains: Domain[];
  sections: Section[];
  methods: Method[];
  documents: ManuscriptDoc[];
  sources: ResearchSource[];
  notes: ReadingNote[];
  quotations: Quotation[];
  claims: Claim[];
  experiments: Experiment[];
  inbox: InboxItem[];
  relationships: Relationship[];
  trash: TrashItem[];
  settings: Settings;
  meta: { createdAt: string; lastSavedAt: string; revision: number };
}

export interface Snapshot {
  id: string;
  createdAt: string;
  label: string;
  project: Project;
}

export interface SearchResult {
  id: ID;
  title: string;
  subtitle: string;
  excerpt: string;
  type: string;
  route: string;
  domainId?: ID;
  status?: string;
  tags: string[];
  updatedAt: string;
}

export const ENTITY_LABELS: Record<string, string> = {
  method: 'Method',
  section: 'Section',
  domain: 'Domain',
  document: 'Manuscript',
  source: 'Research',
  note: 'Reading note',
  quotation: 'Quotation',
  claim: 'Claim',
  experiment: 'Experiment',
  inbox: 'Inbox',
};
