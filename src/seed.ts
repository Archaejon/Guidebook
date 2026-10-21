import type { Domain, Project, Section, Relationship } from './types';
import {
  blankClaim,
  blankDocument,
  blankExperiment,
  blankMethod,
  blankNote,
  blankQuotation,
  blankSection,
  blankSource,
} from './lib/factory';

const t = (iso: string) => iso;

const domains: Domain[] = [
  {
    id: 'dom_physical',
    roman: 'I',
    title: 'Physical Health',
    subtitle: 'The body as the foundation of an active, capable and flourishing life.',
    accent: 'physical',
    intro:
      'Physical health is not an end in itself, but it conditions almost everything else: attention, mood, confidence, the capacity to care for others, and the ability to keep learning. This domain treats the body as a practice ground for discipline, pleasure and resilience.',
    purpose:
      'To establish the minimum conditions of physical capability and recovery that make a demanding, generous life possible — without turning health into an anxious project.',
    outcomes: [
      'A durable base of strength, mobility and aerobic capacity.',
      'Sleep and recovery treated as non-negotiable infrastructure.',
      'A way of eating that is enjoyable, socially liveable and evidence-aware.',
      'Practical competence in movement, balance and physical play.',
    ],
    principles: [
      'Train the capacities life actually demands, not just the ones measured in a gym.',
      'Recovery is part of the work, not a reward for it.',
      'Consistency of moderate effort usually outlasts heroic intensity.',
      'The body is a relationship to be maintained, not a machine to be optimised.',
    ],
    connections: [
      { domainId: 'dom_emotional', note: 'Sleep, movement and nutrition strongly shape emotional regulation and attention.' },
      { domainId: 'dom_social', note: 'Shared physical activity is one of the most reliable forms of social glue.' },
    ],
    questions: [
      'What is the minimum effective dose of training for a capable, long life?',
      'How should the guidebook handle contested nutrition evidence without becoming dogmatic?',
      'Where does the pursuit of health tip into vanity or avoidance of mortality?',
    ],
    createdAt: t('2026-09-01T09:00:00.000Z'),
    updatedAt: t('2026-10-10T16:20:00.000Z'),
    illustrative: true,
  },
  {
    id: 'dom_emotional',
    roman: 'II',
    title: 'Emotional & Intellectual Health',
    subtitle: 'Emotional stability, self-awareness, curiosity and creative expression.',
    accent: 'emotional',
    intro:
      'This domain concerns the inner life: the capacity to feel without being overwhelmed, to think clearly, to keep asking questions, and to make something. It treats emotion and intellect as intertwined rather than as separate departments.',
    purpose:
      'To develop a mind that can attend, reflect, endure difficulty and create — grounded in the recognition that emotional life is not an obstacle to reason but part of its material.',
    outcomes: [
      'Reliable ways to regulate emotion and return to the present.',
      'A practice of introspection that does not collapse into rumination.',
      'Sustained attention and a living relationship with learning.',
      'Creative work and play as regular parts of life.',
    ],
    principles: [
      'Naming an experience precisely changes what can be done with it.',
      'Attention is the raw material of both thought and love.',
      'Discomfort can be a teacher, but only when chosen and bounded.',
      'The goal is integration, not the elimination of difficult feeling.',
    ],
    connections: [
      { domainId: 'dom_physical', note: 'Physiological state sets the range of emotional responses available.' },
      { domainId: 'dom_spiritual', note: 'Contemplative traditions offer refined technologies of attention and self-examination.' },
    ],
    questions: [
      'Which contemplative practices survive translation into secular, evidence-aware language?',
      'What distinguishes productive discomfort from harm?',
      'How do we evaluate creative practices whose value is not instrumental?',
    ],
    createdAt: t('2026-09-01T09:05:00.000Z'),
    updatedAt: t('2026-10-11T10:15:00.000Z'),
    illustrative: true,
  },
  {
    id: 'dom_spiritual',
    roman: 'III',
    title: 'Spiritual Health',
    subtitle: 'Meaning, ethical character and an integrated relationship with existence.',
    accent: 'spiritual',
    intro:
      'Spiritual health here is not a commitment to a particular metaphysics. It names the human need for meaning, orientation, reverence, moral seriousness and a relationship to something larger than the self — and the practices that cultivate those capacities.',
    purpose:
      'To make room for seriousness about meaning without pretending that everything can be settled by evidence, and without suspending intellectual judgement.',
    outcomes: [
      'A workable set of practices for contemplation, gratitude and moral attention.',
      'A pluralistic framework that can hold multiple traditions without flattening them.',
      'The capacity to distinguish conditioning from conviction.',
      'A relationship to time, mortality and responsibility that is neither escapist nor despairing.',
    ],
    principles: [
      'Different kinds of knowledge require different standards of evaluation.',
      'Tradition is a conversation, not an authority to be accepted or discarded wholesale.',
      'Practice precedes and shapes understanding as often as understanding guides practice.',
      'The middle way is a discipline of discernment, not a compromise between extremes.',
    ],
    connections: [
      { domainId: 'dom_emotional', note: 'Contemplative practice and emotional regulation share methods but not always aims.' },
      { domainId: 'dom_world', note: 'Many traditions contain claims about humanity’s place in the living world.' },
    ],
    questions: [
      'How can the guidebook compare traditions without reducing them to a generic spirituality?',
      'What is the difference between elevated states that clarify and those that inflate?',
      'Which practices depend on community and tradition to be safe?',
    ],
    createdAt: t('2026-09-01T09:10:00.000Z'),
    updatedAt: t('2026-10-12T08:40:00.000Z'),
    illustrative: true,
  },
  {
    id: 'dom_social',
    roman: 'IV',
    title: 'Social Health',
    subtitle: 'Relationships, institutions, shared places and networks that let people flourish together.',
    accent: 'social',
    intro:
      'Flourishing is not a solitary achievement. This domain examines friendship, family, community structure and the built environment — the relationships and institutions that either hold people up or quietly wear them down.',
    purpose:
      'To build the relational and institutional conditions for trust, belonging and mutual aid, from close relationships to local networks.',
    outcomes: [
      'Stronger close relationships and clearer expectations within them.',
      'Communities with shared places, shared resources and ways of making decisions.',
      'Practical experience of mutual aid and intergenerational transmission.',
      'Settlements designed for contact rather than isolation.',
    ],
    principles: [
      'Relationships are maintained by repeated, ordinary contact.',
      'Shared activity often builds trust more reliably than shared opinion.',
      'Institutions should be small enough to be legible and strong enough to endure.',
      'Care for children and elders is a collective structure, not only a private burden.',
    ],
    connections: [
      { domainId: 'dom_emotional', note: 'Emotional capacity is developed and tested in relationships.' },
      { domainId: 'dom_world', note: 'Local social structures either support or undermine ecological stewardship.' },
    ],
    questions: [
      'Which modern relationship difficulties are structural rather than personal?',
      'How should contested family and demographic questions be treated without evasion or prescription?',
      'What makes a third place actually work rather than merely exist?',
    ],
    createdAt: t('2026-09-01T09:15:00.000Z'),
    updatedAt: t('2026-10-13T14:05:00.000Z'),
    illustrative: true,
  },
  {
    id: 'dom_world',
    roman: 'V',
    title: 'World Health',
    subtitle: 'The ecological, civilisational and planetary conditions that make flourishing possible.',
    accent: 'world',
    intro:
      'Human flourishing depends on systems far larger than any one community: climate, energy, ecology, infrastructure and the long-term trajectory of technology. World Health concerns those conditions and our responsibility within them.',
    purpose:
      'To take seriously the dependence of human life on the living world, and to think clearly about large-scale cooperation, technology and obligations to future generations.',
    outcomes: [
      'A practical understanding of ecological restoration and its limits.',
      'Ways to assess technologies by their social and ecological consequences.',
      'Institutional designs that support cooperation and prevent large-scale harm.',
      'Long-term thinking embedded in present decisions.',
    ],
    principles: [
      'Local action and planetary systems are connected, not alternatives.',
      'Uncertainty is a reason for prudence, not for paralysis or denial.',
      'Technology is a set of social choices, not an autonomous force.',
      'Obligations to future people are real even when those people cannot reciprocate.',
    ],
    connections: [
      { domainId: 'dom_social', note: 'Ecological work is carried out through social institutions and shared places.' },
      { domainId: 'dom_spiritual', note: 'Questions of responsibility and reverence shape how people treat the living world.' },
    ],
    questions: [
      'What does meaningful local ecological action look like at different scales?',
      'How should the guidebook handle civilisational risk without becoming apocalyptic?',
      'Which technological developments deserve the most careful social assessment?',
    ],
    createdAt: t('2026-09-01T09:20:00.000Z'),
    updatedAt: t('2026-10-14T11:35:00.000Z'),
    illustrative: true,
  },
];

