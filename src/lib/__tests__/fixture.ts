import type { Domain, Project, Relationship, Section } from '../../types';
import {
  blankClaim,
  blankDocument,
  blankExperiment,
  blankMethod,
  blankNote,
  blankQuotation,
  blankSection,
  blankSource,
} from '../factory';

const daysAgo = (days: number) => new Date(Date.now() - days * 86400000).toISOString();

/**
 * A small but structurally complete project.
 *
 * Deliberate properties the tests rely on:
 * - `m_alpha` is Published and linked to a published chapter, so it is the only
 *   method that should reach the reader edition.
 * - `doc_solo` is a Draft that references `m_beta` only through an inline
 *   `[[method:...]]` token, never through a relationship.
 * - `rel_dangling` points at an id that does not exist, standing in for a
 *   relationship left behind by a deletion.
 * - `exp_one` is deliberately old so date-range filters have something to drop.
 */
export function makeProject(): Project {
  const domains: Domain[] = [
    {
      id: 'dom_a',
      roman: 'I',
      title: 'Physical Health',
      subtitle: 'The body as a foundation.',
      accent: 'physical',
      intro: 'Movement, rest and recovery.',
      purpose: 'Keep the body capable.',
      outcomes: ['Strength', 'Sleep'],
      principles: ['Recovery is part of the work.'],
      connections: [{ domainId: 'dom_b', note: 'Shared activity builds community.' }],
      questions: ['What is the minimum effective dose?'],
      createdAt: daysAgo(10),
      updatedAt: daysAgo(10),
      illustrative: true,
    },
    {
      id: 'dom_b',
      roman: 'II',
      title: 'Social Health',
      subtitle: 'Relationships and place.',
      accent: 'social',
      intro: 'Friendship, family and institutions.',
      purpose: 'Build durable social fabric.',
      outcomes: ['Friendship'],
      principles: ['Proximity matters.'],
      connections: [],
      questions: ['How do adults make friends?'],
      createdAt: daysAgo(10),
      updatedAt: daysAgo(10),
      illustrative: true,
    },
  ];

  const sections: Section[] = [
    blankSection({
      id: 'sec_x',
      domainId: 'dom_a',
      title: 'Strength',
      description: 'Progressive loading.',
      outcomes: ['Lift safely'],
      frameworks: ['Progressive overload'],
      draft: 'Draft notes on training.',
      questions: ['How much is enough?'],
      createdAt: daysAgo(9),
      updatedAt: daysAgo(9),
      illustrative: true,
    }),
    blankSection({
      id: 'sec_y',
      domainId: 'dom_b',
      title: 'Friendship',
      description: 'Making and keeping friends.',
      createdAt: daysAgo(9),
      updatedAt: daysAgo(9),
      illustrative: true,
    }),
  ];

  const methods = [
    blankMethod({
      id: 'm_alpha',
      title: 'Sleep as infrastructure',
      summary: 'Protect sleep before optimising anything else.',
      primaryDomainId: 'dom_a',
      primarySectionId: 'sec_x',
      secondaryDomainIds: ['dom_b'],
      relatedSectionIds: ['sec_y'],
      tags: ['sleep', 'recovery'],
      status: 'Published',
      createdAt: daysAgo(8),
      updatedAt: daysAgo(1),
      illustrative: true,
      purpose: {
        problem: 'Sleep is treated as optional.',
        importance: 'Attention and mood depend on it.',
        outcomes: 'Better attention.',
        suitableFor: 'Anyone with a fixed schedule.',
        unsuitableWhen: 'Clinical sleep disorders.',
      },
      instructions: {
        preparation: 'Dim the lights an hour before bed.',
        steps: ['Set a fixed wake time.', 'Avoid screens for an hour.'],
        frequency: 'Nightly.',
        beginner: 'Start with the wake time only.',
        intermediate: '',
        advanced: '',
        adaptations: '',
        mistakes: '',
        safety: '',
      },
      rationale: {
        mechanisms: 'Consolidation of memory and mood regulation.',
        evidence: 'Consistent sleep timing predicts better outcomes.',
        counterEvidence: '',
        assumptions: '',
        uncertainties: '',
      },
      knowledge: {
        science: 'Sleep architecture research.',
        books: '',
        philosophy: '',
        history: '',
        observations: '',
      },
      evaluation: {
        success: 'Waking without an alarm most days.',
        measures: 'Self-report and resting heart rate.',
        timeframe: 'Six weeks.',
        costs: '',
        confidence: 'Moderate.',
      },
      application: {
        self: 'Same wake time every day.',
        family: '',
        community: '',
        society: '',
        ecological: '',
      },
      notes: {
        questions: [],
        disagreements: '',
        reflections: 'The hardest part is the social cost of leaving early.',
        improvements: '',
        futureExperiments: '',
      },
      scales: {
        self: { direct: 'More energy.', indirect: '', beneficiaries: '', costs: '', dependencies: '', unintended: '' },
        family: { direct: '', indirect: '', beneficiaries: '', costs: '', dependencies: '', unintended: '' },
        community: { direct: '', indirect: '', beneficiaries: '', costs: '', dependencies: '', unintended: '' },
        region: { direct: '', indirect: '', beneficiaries: '', costs: '', dependencies: '', unintended: '' },
        global: { direct: '', indirect: '', beneficiaries: '', costs: '', dependencies: '', unintended: '' },
        ecological: { direct: '', indirect: '', beneficiaries: '', costs: '', dependencies: '', unintended: '' },
      },
    }),
    blankMethod({
      id: 'm_beta',
      title: 'First light',
      summary: '',
      primaryDomainId: 'dom_b',
      primarySectionId: '',
      tags: ['ritual'],
      status: 'Idea',
      createdAt: daysAgo(6),
      updatedAt: daysAgo(2),
      illustrative: true,
    }),
  ];

  const documents = [
    blankDocument({
      id: 'doc_part',
      parentId: null,
      kind: 'part',
      title: 'Part one',
      content: '',
      status: 'Published',
      order: 0,
      createdAt: daysAgo(7),
      updatedAt: daysAgo(1),
      illustrative: true,
    }),
    blankDocument({
      id: 'doc_ch1',
      parentId: 'doc_part',
      kind: 'chapter',
      title: 'Sleep and attention',
      content: [
        'A chapter about sleep and attention.',
        '',
        'Measured rest changes what a day can hold.',
        '',
        'See [[method:m_alpha|the alpha method]] for the practice.',
        '',
        '- first point',
        '- second point',
      ].join('\n'),
      status: 'Published',
      order: 1,
      createdAt: daysAgo(7),
      updatedAt: daysAgo(1),
      illustrative: true,
    }),
    blankDocument({
      id: 'doc_sub',
      parentId: 'doc_ch1',
      kind: 'subsection',
      title: 'Recovery windows',
      content: 'A subsection paragraph on recovery.',
      status: 'Published',
      order: 0,
      createdAt: daysAgo(7),
      updatedAt: daysAgo(3),
      illustrative: true,
    }),
    blankDocument({
      id: 'doc_ch2',
      parentId: 'doc_part',
      kind: 'chapter',
      title: 'Unfinished chapter',
      content: 'Draft-only opening paragraph about unresolved material.',
      status: 'Draft',
      order: 2,
      createdAt: daysAgo(7),
      updatedAt: daysAgo(1),
      illustrative: true,
    }),
    blankDocument({
      id: 'doc_solo',
      parentId: null,
      kind: 'chapter',
      title: 'Standalone chapter',
      content: 'A standalone chapter that mentions [[method:m_beta|the first-light check-in]].',
      status: 'Draft',
      order: 5,
      createdAt: daysAgo(5),
      updatedAt: daysAgo(2),
      illustrative: true,
    }),
  ];

  const sources = [
    blankSource({
      id: 'src_book',
      kind: 'book',
      title: 'The Sabbath',
      creator: 'Abraham Heschel',
      year: '1951',
      publication: 'Farrar, Straus and Giroux',
      identifier: 'ISBN 9780374529512',
      url: '',
      pages: '1-120',
      summary: 'A study of time as a form of architecture.',
      keyClaims: 'The Sabbath is a palace in time.',
      evidence: 'Close reading of the liturgy.',
      limitations: 'Theological framing.',
      interpretation: 'Rest as protected attention.',
      implications: 'Design a weekly protected period.',
      verification: 'Stated in source',
      readingStatus: 'Read',
      tags: ['rest', 'time'],
      createdAt: daysAgo(8),
      updatedAt: daysAgo(3),
      illustrative: true,
    }),
    blankSource({
      id: 'src_unlinked',
      kind: 'paper',
      title: 'Sleep',
      creator: 'A. Nonymous',
      year: '1999',
      publication: 'Journal of Rest',
      identifier: '',
      url: '',
      pages: '',
      summary: 'An unlinked paper with a one-word title.',
      keyClaims: '',
      evidence: '',
      limitations: '',
      interpretation: '',
      implications: '',
      verification: 'Needs verification',
      readingStatus: 'Unread',
      tags: ['obscure'],
      createdAt: daysAgo(8),
      updatedAt: daysAgo(4),
      illustrative: true,
    }),
  ];

  const notes = [
    blankNote({
      id: 'note_one',
      sourceId: 'src_book',
      title: 'Attention as reverence',
      body: 'A note about attention and rest.',
      tags: ['attention'],
      createdAt: daysAgo(8),
      updatedAt: daysAgo(1),
      illustrative: true,
    }),
  ];

  const quotations = [
    blankQuotation({
      id: 'quote_one',
      sourceId: 'src_book',
      text: 'Time is the presence of God in the world of space.',
      page: '12',
      note: 'Verify wording against the edition.',
      createdAt: daysAgo(8),
      illustrative: true,
    }),
  ];

  const claims = [
    blankClaim({
      id: 'claim_supported',
      statement: 'Strength training improves physical function.',
      status: 'Supported',
      sourceIds: ['src_book'],
      notes: 'Attach the trial.',
      createdAt: daysAgo(8),
      updatedAt: daysAgo(3),
      illustrative: true,
    }),
    blankClaim({
      id: 'claim_needs',
      statement: 'Cold exposure improves mood.',
      status: 'Needs source',
      sourceIds: [],
      notes: '',
      createdAt: daysAgo(6),
      updatedAt: daysAgo(2),
      illustrative: true,
    }),
  ];

  const experiments = [
    blankExperiment({
      id: 'exp_one',
      title: 'Two weeks of cold showers',
      hypothesis: 'Brief cold exposure lifts morning alertness.',
      context: 'Winter, home bathroom.',
      participants: 'One',
      procedure: 'Two minutes, five mornings a week.',
      expected: 'Faster waking.',
      observations: 'Noticeable but short-lived.',
      worked: 'Scheduling it after water boiled.',
      failed: 'Skipped on the coldest days.',
      confounders: 'Changed bedtime in the same week.',
      lessons: 'Attach the practice to an existing cue.',
      revisions: 'Shorten to ninety seconds.',
      scale: 'Individual',
      status: 'Running',
      createdAt: daysAgo(400),
      updatedAt: daysAgo(400),
      illustrative: true,
    }),
  ];

  const relationships: Relationship[] = [
    {
      id: 'rel_src_alpha',
      fromId: 'src_book',
      toId: 'm_alpha',
      type: 'supports',
      note: 'Protected time supports the sleep argument.',
      createdAt: daysAgo(6),
    },
    {
      id: 'rel_alpha_doc',
      fromId: 'm_alpha',
      toId: 'doc_ch1',
      type: 'references',
      note: 'The chapter discusses this method.',
      createdAt: daysAgo(6),
    },
    {
      id: 'rel_alpha_note',
      fromId: 'm_alpha',
      toId: 'note_one',
      type: 'related_to',
      note: 'Same idea about attention.',
      createdAt: daysAgo(5),
    },
    {
      id: 'rel_dangling',
      fromId: 'm_beta',
      toId: 'ghost_record',
      type: 'related_to',
      note: 'Left behind by a deleted record.',
      createdAt: daysAgo(5),
    },
  ];

  return {
    version: 1,
    domains,
    sections,
    methods,
    documents,
    sources,
    notes,
    quotations,
    claims,
    experiments,
    inbox: [
      {
        id: 'inbox_one',
        text: 'Compare Sabbath and Friday as protected time.',
        createdAt: daysAgo(0),
      },
    ],
    relationships,
    trash: [],
    settings: {
      authorName: 'Test Author',
      projectTitle: 'Test Guidebook',
      readerTitle: 'Test Guidebook — Reader Edition',
      dashboard: { widgets: ['domains'], recentLimit: 5, pinnedSectionIds: [] },
      showIllustrativeBadges: true,
    },
    meta: { createdAt: daysAgo(10), lastSavedAt: daysAgo(0), revision: 1 },
  };
}
