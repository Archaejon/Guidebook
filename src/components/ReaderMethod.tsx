import type { Method } from '../types';
import { SCALES } from '../types';
import { Markdown, type MethodHref } from './Markdown';

/**
 * One method rendered as reading material. Shared by the local reader preview
 * and the public edition, so a method cannot look like one thing while being
 * edited and another on the deployed site.
 *
 * `showTitle` is off on the edition's method page, which renders the title as
 * the page's own h1; `methodHref` is how cross-references resolve differently
 * in each surface.
 */
function ReaderField({ label, value, methodHref }: { label: string; value: string; methodHref?: MethodHref }) {
  if (!value.trim()) return null;
  return (
    <div className="reader-field">
      <h4>{label}</h4>
      <Markdown content={value} methodHref={methodHref} />
    </div>
  );
}

export function ReaderMethod({
  method,
  domainTitle,
  sectionTitle,
  showTitle = true,
  methodHref,
}: {
  method: Method;
  domainTitle: string;
  sectionTitle: string;
  showTitle?: boolean;
  methodHref?: MethodHref;
}) {
  const hidden = method.hiddenSections;
  return (
    <article className="reader-method" id={`method-${method.id}`}>
      <p className="reader-kicker">
        {domainTitle}
        {sectionTitle ? ` · ${sectionTitle}` : ''}
      </p>
      {showTitle ? <h2>{method.title}</h2> : null}
      <p className="reader-summary">{method.summary}</p>
      {!hidden.includes('purpose') ? (
        <section>
          <ReaderField label="The problem" value={method.purpose.problem} methodHref={methodHref} />
          <ReaderField label="Why it matters" value={method.purpose.importance} methodHref={methodHref} />
          <ReaderField label="What it is for" value={method.purpose.outcomes} methodHref={methodHref} />
          <ReaderField label="Who it is for" value={method.purpose.suitableFor} methodHref={methodHref} />
          <ReaderField label="When it may not be suitable" value={method.purpose.unsuitableWhen} methodHref={methodHref} />
        </section>
      ) : null}
      {!hidden.includes('instructions') ? (
        <section>
          <h3>Practice</h3>
          {method.instructions.preparation ? (
            <Markdown content={method.instructions.preparation} methodHref={methodHref} />
          ) : null}
          {method.instructions.steps.filter(Boolean).length ? (
            <ol className="reader-steps">
              {method.instructions.steps.filter(Boolean).map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          ) : null}
          {method.instructions.frequency ? <p className="reader-frequency">{method.instructions.frequency}</p> : null}
          <ReaderField label="Beginner" value={method.instructions.beginner} methodHref={methodHref} />
          <ReaderField label="Intermediate" value={method.instructions.intermediate} methodHref={methodHref} />
          <ReaderField label="Advanced" value={method.instructions.advanced} methodHref={methodHref} />
          <ReaderField label="Adaptations" value={method.instructions.adaptations} methodHref={methodHref} />
          <ReaderField label="Common mistakes" value={method.instructions.mistakes} methodHref={methodHref} />
          {method.instructions.safety ? (
            <div className="reader-safety">
              <strong>Safety</strong>
              <p>{method.instructions.safety}</p>
            </div>
          ) : null}
        </section>
      ) : null}
      {!hidden.includes('rationale') ? (
        <section>
          <h3>Why it might work</h3>
          <ReaderField label="Mechanisms" value={method.rationale.mechanisms} methodHref={methodHref} />
          <ReaderField label="Evidence" value={method.rationale.evidence} methodHref={methodHref} />
          <ReaderField label="Limits and counter-evidence" value={method.rationale.counterEvidence} methodHref={methodHref} />
          <ReaderField label="Uncertainties" value={method.rationale.uncertainties} methodHref={methodHref} />
        </section>
      ) : null}
      {!hidden.includes('knowledge') ? (
        <section>
          <h3>Sources and traditions</h3>
          <ReaderField label="Scientific literature" value={method.knowledge.science} methodHref={methodHref} />
          <ReaderField label="Books" value={method.knowledge.books} methodHref={methodHref} />
          <ReaderField label="Religious and philosophical sources" value={method.knowledge.philosophy} methodHref={methodHref} />
          <ReaderField label="Historical examples" value={method.knowledge.history} methodHref={methodHref} />
          <ReaderField label="Observations" value={method.knowledge.observations} methodHref={methodHref} />
        </section>
      ) : null}
      {!hidden.includes('evaluation') ? (
        <section>
          <h3>How we would know</h3>
          <ReaderField label="Success" value={method.evaluation.success} methodHref={methodHref} />
          <ReaderField label="Measures" value={method.evaluation.measures} methodHref={methodHref} />
          <ReaderField label="Timeframe" value={method.evaluation.timeframe} methodHref={methodHref} />
          <ReaderField label="Costs and trade-offs" value={method.evaluation.costs} methodHref={methodHref} />
          <ReaderField label="Confidence" value={method.evaluation.confidence} methodHref={methodHref} />
        </section>
      ) : null}
      {!hidden.includes('application') ? (
        <section>
          <h3>At different scales</h3>
          <ReaderField label="Individual" value={method.application.self} methodHref={methodHref} />
          <ReaderField label="Family" value={method.application.family} methodHref={methodHref} />
          <ReaderField label="Community" value={method.application.community} methodHref={methodHref} />
          <ReaderField label="Society" value={method.application.society} methodHref={methodHref} />
          <ReaderField label="Ecological" value={method.application.ecological} methodHref={methodHref} />
          {!hidden.includes('scales') ? (
            <div className="reader-scale-list">
              {SCALES.map((scale) => {
                const value = method.scales[scale.key];
                const filled = Object.values(value).some(Boolean);
                if (!filled) return null;
                return (
                  <div key={scale.key}>
                    <h4>{scale.label}</h4>
                    {value.direct ? <p><strong>Direct:</strong> {value.direct}</p> : null}
                    {value.costs ? <p><strong>Costs:</strong> {value.costs}</p> : null}
                    {value.unintended ? <p><strong>Unintended:</strong> {value.unintended}</p> : null}
                  </div>
                );
              })}
            </div>
          ) : null}
        </section>
      ) : null}
    </article>
  );
}