interface SecSeed {
  id: string;
  domainId: string;
  title: string;
  description: string;
  outcomes?: string[];
  frameworks?: string[];
  questions?: string[];
  draft?: string;
}

const sectionSeeds: SecSeed[] = [
  // Domain I
  { id: 'sec_strength', domainId: 'dom_physical', title: 'Strength', description: 'Progressive resistance training for a body that can carry, climb, lift and recover. Strength is treated as a general capability supporting independence and injury resilience.', outcomes: ['Progressive strength across major movement patterns.', 'Confidence in handling everyday physical demands.'], frameworks: ['Progressive overload', 'Functional movement patterns'], questions: ['What is the minimum effective dose for long-term independence?'], draft: 'Strength is the ability to produce force against an external resistance — and, more broadly, the ability to act on the world.' },
  { id: 'sec_mobility', domainId: 'dom_physical', title: 'Mobility & flexibility', description: 'Joint range, tissue resilience and the ability to move through positions without compensation. Mobility is pursued as usable range, not as display flexibility.', outcomes: ['Sufficient range for daily and athletic positions.', 'A routine for maintaining range over decades.'], frameworks: ['Joint-by-joint approach', 'Motor control under range'] },
  { id: 'sec_speed', domainId: 'dom_physical', title: 'Short-distance speed & power', description: 'The ability to produce force quickly: sprinting, jumping, throwing and changing direction. Power declines early and is worth maintaining deliberately.', outcomes: ['Retained explosive capacity.', 'Safer, more confident rapid movement.'], frameworks: ['Force–velocity profile', 'Sprint mechanics'] },
  { id: 'sec_endurance', domainId: 'dom_physical', title: 'Endurance & long-distance performance', description: 'Aerobic capacity for sustained effort, from walking and cycling to longer athletic events. Endurance underpins cardiovascular health, recovery and everyday energy.', outcomes: ['A stable aerobic base.', 'Pacing skill and tolerance for sustained effort.'], frameworks: ['Aerobic base and threshold work', 'Polarised training'] },
  { id: 'sec_balance', domainId: 'dom_physical', title: 'Balance & coordination', description: 'Postural control, proprioception and the coordination of complex movement. These capacities are protective against falls and enable play, sport and craft.', outcomes: ['Confident balance under varied conditions.', 'Improved coordination for new physical skills.'], frameworks: ['Sensory integration in balance', 'Motor learning'] },
  { id: 'sec_sleep', domainId: 'dom_physical', title: 'Sleep & recovery', description: 'Sleep, rest and recovery as the foundation on which training, mood and cognition depend. Includes rhythms, environment, and the social organisation of rest.', outcomes: ['A defensible sleep routine.', 'Recovery practices matched to training and stress.'], frameworks: ['Circadian rhythm', 'Two-process model of sleep regulation'], questions: ['Which sleep advice is robust, and which is commercially amplified?'], draft: 'Sleep is the most ordinary and least negotiable form of recovery. It is also where personal routines collide with work, caregiving and light.' },
  { id: 'sec_nutrition', domainId: 'dom_physical', title: 'Nutrition & diet', description: 'Eating patterns that support health, pleasure and social life, handled with awareness of how contested nutrition evidence is.', outcomes: ['A sustainable, enjoyable eating pattern.', 'Enough protein, fibre and micronutrient awareness to eat well without tracking everything.'], frameworks: ['Dietary patterns over single nutrients', 'Energy balance and food quality'], questions: ['How should contested nutrition claims be graded in the guidebook?'] },
  { id: 'sec_appearance', domainId: 'dom_physical', title: 'Appearance & personal care', description: 'Skin, hair, teeth and grooming as practices of self-respect and social care — without collapsing into appearance anxiety.', outcomes: ['A simple, sustainable personal care routine.', 'Dental and skin care based on clear principles.'], frameworks: ['Hygiene and barrier care', 'Signalling and self-presentation'] },

  // Domain II
  { id: 'sec_grounding', domainId: 'dom_emotional', title: 'Grounding & emotional regulation', description: 'Methods for returning to a workable state when emotion overwhelms: breath, orientation, naming, movement and structured reappraisal.', outcomes: ['A short list of reliable regulation practices.', 'Better recognition of early emotional signals.'], frameworks: ['Polyvagal-informed regulation (contested)', 'Cognitive reappraisal'], questions: ['Which grounding techniques have evidence beyond clinical samples?'] },
  { id: 'sec_gratitude', domainId: 'dom_emotional', title: 'Gratitude', description: 'The deliberate cultivation of appreciation, including gratitude for difficulty survived. Distinguishes disposition from performative positivity.', outcomes: ['A practice of noticing what is good.', 'A more accurate relationship to what is lacking.'], frameworks: ['Gratitude as attention', 'Jewish modes of blessing and thanks'], questions: ['When does gratitude become a way of avoiding legitimate grievance?'] },
  { id: 'sec_introspection', domainId: 'dom_emotional', title: 'Introspection & self-knowledge', description: 'Structured self-examination: motives, patterns, values and blind spots. Aims at truthful self-description rather than self-absorption.', outcomes: ['A regular reflective practice.', 'Better language for one’s own patterns.'], frameworks: ['Mussar self-examination', 'Stoic evening review', 'Narrative identity'] },
  { id: 'sec_mindfulness', domainId: 'dom_emotional', title: 'Mindfulness & attention', description: 'Training attention and the capacity to observe experience without immediate reactivity. Includes both formal meditation and everyday attention.', outcomes: ['Sustained attention on a chosen object.', 'The ability to notice distraction and return.'], frameworks: ['Mindfulness-based stress reduction', 'Attention regulation'] },
  { id: 'sec_challenge', domainId: 'dom_emotional', title: 'Productive challenge & discomfort tolerance', description: 'Chosen difficulty as a way of building capacity: cold, exertion, public work, silence or emotional exposure. Requires clear boundaries between challenge and harm.', outcomes: ['A calibrated relationship to discomfort.', 'Greater willingness to attempt difficult things.'], frameworks: ['Stress inoculation', 'Voluntary discomfort traditions'], questions: ['What separates useful exposure from unnecessary self-punishment?'] },
  { id: 'sec_curiosity', domainId: 'dom_emotional', title: 'Curiosity & lifelong learning', description: 'Maintaining an active relationship with learning: reading, asking, practising and being corrected. Includes structures for retaining and using knowledge.', outcomes: ['A sustainable learning routine.', 'More questions held deliberately.'], frameworks: ['Deliberate practice', 'Inquiry-based learning'] },
  { id: 'sec_creativity', domainId: 'dom_emotional', title: 'Creativity', description: 'Music, dance, singing, writing and visual art as practices of expression and perception. Valued for their own sake as well as for their effects.', outcomes: ['A regular creative practice.', 'Comfort with making imperfect work.'], frameworks: ['Constraint and improvisation', 'Craft through repetition'] },
  { id: 'sec_desire', domainId: 'dom_emotional', title: 'Understanding & regulating desire', description: 'Working with lust, appetite and compulsive behaviour: naming desire, understanding its triggers, and choosing structures that support agency.', outcomes: ['A clearer account of one’s desires and patterns.', 'Practical boundaries around compulsive use of sex, pornography, food or screens.'], frameworks: ['Habit loops', 'Ascetic and temperance traditions'], questions: ['How should the guidebook discuss porn use without moral panic or evasion?'] },

  // Domain III
  { id: 'sec_prayer', domainId: 'dom_spiritual', title: 'Prayer & contemplative practice', description: 'Forms of address, silence and attention practised across traditions. Includes structured prayer, meditation, chanting and contemplative reading.', outcomes: ['A regular contemplative practice.', 'A better understanding of what the practice is for.'], frameworks: ['Liturgical prayer', 'Contemplative reading (lectio divina)', 'Jewish prayer and hitbodedut'] },
  { id: 'sec_middle_way', domainId: 'dom_spiritual', title: 'Between hedonism & asceticism', description: 'A disciplined middle path: enjoying the world without being ruled by it, and practising restraint without contempt for the body.', outcomes: ['A considered relationship to pleasure and restraint.', 'Practices of fasting and feasting that do not become punishment.'], frameworks: ['Aristotelian mean', 'Buddhist middle way', 'Jewish balance of simcha and restraint'] },
  { id: 'sec_development', domainId: 'dom_spiritual', title: 'Human development & levels of consciousness', description: 'Stage theories of psychological and spiritual development, treated as maps rather than hierarchies of human worth.', outcomes: ['A critical grasp of developmental frameworks.', 'The ability to recognise one’s own stage-specific blind spots.'], frameworks: ['Kegan’s constructive-developmental theory', 'Fowler’s stages of faith'], questions: ['Which stage theories survive empirical scrutiny?'] },
  { id: 'sec_continuity', domainId: 'dom_spiritual', title: 'Historical continuity & future vision', description: 'Living within a tradition while imagining its future. Memory, inheritance and the responsibility to hand something on.', outcomes: ['A relationship to one’s inheritance.', 'A practice of thinking beyond one’s own lifetime.'], frameworks: ['Tradition as argument', 'Intergenerational responsibility'] },
  { id: 'sec_conditioning', domainId: 'dom_spiritual', title: 'Recognising harmful conditioning', description: 'Identifying inherited habits of thought that distort perception: shame, status anxiety, tribalism and spiritual bypassing. Replacing them with more adequate habits.', outcomes: ['Language for naming inherited patterns.', 'Practices for examining and revising them.'], frameworks: ['Critical theory', 'Cognitive distortion models', 'Mussar character work'] },
  { id: 'sec_compassion', domainId: 'dom_spiritual', title: 'Compassion, joy & peace', description: 'Cultivating positive relational states that are not merely moods: compassion as action, joy as shared, peace as steadiness.', outcomes: ['Practices for compassion and sympathetic joy.', 'A distinction between peace and avoidance.'], frameworks: ['Loving-kindness practice', 'Buddhist brahmaviharas'] },
  { id: 'sec_integration', domainId: 'dom_spiritual', title: 'Integrating impulses', description: 'Working with instinctive, emotional and higher ethical impulses so that they inform rather than override one another.', outcomes: ['A more integrated account of motivation.', 'Practices for holding impulse and value together.'], frameworks: ['Psychodynamic integration', 'Ethical formation'], questions: ['Can “higher” impulses be distinguished without contempt for the body?'] },
  { id: 'sec_pluralism', domainId: 'dom_spiritual', title: 'A pluralistic spiritual framework', description: 'Building a framework that can learn from multiple traditions while retaining intellectual honesty about their disagreements.', outcomes: ['A defensible personal framework.', 'The ability to compare traditions without flattening them.'], frameworks: ['Perennialism (and its critics)', 'Comparative theology'] },
  { id: 'sec_elevated', domainId: 'dom_spiritual', title: 'Prophetic & elevated states', description: 'Intense states of insight, awe or moral clarity — treated with respect for the experience and caution about its interpretation.', outcomes: ['A framework for integrating intense experience.', 'Awareness of the risks of inflation and manipulation.'], frameworks: ['Awe research', 'Contemplative and prophetic literature'], questions: ['How can intense experiences be evaluated without pathologising or inflating them?'] },

  // Domain IV
  { id: 'sec_friendship', domainId: 'dom_social', title: 'Friendship, belonging & community', description: 'The ordinary work of making and keeping friends, and the conditions under which belonging becomes possible.', outcomes: ['Deliberate maintenance of friendships.', 'A clearer understanding of belonging versus fitting in.'], frameworks: ['Social capital', 'Relationship maintenance'] },
  { id: 'sec_dating', domainId: 'dom_social', title: 'Dating, partnership & marriage', description: 'Forming and sustaining intimate partnerships: attraction, commitment, communication, conflict and repair.', outcomes: ['More intentional partnership formation.', 'Repair practices for conflict.'], frameworks: ['Attachment theory', 'Gottman repair research (verify)'], questions: ['Which relationship research generalises beyond WEIRD samples?'] },
  { id: 'sec_family', domainId: 'dom_social', title: 'Family formation, parenting & continuity', description: 'Having and raising children, caring for elders, and the intergenerational transmission of culture and practice.', outcomes: ['A considered approach to family formation.', 'Parenting practices grounded in relationship rather than performance.'], frameworks: ['Attachment parenting (contested)', 'Intergenerational transmission'] },
  { id: 'sec_relationship_difficulty', domainId: 'dom_social', title: 'Contemporary relationship difficulties', description: 'Structural pressures on relationships: mobility, work, digital mediation, housing, status competition and the erosion of shared institutions.', outcomes: ['A structural account of personal difficulty.', 'Possible interventions at household and community level.'], frameworks: ['Sociology of intimacy', 'Time-use and care economics'], questions: ['How much of the “loneliness epidemic” is measurable, and how much is narrative?'] },
  { id: 'sec_relationship_cultures', domainId: 'dom_social', title: 'Monogamy, casual relationships & alternatives', description: 'Evaluating monogamy, casual intimacy and alternative relationship cultures without assuming one arrangement fits everyone.', outcomes: ['A careful comparison of relationship structures.', 'Language for discussing expectations and consent.'], frameworks: ['Relationship agreements', 'Ethics of care'], questions: ['What does the evidence actually show about relationship structure and wellbeing?'] },
  { id: 'sec_children', domainId: 'dom_social', title: 'Children & intergenerational responsibility', description: 'The importance of children and the obligation of one generation to another, treated alongside contested demographic and ethical questions.', outcomes: ['A considered position on intergenerational obligation.', 'Practical support for families and children.'], questions: ['How should demographic decline be discussed without coercive pronatalism?'] },
  { id: 'sec_community_structure', domainId: 'dom_social', title: 'Resilient community structures', description: 'How groups organise to survive shocks and adapt: governance, membership, conflict, redundancy and succession.', outcomes: ['Design principles for durable groups.', 'Practical governance and conflict tools.'], frameworks: ['Ostrom’s commons principles', 'Sociocracy', 'Mutual aid'] },
  { id: 'sec_shared_resources', domainId: 'dom_social', title: 'Tool libraries, mutual aid & shared resources', description: 'Pooling tools, skills, time and money so that households need less and can do more together.', outcomes: ['A working model of shared resources.', 'Trust-building through practical exchange.'], frameworks: ['Library of things', 'Time banking', 'Mutual aid networks'] },
  { id: 'sec_gardens', domainId: 'dom_social', title: 'Community gardens & local food', description: 'Community gardens, forest gardens and local food production as sites of physical work, social contact and ecological literacy.', outcomes: ['A functioning shared growing space.', 'More local food knowledge and skill.'], frameworks: ['Permaculture', 'Agroecology', 'Allotment traditions'] },
  { id: 'sec_third_places', domainId: 'dom_social', title: 'Third spaces', description: 'Places that are neither home nor work, where people meet across differences and without a transactional purpose.', outcomes: ['A clear design brief for a third space.', 'Practices that make a space welcoming.'], frameworks: ['Third place theory', 'Social infrastructure'] },
  { id: 'sec_community_learning', domainId: 'dom_social', title: 'Community-based learning & cultural transmission', description: 'How knowledge and practice are passed on locally: apprenticeships, reading groups, classes, festivals and mentorship.', outcomes: ['Structures for teaching and learning locally.', 'Attention to who is included in transmission.'], frameworks: ['Situated learning', 'Communities of practice'] },
  { id: 'sec_local_networks', domainId: 'dom_social', title: 'Local networks & physical meeting places', description: 'The connective tissue: neighbourhood networks, associations, halls, cafés and the physical places where coordination happens.', outcomes: ['A map of local networks.', 'Better use of existing physical places.'], frameworks: ['Network theory', 'Social infrastructure'] },
  { id: 'sec_global_collaboration', domainId: 'dom_social', title: 'Global intellectual collaboration', description: 'Working across communities and borders on shared problems: translation, open knowledge, conferences and digital collaboration.', outcomes: ['Practices for productive collaboration at distance.', 'Awareness of power and access asymmetries.'], frameworks: ['Open science', 'Epistemic justice'] },
  { id: 'sec_urban_design', domainId: 'dom_social', title: 'Urban design & settlement patterns', description: 'How the built environment shapes contact, independence and belonging: density, walkability, public space, housing and mixed use.', outcomes: ['Criteria for evaluating a place’s social affordances.', 'Practical advocacy for better settlement design.'], frameworks: ['Walkability and 15-minute cities', 'Defensible space'], questions: ['Which urban design claims are supported and which are designer folklore?'] },
  { id: 'sec_conflict', domainId: 'dom_social', title: 'Conflict, repair & collective decisions', description: 'How groups disagree well: decision rules, facilitation, accountability and repair after harm.', outcomes: ['A clear decision-making process.', 'Practices for repair after conflict.'], frameworks: ['Consent-based decision making', 'Restorative justice'] },

  // Domain V
  { id: 'sec_restoration', domainId: 'dom_world', title: 'Ecological restoration & biodiversity', description: 'Repairing damaged ecosystems and protecting biodiversity, from garden-scale habitat to landscape-scale restoration.', outcomes: ['A practical restoration project.', 'An understanding of ecological baselines and trade-offs.'], frameworks: ['Ecological succession', 'Rewilding (contested)'] },
  { id: 'sec_living_world', domainId: 'dom_world', title: 'Relationships with animals, plants & living systems', description: 'The moral and practical relationships between humans and other life: care, use, kinship and responsibility.', outcomes: ['A considered ethic of relationship with other species.', 'Everyday practices that support local biodiversity.'], frameworks: ['Animal ethics', 'Ecological kinship', 'Stewardship traditions'], questions: ['How should the guidebook weigh animal welfare against ecological and human needs?'] },
  { id: 'sec_food_systems', domainId: 'dom_world', title: 'Sustainable food systems & land use', description: 'How food is produced, distributed and consumed at scale, and how land use shapes ecology and community.', outcomes: ['A systems view of food.', 'Practical support for better local and regional food systems.'], frameworks: ['Agroecology', 'Food sovereignty', 'Regenerative agriculture (verify claims)'] },
  { id: 'sec_climate', domainId: 'dom_world', title: 'Climate, energy, resources & infrastructure', description: 'The physical systems that underpin modern life and the constraints they face: energy, water, materials, climate and infrastructure.', outcomes: ['Working literacy in energy and climate.', 'Practical judgement about infrastructure decisions.'], frameworks: ['Energy return on investment', 'Life-cycle assessment'] },
  { id: 'sec_settlements', domainId: 'dom_world', title: 'Resilient settlements & regenerative design', description: 'Designing places that can absorb shocks and regenerate their own ecological base: water, food, energy, materials and social capacity.', outcomes: ['Principles for regenerative settlement design.', 'Examples of practical local experiments.'], frameworks: ['Regenerative design', 'Permaculture zones'] },
  { id: 'sec_technology', domainId: 'dom_world', title: 'Technology & its social consequences', description: 'Assessing technologies by how they reshape attention, work, relationships and power — not only by what they make possible.', outcomes: ['A framework for technology assessment.', 'Personal and collective practices of technological restraint.'], frameworks: ['Appropriate technology', 'Structural change theory'], questions: ['Which effects of AI and social media are established, and which are speculative?'] },
  { id: 'sec_cooperation', domainId: 'dom_world', title: 'Global cooperation & preventing large-scale harm', description: 'Institutions and norms that allow humanity to coordinate and avoid catastrophic outcomes.', outcomes: ['A realistic account of cooperation problems.', 'Support for institutions that reduce large-scale risk.'], frameworks: ['Collective action', 'Existential risk studies'] },
  { id: 'sec_longterm', domainId: 'dom_world', title: 'Long-term thinking & future generations', description: 'Extending moral concern and practical planning across decades and centuries.', outcomes: ['Habits of long-term reasoning.', 'Institutional mechanisms for future representation.'], frameworks: ['Longtermism (and critiques)', 'Intergenerational justice'] },
  { id: 'sec_planetary_relationship', domainId: 'dom_world', title: 'Humanity & the wider living world', description: 'The philosophical and practical question of humanity’s place within nature — steward, participant, disruptor or something else.', outcomes: ['A reflective position on human–nature relationship.', 'Practices that express it.'], frameworks: ['Environmental philosophy', 'Indigenous ecological knowledge (with attribution)'], questions: ['Can stewardship language avoid human exceptionalism?'] },
];

const sections: Section[] = sectionSeeds.map((s) =>
  blankSection({
    id: s.id,
    domainId: s.domainId,
    title: s.title,
    description: s.description,
    outcomes: s.outcomes ?? [],
    frameworks: s.frameworks ?? [],
    draft: s.draft ?? '',
    questions: s.questions ?? [],
    createdAt: t('2026-09-02T09:00:00.000Z'),
    updatedAt: t('2026-10-08T12:00:00.000Z'),
    illustrative: true,
  }),
);

const strength = blankMethod({
  id: 'm_strength',
  title: 'Strength Training',
  summary:
    'Progressive resistance training two to three times a week to build and retain the strength needed for an independent, capable life.',
  primaryDomainId: 'dom_physical',
  primarySectionId: 'sec_strength',
  secondaryDomainIds: ['dom_emotional'],
  relatedSectionIds: ['sec_sleep', 'sec_nutrition', 'sec_balance'],
  tags: ['movement', 'progressive overload', 'capability'],
  status: 'In development',
  createdAt: t('2026-09-12T10:00:00.000Z'),
  updatedAt: t('2026-10-16T17:30:00.000Z'),
  illustrative: true,
  purpose: {
    problem:
      'Most people lose strength gradually and only notice when an ordinary task — carrying shopping, rising from a low chair, climbing stairs — becomes difficult.',
    importance:
      'Strength supports independence, bone density, metabolic health and the confidence to keep doing things. It is among the most trainable physical qualities at any age.',
    outcomes:
      'A gradual increase in load or repetitions across a small number of compound movements; better ease in daily physical tasks; a routine that survives busy weeks.',
    suitableFor:
      'Almost anyone able to move against resistance, including older adults and beginners, provided the starting load is genuinely easy.',
    unsuitableWhen:
      'Recent surgery, uncontrolled cardiovascular conditions, acute injury, or any situation where a clinician has advised against loaded exercise. This sample is not medical advice.',
  },
  instructions: {
    preparation:
      'Choose two or three compound movements (for example a squat, a press and a row), a load you can lift with good form, and a place to record what you did. Warm up with easy movement and a lighter set.',
    steps: [
      'Warm up for five minutes with easy movement and one or two light rehearsal sets.',
      'Perform three working sets of a lower-body movement, resting long enough to feel recovered.',
      'Perform three working sets of an upper-body push and pull.',
      'Leave one or two repetitions in reserve on most sets; stop if form deteriorates.',
      'Record loads and repetitions. Increase one variable only when the previous session was comfortable.',
      'Finish with a short walk or mobility reset, and eat something containing protein afterwards.',
    ],
    frequency: 'Two sessions per week is a reasonable minimum; three is plenty for most people. Consistency over months matters more than session length.',
    beginner:
      'Start with bodyweight or very light loads, two sets per movement, and focus on range and control. Add load only when the movement feels boringly reliable.',
    intermediate:
      'Use a small set of compound lifts with planned progression, adding load or repetitions across sessions and deloading when fatigue accumulates.',
    advanced:
      'Periodise intensity and volume across weeks, address weak links, and use sport-specific assistance work. Advanced programming is beyond this sample.',
    adaptations:
      'A single dumbbell, resistance bands or a loaded backpack can replace a gym. Chair-based and seated variations work for many people with limited mobility.',
    mistakes:
      'Adding weight before technique is stable; training to failure every session; ignoring pain that is sharp or joint-specific; changing programmes every few weeks.',
    safety:
      'Use safeties or a spotter for heavy lifts. Stop for chest pain, dizziness or sharp pain. If you are uncertain about your health, consult a clinician before starting.',
  },
  rationale: {
    mechanisms:
      'Progressive overload imposes a demand that muscle, bone and connective tissue adapt to. Strength also improves movement efficiency and confidence, which may increase everyday activity.',
    evidence:
      'Illustrative sample. The general claim that resistance training increases strength is well established, but this record does not yet cite specific reviews. Add verifiable sources before treating any precise effect as supported.',
    counterEvidence:
      'Strength gains do not automatically translate into all health outcomes, and injury risk rises with poor progression. Time, cost and access are real barriers.',
    assumptions:
      'That the reader can safely load the movements, has some control over their schedule, and is not in an acute medical situation.',
    uncertainties:
      'The minimum effective dose for long-term independence, the relative value of different loading schemes, and how strength interacts with sleep and nutrition over decades.',
  },
  knowledge: {
    science: 'To investigate: systematic reviews on resistance training and physical function in older adults; dose–response studies on volume and frequency.',
    books: 'General strength-training texts and coaching manuals — add specific editions and pages.',
    philosophy: 'Ask what kind of capability a good life requires, and whether strength is a means, an obligation, or part of human flourishing.',
    history: 'Physical culture movements, military training, and the modern gym as a social institution.',
    observations: 'Personal experience and coaching observations belong here, clearly marked as anecdote rather than evidence.',
  },
  evaluation: {
    success: 'The author can name a few everyday tasks that became easier, and training has continued for at least eight weeks without injury.',
    measures: 'Loads and repetitions in a training log; a timed sit-to-stand test; grip strength; self-reported ease of daily tasks.',
    timeframe: 'Eight to twelve weeks for a first review; years for the question of long-term capability.',
    costs: 'Time, equipment or membership, recovery capacity, and the risk of injury from poor progression.',
    confidence: 'Moderate for the general strength effect; low for the specific prescription in this sample. Evidence has not yet been reviewed.',
  },
  application: {
    self: 'Two short sessions per week, built around a few compound movements and a written log.',
    family: 'Train together or share equipment; adapt loads for different ages and abilities; model consistency rather than competition.',
    community: 'A shared gym corner, a coached beginners’ group, or a weekly strength session in a community hall.',
    society: 'Accessible public exercise spaces, physical education that teaches lifting, and health systems that treat strength as preventative.',
    ecological: 'Durable, repairable equipment and shared rather than individually owned kit reduce material use.',
  },
  notes: {
    questions: [
      'What is the minimum effective dose for someone with very little time?',
      'How should the guidebook present strength training without implying medical advice?',
      'Which progression schemes are best supported for beginners?',
    ],
    disagreements: 'Whether training to failure is necessary for hypertrophy; how much variety is useful versus distracting.',
    reflections: 'The hardest part is not the training but protecting two ordinary hours a week from everything else.',
    improvements: 'Add a one-page beginner programme and a link to a vetted technique resource.',
    futureExperiments: 'Run an eight-week beginner block and record adherence, ease of daily tasks and any injuries.',
  },
  scales: {
    self: {
      direct: 'Increased strength and confidence in daily movement.',
      indirect: 'Better sleep, mood and willingness to be physically active.',
      beneficiaries: 'The individual, and anyone who depends on them.',
      costs: 'Time, recovery, equipment and possible injury.',
      dependencies: 'Sleep, nutrition, safe technique and a place to train.',
      unintended: 'Risk of overtraining or disordered body image if framed as appearance work.',
    },
    family: {
      direct: 'Shared routines and a household that can move furniture, carry children and care for elders.',
      indirect: 'Children learn that physical practice is ordinary.',
      beneficiaries: 'Partners, children, older relatives.',
      costs: 'Time away from family, or childcare coordination.',
      dependencies: 'Space, equipment, flexible schedules.',
      unintended: 'Competition or body comparison within the household.',
    },
    community: {
      direct: 'Shared training spaces and beginner groups.',
      indirect: 'Social contact across ages and backgrounds.',
      beneficiaries: 'Isolated residents, older adults, young people.',
      costs: 'Space, insurance, coaching time.',
      dependencies: 'A venue and a reliable organiser.',
      unintended: 'Groups can become exclusive or status-driven.',
    },
    region: {
      direct: 'Public fitness infrastructure and preventive health programmes.',
      indirect: 'Reduced fall-related costs and improved population capability.',
      beneficiaries: 'Health systems and residents.',
      costs: 'Public investment and maintenance.',
      dependencies: 'Policy, planning, transport access.',
      unintended: 'Facilities may concentrate in wealthier areas.',
    },
    global: {
      direct: 'Little direct effect from one person’s training.',
      indirect: 'Global norms around physical activity and preventive health.',
      beneficiaries: 'Populations with access to programmes.',
      costs: 'Competing global health priorities.',
      dependencies: 'International health guidance and evidence sharing.',
      unintended: 'Western gym culture can displace local movement traditions.',
    },
    ecological: {
      direct: 'Minimal, though equipment has a material footprint.',
      indirect: 'Active travel and outdoor training can reduce car use; shared equipment reduces consumption.',
      beneficiaries: 'Local air quality and material systems.',
      costs: 'Manufacturing and disposal of equipment.',
      dependencies: 'Durable design and repair networks.',
      unintended: 'Outdoor training can damage sensitive habitats if poorly sited.',
    },
  },
  hiddenSections: [],
});

const journal = blankMethod({
  id: 'm_journal',
  title: 'Reflective Journalling',
  summary:
    'A short, structured written practice for examining the day, naming patterns and deciding what to do differently.',
  primaryDomainId: 'dom_emotional',
  primarySectionId: 'sec_introspection',
  secondaryDomainIds: ['dom_spiritual'],
  relatedSectionIds: ['sec_grounding', 'sec_prayer', 'sec_gratitude'],
  tags: ['reflection', 'self-knowledge', 'writing'],
  status: 'In development',
  createdAt: t('2026-09-18T08:30:00.000Z'),
  updatedAt: t('2026-10-17T09:10:00.000Z'),
  illustrative: true,
  purpose: {
    problem:
      'Experience passes quickly. Without a structure for reflection, the same difficulties recur without being noticed, and lessons remain vague.',
    importance:
      'Reflection turns experience into something that can inform the next attempt. It also creates a record that can later be compared with memory, which is unreliable.',
    outcomes:
      'A small number of honest observations about the day; a named pattern; one concrete intention for tomorrow.',
    suitableFor: 'People who can set aside ten to fifteen minutes and are willing to write plainly, including when little seems to have happened.',
    unsuitableWhen:
      'Acute crisis, severe depression or trauma that is being activated by unguided self-examination. Reflection is not a substitute for therapy.',
  },
  instructions: {
    preparation: 'A notebook or plain document, a regular time, and a short set of prompts. Keep the format boring enough to repeat.',
    steps: [
      'Write the date and one sentence describing the day’s overall texture.',
      'Answer three prompts: What happened? What did I notice about myself? What will I try next?',
      'Name one thing that went well and one thing that did not, without immediately explaining either away.',
      'Write one concrete intention for the following day.',
      'Once a week, reread the entries and look for a recurring pattern rather than a single dramatic event.',
    ],
    frequency: 'Ten minutes at the end of the day, five days a week; a twenty-minute weekly review. Missing days is expected.',
    beginner: 'One page, three sentences, no analysis. The aim is to establish the habit of truthful description.',
    intermediate: 'Use a stable set of prompts and add a weekly review that compares entries and identifies one pattern.',
    advanced: 'Work with longer-form examination, including motives, recurring fears and the gap between stated values and actual behaviour; consider a trusted reader or therapist for difficult material.',
    adaptations:
      'Voice notes transcribed later; a shared journal with a partner; a structured template for project retrospectives; a single index card when time is short.',
    mistakes:
      'Turning the journal into a performance; only recording failures; writing endlessly without deciding anything; treating insight as a substitute for action.',
    safety:
      'If reflection consistently leaves you worse, stop and seek support. Do not use the practice to relive trauma without guidance.',
  },
  rationale: {
    mechanisms:
      'Writing slows cognition, externalises memory and creates distance from immediate emotion. Structured prompts may support reappraisal and planning.',
    evidence:
      'Illustrative sample. Expressive writing has been studied extensively, but findings are mixed and highly dependent on context and format. Specific claims need sources and critical review.',
    counterEvidence:
      'Rumination can be worsened by repeated negative self-focus. Journaling does not replace treatment, and some studies find little benefit for wellbeing.',
    assumptions: 'That the writer can describe experience with reasonable accuracy and has enough stability to reflect without destabilisation.',
    uncertainties: 'Which prompts help, for whom, and whether benefits come from writing, routine, or simply taking time to stop.',
  },
  knowledge: {
    science: 'To investigate: expressive-writing research, rumination and self-distancing literature, and studies of implementation intentions.',
    books: 'Stoic and Mussar texts on daily self-examination; modern writing guides that treat reflection as craft.',
    philosophy: 'The examined life; the difference between introspection and rumination; the ethics of self-description.',
    history: 'Diaries, spiritual autobiographies, and the long tradition of keeping a commonplace book.',
    observations: 'Try it for a month and record adherence, quality of decisions and emotional effects.',
  },
  evaluation: {
    success: 'A month of entries exists, at least one pattern has been named, and one intention has actually changed behaviour.',
    measures: 'Number of entries; recurring themes; whether intentions were attempted; a simple weekly mood rating if useful.',
    timeframe: 'Four weeks for a first review; three months to judge whether the practice is sustainable.',
    costs: 'Fifteen minutes a day, emotional labour, and the risk of rumination.',
    confidence: 'Low to moderate. The mechanism is plausible; the specific protocol is untested here.',
  },
  application: {
    self: 'A short end-of-day entry and a weekly rereading.',
    family: 'A weekly conversation using the same prompts, or a shared notebook for household decisions.',
    community: 'A facilitated reflective circle, or a project journal that records decisions and what was learned.',
    society: 'Public institutions that build reflection into professional practice, rather than only after failure.',
    ecological: 'Reflection on consumption and land use can make habits visible, but only if it leads to changed practice.',
  },
  notes: {
    questions: [
      'Does structured journaling differ from free writing in measurable outcomes?',
      'How should the guidebook handle spiritual self-examination without assuming a theology?',
    ],
    disagreements: 'Whether daily writing is necessary, or whether a weekly review is enough.',
    reflections: 'The weekly rereading is doing more work than the daily entries; the pattern is only visible in aggregate.',
    improvements: 'Add a one-page prompt card and a distinction between reflection and rumination.',
    futureExperiments: 'Compare daily and weekly formats over six weeks, recording adherence and perceived value.',
  },
  scales: {
    self: {
      direct: 'Better self-description and one changed intention.',
      indirect: 'Improved emotional granularity and memory for decisions.',
      beneficiaries: 'The writer.',
      costs: 'Time and emotional labour.',
      dependencies: 'Literacy, privacy and a stable routine.',
      unintended: 'Rumination, perfectionism about the practice, or false confidence in self-narration.',
    },
    family: {
      direct: 'Shared reflection can surface unspoken expectations.',
      indirect: 'Modeling reflection for children.',
      beneficiaries: 'Partners and children.',
      costs: 'Vulnerability and possible conflict.',
      dependencies: 'Safety and willingness of all participants.',
      unintended: 'One person’s reflection can become surveillance of another.',
    },
    community: {
      direct: 'Group retrospectives and shared learning records.',
      indirect: 'Institutional memory.',
      beneficiaries: 'Groups making repeated decisions.',
      costs: 'Facilitation time.',
      dependencies: 'Trust and honest reporting.',
      unintended: 'Reflection can become a ritual that avoids action.',
    },
    region: {
      direct: 'Limited.',
      indirect: 'Public learning after failures if institutions support it.',
      beneficiaries: 'Public services.',
      costs: 'Bureaucratic overhead.',
      dependencies: 'Cultures of accountability.',
      unintended: 'Documentation can become defensiveness.',
    },
    global: {
      direct: 'Negligible.',
      indirect: 'Cross-community learning if practices are shared openly.',
      beneficiaries: 'Distributed practitioners.',
      costs: 'Attention and translation.',
      dependencies: 'Open publication and context.',
      unintended: 'Decontextualised methods spreading without their safeguards.',
    },
    ecological: {
      direct: 'None directly.',
      indirect: 'Reflection can change consumption if it leads to decisions.',
      beneficiaries: 'Indirect.',
      costs: 'Paper or device use.',
      dependencies: 'Follow-through.',
      unintended: 'Moralising inwardness without material change.',
    },
  },
  hiddenSections: [],
});

const garden = blankMethod({
  id: 'm_garden',
  title: 'Community Gardening',
  summary:
    'A shared growing space used for food, physical work, social contact and ecological learning. This sample links Social, World, Physical and Emotional health.',
  primaryDomainId: 'dom_social',
  primarySectionId: 'sec_gardens',
  secondaryDomainIds: ['dom_world', 'dom_physical', 'dom_emotional'],
  relatedSectionIds: ['sec_shared_resources', 'sec_third_places', 'sec_restoration', 'sec_food_systems'],
  tags: ['food', 'community', 'ecology', 'shared place'],
  status: 'Ready for testing',
  createdAt: t('2026-09-20T14:00:00.000Z'),
  updatedAt: t('2026-10-18T11:45:00.000Z'),
  illustrative: true,
  purpose: {
    problem:
      'Many neighbourhoods have unused land, thin social ties and little everyday contact with how food grows. People also lack low-cost ways to be physically active and to learn ecological skills together.',
    importance:
      'A garden is a concrete shared object: it creates repeated contact, visible mutual dependence and a reason to be outside. It can also improve local habitat and food knowledge.',
    outcomes:
      'A functioning shared growing space; a group that can organise work and share harvests; more local ecological literacy; regular light-to-moderate physical activity.',
    suitableFor: 'Neighbourhood groups, schools, faith communities, housing associations and workplaces with access to land and water.',
    unsuitableWhen:
      'Land is contaminated or insecure; water access is unavailable; the group cannot sustain maintenance; or the project would displace existing users or community uses.',
  },
  instructions: {
    preparation:
      'Secure permission and water. Test soil for contaminants before growing food. Agree a simple governance model, a budget, a maintenance rota and a plan for winter. Start with a small area that can succeed rather than the whole site.',
    steps: [
      'Map the site: sun, water, access, soil, existing plants and people who use the space.',
      'Agree purpose and rules with the people who will actually do the work; write down who decides what.',
      'Start with a small bed, a shared tool store and a water plan.',
      'Hold a regular work session at the same time each week; make it social and include a task for beginners.',
      'Grow a few reliable crops first; add ecological features such as habitat piles or a forest-garden corner over time.',
      'Share harvests and decisions openly; review the season together before planning the next.',
    ],
    frequency: 'One shared session per week during the growing season, with lighter maintenance between. Plan a realistic winter rhythm.',
    beginner: 'A few containers or a single raised bed with herbs and salad. Focus on soil, water and showing up.',
    intermediate: 'A shared plot with a crop plan, a compost system and a rota for watering and maintenance.',
    advanced: 'A forest-garden or agroecological system with perennial planting, seed saving, community education and links to local food institutions.',
    adaptations:
      'Window boxes, balconies, school yards, church land, allotment plots, guerrilla gardening (with legal care) and shared gardens between neighbours.',
    mistakes:
      'Building too much infrastructure before a group exists; ignoring water; ignoring contaminated soil; planning only for summer; letting one enthusiastic person carry everything.',
    safety:
      'Test soil where food is grown. Use tools with basic training. Manage allergies, sun exposure, water safety and manual-handling risks. Ensure the site is accessible.',
  },
  rationale: {
    mechanisms:
      'Gardening combines physical activity, outdoor light, skill learning and repeated social contact around a shared task. Shared place may strengthen attachment and informal mutual aid.',
    evidence:
      'Illustrative sample. There is research on community gardens and wellbeing, but it is heterogeneous and often observational. Add specific studies and assess their limitations before making causal claims.',
    counterEvidence:
      'Benefits are unevenly distributed; gardens can raise property values and displace residents; participation can be burdensome for people with limited time; some well-intended projects fail within a season.',
    assumptions:
      'That land and water are available, the group has enough capacity, and the garden is genuinely open to the surrounding community.',
    uncertainties:
      'How large the effects are, how long they last, and whether gardens build durable social ties or mainly serve already-connected people.',
  },
  knowledge: {
    science: 'To investigate: reviews of community gardening and health; allotment studies; urban ecology and soil contamination guidance.',
    books: 'Practical growing guides, land-use and commons literature, and local food histories.',
    philosophy: 'Ideas of stewardship, commoning, work and place; traditions that treat cultivation as a moral practice.',
    history: 'Allotment movements, victory gardens, urban agriculture and land reform.',
    observations: 'Keep a seasonal log: who came, what grew, what failed, who was excluded.',
  },
  evaluation: {
    success: 'The garden is still active after a year, a core group shares work, newcomers return, and some food is eaten or shared.',
    measures: 'Weekly attendance; retention; area cultivated; harvest recorded informally; participant interviews; biodiversity observations.',
    timeframe: 'One growing season for a first review; three years to judge durability.',
    costs: 'Land, water, tools, insurance, coordination time and the risk of volunteer burnout.',
    confidence: 'Low to moderate for social outcomes; higher for the direct food and activity produced. This sample has not been through evidence review.',
  },
  application: {
    self: 'Join an existing garden before starting one; commit to one weekly session.',
    family: 'A household plot or shared bed; children can take responsibility for a crop.',
    community: 'A shared site with clear governance, a tool library link and inclusive membership.',
    society: 'Planning rules that protect community growing land, water access, and support for local food infrastructure.',
    ecological: 'Habitat features, composting, water capture, perennial crops and reduced food miles — with attention to soil and wildlife.',
  },
  notes: {
    questions: [
      'Who is excluded by membership fees, waiting lists and the expectation of free time?',
      'Does the garden build new ties, or mainly reinforce existing ones?',
      'What governance model survives the departure of the founder?',
    ],
    disagreements: 'Whether to prioritise food production or social and ecological aims; how formal the membership should be.',
    reflections: 'The most valuable output may be the weekly rhythm of showing up together, not the vegetables.',
    improvements: 'Add a one-page starter kit with water, soil testing and a first-season crop plan.',
    futureExperiments: 'Run a four-week shared session pilot and record attendance, who returns, and what people say they came for.',
  },
  scales: {
    self: {
      direct: 'Physical activity, outdoor time, skill and food.',
      indirect: 'Belonging and a reason to leave the house.',
      beneficiaries: 'The gardener.',
      costs: 'Time, physical strain and possible disappointment.',
      dependencies: 'Accessible site, tools, water.',
      unintended: 'Obligation can become another source of pressure.',
    },
    family: {
      direct: 'Shared activity and food for the household.',
      indirect: 'Children learn where food comes from.',
      beneficiaries: 'Households and children.',
      costs: 'Coordination and childcare.',
      dependencies: 'A site near home.',
      unintended: 'Uneven division of labour.',
    },
    community: {
      direct: 'Repeated contact and shared work across neighbours.',
      indirect: 'Trust, mutual aid and a visible shared place.',
      beneficiaries: 'Neighbours, isolated residents, local businesses.',
      costs: 'Land, water, insurance and coordination.',
      dependencies: 'Tenure, governance, inclusion.',
      unintended: 'Gentrification pressure and exclusion of poorer residents.',
    },
    region: {
      direct: 'Local food production and green infrastructure.',
      indirect: 'Cooling, water retention and habitat connectivity.',
      beneficiaries: 'Residents and local ecology.',
      costs: 'Planning and land opportunity costs.',
      dependencies: 'Land policy and water infrastructure.',
      unintended: 'Green amenities can accelerate displacement.',
    },
    global: {
      direct: 'Small.',
      indirect: 'A cultural model of local food and commoning.',
      beneficiaries: 'Communities learning from the model.',
      costs: 'Attention and resources diverted from larger-scale action.',
      dependencies: 'Networks of practice.',
      unintended: 'Local projects can substitute for structural change.',
    },
    ecological: {
      direct: 'Habitat, pollinators, soil care and reduced food miles.',
      indirect: 'Ecological literacy and care for nearby life.',
      beneficiaries: 'Insects, birds, soil and humans.',
      costs: 'Water use, imported soil or peat, and possible disturbance.',
      dependencies: 'Ecological knowledge and continuity.',
      unintended: 'Poorly chosen plants or inputs can harm local ecology.',
    },
  },
  hiddenSections: [],
});

const methods = [strength, journal, garden];

const sources = [
  blankSource({
    id: 'src_frankl',
    kind: 'book',
    title: "Man's Search for Meaning",
    creator: 'Viktor E. Frankl',
    year: '1946',
    publication: 'First published 1946; English translation 1959. Check the edition you are using.',
    identifier: '',
    url: '',
    pages: 'Part Two: “Logotherapy in a Short Introduction” — consult your edition for exact pages.',
    summary:
      'Illustrative entry. Frankl describes his experience in concentration camps and argues that finding meaning is central to psychological survival. The book combines witness, clinical observation and philosophical argument; it is not a controlled study.',
    keyClaims:
      'Meaning can be found in work, in love, and in the attitude taken toward unavoidable suffering. Meaning is presented as a primary human motivation.',
    evidence:
      'Personal testimony and clinical experience, not systematic empirical evidence. Later research programmes have developed related ideas; attach those separately if relying on them.',
    limitations:
      'Not a controlled study; generalisation from extreme circumstances requires care. Interpretations of the book vary widely.',
    interpretation:
      'Useful as a moral and existential account, and as a source of questions for empirical work — not as proof of an efficacy claim.',
    implications:
      'Practice might include deliberate articulation of meaning and responsibility, but the guidebook should not overstate what the book establishes.',
    verification: 'Author interpretation',
    readingStatus: 'Read',
    tags: ['meaning', 'logotherapy', 'existential'],
    createdAt: t('2026-09-22T10:00:00.000Z'),
    updatedAt: t('2026-10-02T15:20:00.000Z'),
    illustrative: true,
  }),
  blankSource({
    id: 'src_heschel',
    kind: 'book',
    title: 'The Sabbath: Its Meaning for Modern Man',
    creator: 'Abraham Joshua Heschel',
    year: '1951',
    publication: 'Farrar, Straus and Giroux (check edition and year).',
    identifier: '',
    url: '',
    pages: 'Chapter One — consult your edition for exact pages.',
    summary:
      'Illustrative entry. Heschel presents the Sabbath as a sanctuary in time rather than space, and argues that modern life overvalues things and productivity at the expense of sacred time.',
    keyClaims:
      'Time can be made holy; rest is not merely the absence of work but a different kind of attention; civilisation is shaped by what it treats as sacred.',
    evidence:
      'Theological and philosophical argument grounded in Jewish tradition, not empirical research.',
    limitations:
      'A work of theology and interpretation; not intended as a scientific account. The reader should not treat its claims as empirical findings.',
    interpretation:
      'A resource for thinking about rest, attention and the rhythm of the week. It raises questions that could be studied empirically without reducing the argument to them.',
    implications:
      'Consider a weekly protected period that is not organised around productivity; distinguish rest from recovery-for-work.',
    verification: 'Stated in source',
    readingStatus: 'Reading',
    tags: ['sabbath', 'time', 'rest', 'jewish thought'],
    createdAt: t('2026-09-25T09:30:00.000Z'),
    updatedAt: t('2026-10-15T18:00:00.000Z'),
    illustrative: true,
  }),
];

const readingNotes = [
  blankNote({
    id: 'note_heschel',
    sourceId: 'src_heschel',
    title: 'Attention as a practice of reverence',
    body:
      'Illustrative note. Heschel’s argument is not primarily about productivity; it is about what a person treats as real. The useful question for the guidebook is not “does rest make me more efficient?” but “what kind of attention am I cultivating?”\n\nTo investigate: whether a weekly protected period changes perceived time scarcity, and how to describe that without borrowing theological authority the reader may not share.',
    tags: ['attention', 'rest', 'interpretation'],
    createdAt: t('2026-10-01T20:10:00.000Z'),
    updatedAt: t('2026-10-15T18:10:00.000Z'),
    illustrative: true,
  }),
];

const quotations = [
  blankQuotation({
    id: 'quote_placeholder',
    sourceId: 'src_heschel',
    text:
      'Placeholder quotation — this sample intentionally contains no wording attributed to a real author. Insert the exact passage from your edition here.',
    page: '—',
    note: 'Demonstrates the quotation workflow. Verify wording and page before use.',
    createdAt: t('2026-10-02T09:00:00.000Z'),
    illustrative: true,
  }),
];

const claims = [
  blankClaim({
    id: 'claim_strength',
    statement:
      'Progressive resistance training improves strength and physical function across adulthood.',
    status: 'Needs verification',
    sourceIds: [],
    notes:
      'Sample claim. Attach specific systematic reviews and effect sizes before asserting this in the manuscript. Distinguish strength gains from falls, mortality and quality-of-life outcomes.',
    createdAt: t('2026-10-03T11:00:00.000Z'),
    updatedAt: t('2026-10-03T11:00:00.000Z'),
    illustrative: true,
  }),
  blankClaim({
    id: 'claim_meaning',
    statement: 'A sense of meaning is associated with resilience under adversity.',
    status: 'Interpretive',
    sourceIds: ['src_frankl'],
    notes:
      'Interpretive synthesis from Frankl. If treated as an empirical claim, it needs separate evidence and a clear definition of meaning.',
    createdAt: t('2026-10-04T09:00:00.000Z'),
    updatedAt: t('2026-10-04T09:00:00.000Z'),
    illustrative: true,
  }),
];

const documents = [
  blankDocument({ id: 'doc_part1', parentId: null, kind: 'part', title: 'Part I — The Individual', order: 0, illustrative: true }),
  blankDocument({ id: 'doc_ch_physical', parentId: 'doc_part1', kind: 'chapter', title: 'Physical Health', order: 0, illustrative: true }),
  blankDocument({
    id: 'doc_ch_sleep',
    parentId: 'doc_ch_physical',
    kind: 'section',
    title: 'Sleep and the architecture of a day',
    order: 0,
    status: 'Revising',
    illustrative: true,
    createdAt: t('2026-10-05T08:00:00.000Z'),
    updatedAt: t('2026-10-18T21:30:00.000Z'),
    content: `*Illustrative sample chapter. This is a demonstration of the writing environment, not a finished argument.*

Sleep is the most ordinary and least negotiable form of recovery. It is also where private routines collide with work, caregiving, light and noise. A guidebook that treats sleep as a personal discipline alone will mislead its reader: the shape of the day is usually set by institutions before an individual ever chooses a bedtime.

## The day has a shape

The first practical question is not “how do I sleep better?” but “what is my day for?” A day organised around responsiveness — messages, meetings, other people's urgency — tends to dissolve into fragments. A day with a protected beginning and end gives sleep something to attach to.

Three conditions recur in the author's notes:

- A consistent waking time, even after a poor night.
- Light in the morning and dimness in the evening.
- A boundary around the last hour, treated as part of the day rather than stolen from it.

None of these is a cure. Each is a way of making the day legible to the body.

## Rest is not only sleep

Sleep is one form of recovery. The weekly rhythm matters too: a day that is not organised around output, time outdoors, and unhurried contact with other people all replenish capacities that sleep alone cannot.

> The question is not how to recover in order to work, but what kind of life is worth recovering for.

The practical methods connected to this chapter are deliberately modest: [[method:m_strength|Strength Training]] supports the physical capacity that makes an active day possible, and [[method:m_journal|Reflective Journalling]] gives the week a place to be examined rather than merely endured.

## Questions to investigate

1. Which claims about sleep duration and health are robust across populations, and which depend on measurement choices?
2. How much of the “sleep crisis” is a change in sleep, and how much is a change in how sleep is discussed?
3. What would a household or workplace policy look like if rest were treated as infrastructure?

*Add sources before turning these notes into claims. This sample deliberately cites none.*`,
    comments: [
      {
        id: 'c_sample1',
        excerpt: 'what is my day for?',
        body: 'This question may be too large for the chapter. Consider moving it to the Part I introduction and keeping this chapter concrete.',
        resolved: false,
        createdAt: t('2026-10-18T21:35:00.000Z'),
      },
      {
        id: 'c_sample2',
        excerpt: 'The question is not how to recover in order to work',
        body: 'Good line. Check whether it overstates the argument — rest may also be instrumentally valuable.',
        resolved: true,
        createdAt: t('2026-10-17T19:00:00.000Z'),
      },
    ],
  }),
  blankDocument({ id: 'doc_ch_emotional', parentId: 'doc_part1', kind: 'chapter', title: 'Emotional and Intellectual Health', order: 1, illustrative: true }),
  blankDocument({ id: 'doc_ch_spiritual', parentId: 'doc_part1', kind: 'chapter', title: 'Spiritual Health', order: 2, illustrative: true }),

  blankDocument({ id: 'doc_part2', parentId: null, kind: 'part', title: 'Part II — Relationships and Family', order: 1, illustrative: true }),
  blankDocument({ id: 'doc_ch_relationships', parentId: 'doc_part2', kind: 'chapter', title: 'Friendship, Intimacy, Partnership, Marriage and Children', order: 0, illustrative: true }),
  blankDocument({ id: 'doc_ch_family_life', parentId: 'doc_part2', kind: 'chapter', title: 'Personal Flourishing and Family Life', order: 1, illustrative: true }),

  blankDocument({ id: 'doc_part3', parentId: null, kind: 'part', title: 'Part III — Community and Place', order: 2, illustrative: true }),
  blankDocument({ id: 'doc_ch_local', parentId: 'doc_part3', kind: 'chapter', title: 'Local Community', order: 0, illustrative: true }),
  blankDocument({ id: 'doc_ch_shared', parentId: 'doc_part3', kind: 'chapter', title: 'Shared Resources and Mutual Aid', order: 1, illustrative: true }),
  blankDocument({ id: 'doc_ch_spaces', parentId: 'doc_part3', kind: 'chapter', title: 'Community Spaces, Education, Food Systems and the Built Environment', order: 2, illustrative: true }),

  blankDocument({ id: 'doc_part4', parentId: null, kind: 'part', title: 'Part IV — Networks and Civilisation', order: 3, illustrative: true }),
  blankDocument({ id: 'doc_ch_networks', parentId: 'doc_part4', kind: 'chapter', title: 'Networks Connecting Communities', order: 0, illustrative: true }),
  blankDocument({ id: 'doc_ch_institutions', parentId: 'doc_part4', kind: 'chapter', title: 'Institutional and Technological Systems', order: 1, illustrative: true }),
  blankDocument({ id: 'doc_ch_culture', parentId: 'doc_part4', kind: 'chapter', title: 'Cultural Transmission and Civilisational Development', order: 2, illustrative: true }),

  blankDocument({ id: 'doc_part5', parentId: null, kind: 'part', title: 'Part V — World Health', order: 4, illustrative: true }),
  blankDocument({ id: 'doc_ch_ecology', parentId: 'doc_part5', kind: 'chapter', title: 'Ecology and the Living World', order: 0, illustrative: true }),
  blankDocument({ id: 'doc_ch_planetary', parentId: 'doc_part5', kind: 'chapter', title: 'Planetary Responsibility', order: 1, illustrative: true }),
  blankDocument({ id: 'doc_ch_longterm', parentId: 'doc_part5', kind: 'chapter', title: 'Long-Term Human and Ecological Flourishing', order: 2, illustrative: true }),
];

const experiments = [
  blankExperiment({
    id: 'exp_garden',
    title: 'Sample experiment: four weeks of shared garden sessions',
    hypothesis:
      'A weekly, well-organised shared garden session will produce repeated contact between neighbours who did not previously know one another, and at least half of first-time attendees will return.',
    context:
      'Illustrative sample. A neighbourhood with a small shared plot, limited parking, a mix of renters and owners, and no existing gardening group.',
    participants: 'Illustrative: 12–20 neighbours, including older residents and families with young children.',
    procedure:
      'Hold one two-hour session each week for four weeks at the same time. Provide tools, water, a beginner task and a shared meal at the end. Record attendance and ask returning participants what brought them back.',
    expected:
      'Six to ten attendees per session, with a stable core of five returning. Informal conversation across households, and a completed first bed.',
    observations:
      'Illustrative only — no real observations have been collected. This section demonstrates where the author would record them.',
    startDate: '2026-09-06',
    endDate: '2026-10-04',
    worked:
      'Not yet evaluated. The design is intended to test whether a fixed rhythm and a shared meal lower the barrier to participation.',
    failed: 'Not yet evaluated.',
    confounders:
      'Weather, harvest season, school term, promotion through existing networks, and the personality of the organiser.',
    lessons:
      'Sample: record who does not return, not only who does. A successful first season is not evidence of durability.',
    revisions:
      'If participation is low, test a different time and a specific invitation through an existing group rather than public advertising.',
    scale: 'Community',
    status: 'Complete',
    createdAt: t('2026-09-02T10:00:00.000Z'),
    updatedAt: t('2026-10-05T16:00:00.000Z'),
    illustrative: true,
  }),
];

const relationships: Relationship[] = [
  { id: 'rel_1', fromId: 'src_frankl', toId: 'm_journal', type: 'supports', note: 'Provides an existential rationale for reflective practice; not evidence of efficacy.', createdAt: t('2026-10-02T10:00:00.000Z') },
  { id: 'rel_2', fromId: 'src_heschel', toId: 'm_journal', type: 'supports', note: 'A theological account of attention and sacred time.', createdAt: t('2026-10-02T10:05:00.000Z') },
  { id: 'rel_3', fromId: 'note_heschel', toId: 'doc_ch_sleep', type: 'supports', note: 'Reading note on attention and rest; relevant to the chapter’s argument about the shape of a day.', createdAt: t('2026-10-05T09:00:00.000Z') },
  { id: 'rel_4', fromId: 'doc_ch_sleep', toId: 'm_strength', type: 'references', note: 'The chapter links to strength training as a supporting method.', createdAt: t('2026-10-05T09:05:00.000Z') },
  { id: 'rel_5', fromId: 'doc_ch_sleep', toId: 'm_journal', type: 'references', note: 'The chapter links to reflective journalling.', createdAt: t('2026-10-05T09:06:00.000Z') },
  { id: 'rel_6', fromId: 'doc_ch_spaces', toId: 'm_garden', type: 'references', note: 'The chapter will discuss community gardening as social infrastructure.', createdAt: t('2026-10-06T09:00:00.000Z') },
  { id: 'rel_7', fromId: 'exp_garden', toId: 'm_garden', type: 'tests', note: 'Four-week pilot of the shared-session element.', createdAt: t('2026-10-05T16:10:00.000Z') },
  { id: 'rel_8', fromId: 'exp_garden', toId: 'sec_gardens', type: 'applies', note: 'Applies the section’s aims in a local setting.', createdAt: t('2026-10-05T16:11:00.000Z') },
  { id: 'rel_9', fromId: 'm_garden', toId: 'm_strength', type: 'related_to', note: 'Gardening involves physical work; strength supports it and may be built by it.', createdAt: t('2026-10-06T09:10:00.000Z') },
  { id: 'rel_10', fromId: 'm_strength', toId: 'm_journal', type: 'related_to', note: 'Both depend on a weekly rhythm and deliberate reflection on what is working.', createdAt: t('2026-10-06T09:12:00.000Z') },
  { id: 'rel_11', fromId: 'src_frankl', toId: 'claim_meaning', type: 'supports', note: 'Interpretive support, not empirical confirmation.', createdAt: t('2026-10-04T09:05:00.000Z') },
  { id: 'rel_12', fromId: 'quote_placeholder', toId: 'note_heschel', type: 'references', note: 'Quotation awaiting verification and integration into the note.', createdAt: t('2026-10-02T09:05:00.000Z') },
  { id: 'rel_13', fromId: 'src_heschel', toId: 'sec_prayer', type: 'extends', note: 'Sabbath practice offers a model of protected contemplative time.', createdAt: t('2026-10-07T09:00:00.000Z') },
];

export function createSeedProject(): Project {
  const ts = new Date().toISOString();
  return {
    version: 1,
    domains,
    sections,
    methods,
    documents,
    sources,
    notes: readingNotes,
    quotations,
    claims,
    experiments,
    inbox: [
      {
        id: 'inbox_sample',
        text: 'Idea to capture: compare the Sabbath and the Muslim Friday as structures of protected time. Find a primary source before writing anything.',
        createdAt: t('2026-10-14T20:30:00.000Z'),
      },
    ],
    relationships,
    trash: [],
    settings: {
      authorName: 'Author',
      projectTitle: 'Guidebook for the Future',
      readerTitle: 'Guidebook for the Future — Reader Edition',
      dashboard: {
        widgets: ['domains', 'recent', 'attention', 'research', 'completion', 'quick'],
        recentLimit: 5,
        pinnedSectionIds: ['sec_strength', 'sec_sleep', 'sec_friendship'],
      },
      showIllustrativeBadges: true,
    },
    meta: { createdAt: ts, lastSavedAt: ts, revision: 1 },
  };
}
