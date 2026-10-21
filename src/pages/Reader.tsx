import { Link } from 'react-router-dom';
import { useStore } from '../store';
import type { Method } from '../types';
import { SCALES } from '../types';
import { Icon } from '../components/Icon';
import { Markdown } from '../components/Markdown';
import { orderedDocuments } from '../lib/selectors';
import { downloadReaderHtml } from '../lib/exports';
import { formatDate } from '../lib/utils';
import { EmptyState } from '../components/ui';

function ReaderField({ label, value }: { label: string; value: string }) {
  if (!value.trim()) return null;
  return (
    <div className="reader-field">
      <h4>{label}</h4>
      <Markdown content={value} />
    </div>
  );
}

function ReaderMethod({ method }: { method: Method }) {
  const { project } = useStore();
  const domain = project.domains.find((d) => d.id === method.primaryDomainId);
  const section = project.sections.find((s) => s.id === method.primarySectionId);
  const hidden = method.hiddenSections;
  return (
    <article className="reader-method" id={`method-${method.id}`}>
      <p className="reader-kicker">{domain?.title}{section ? ` · ${section.title}` : ''}</p>
      <h2>{method.title}</h2>
      <p className="reader-summary">{method.summary}</p>
      {!hidden.includes('purpose') ? (
        <section>
          <ReaderField label="The problem" value={method.purpose.problem} />
          <ReaderField label="Why it matters" value={method.purpose.importance} />
          <ReaderField label="What it is for" value={method.purpose.outcomes} />
          <ReaderField label="Who it is for" value={method.purpose.suitableFor} />
          <ReaderField label="When it may not be suitable" value={method.purpose.unsuitableWhen} />
        </section>
      ) : null}
      {!hidden.includes('instructions') ? (
        <section>
          <h3>Practice</h3>
          {method.instructions.preparation ? <Markdown content={method.instructions.preparation} /> : null}
          {method.instructions.steps.filter(Boolean).length ? (
            <ol className="reader-steps">
              {method.instructions.steps.filter(Boolean).map((step, i) => <li key={i}>{step}</li>)}
            </ol>
          ) : null}
          {method.instructions.frequency ? <p className="reader-frequency">{method.instructions.frequency}</p> : null}
          <ReaderField label="Beginner" value={method.instructions.beginner} />
          <ReaderField label="Intermediate" value={method.instructions.intermediate} />
          <ReaderField label="Advanced" value={method.instructions.advanced} />
          <ReaderField label="Adaptations" value={method.instructions.adaptations} />
          <ReaderField label="Common mistakes" value={method.instructions.mistakes} />
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
          <ReaderField label="Mechanisms" value={method.rationale.mechanisms} />
          <ReaderField label="Evidence" value={method.rationale.evidence} />
          <ReaderField label="Limits and counter-evidence" value={method.rationale.counterEvidence} />
          <ReaderField label="Uncertainties" value={method.rationale.uncertainties} />
        </section>
      ) : null}
      {!hidden.includes('knowledge') ? (
        <section>
          <h3>Sources and traditions</h3>
          <ReaderField label="Scientific literature" value={method.knowledge.science} />
          <ReaderField label="Books" value={method.knowledge.books} />
          <ReaderField label="Religious and philosophical sources" value={method.knowledge.philosophy} />
          <ReaderField label="Historical examples" value={method.knowledge.history} />
          <ReaderField label="Observations" value={method.knowledge.observations} />
        </section>
      ) : null}
      {!hidden.includes('evaluation') ? (
        <section>
          <h3>How we would know</h3>
          <ReaderField label="Success" value={method.evaluation.success} />
          <ReaderField label="Measures" value={method.evaluation.measures} />
          <ReaderField label="Timeframe" value={method.evaluation.timeframe} />
          <ReaderField label="Costs and trade-offs" value={method.evaluation.costs} />
          <ReaderField label="Confidence" value={method.evaluation.confidence} />
        </section>
      ) : null}
      {!hidden.includes('application') ? (
        <section>
          <h3>At different scales</h3>
          <ReaderField label="Individual" value={method.application.self} />
          <ReaderField label="Family" value={method.application.family} />
          <ReaderField label="Community" value={method.application.community} />
          <ReaderField label="Society" value={method.application.society} />
          <ReaderField label="Ecological" value={method.application.ecological} />
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

export function ReaderPage() {
  const { project } = useStore();
  const publishedMethods = project.methods.filter((m) => m.status === 'Published');
  const publishedDocs = orderedDocuments(project).filter(({ doc }) => doc.status === 'Published');
  const hasContent = publishedMethods.length > 0 || publishedDocs.length > 0;

  return (
    <div className="reader-page">
      <header className="reader-header">
        <div className="reader-header-inner">
          <div>
            <p className="reader-kicker">Local reader edition</p>
            <h1>{project.settings.readerTitle}</h1>
            <p>{project.settings.authorName || 'Author'} · {formatDate(new Date().toISOString())}</p>
          </div>
          <div className="reader-header-actions">
            <Link to="/" className="button ghost small"><Icon name="arrow-left" size={14} /> Back to studio</Link>
            <button className="button ghost small" onClick={() => window.print()}><Icon name="file" size={14} /> Print</button>
            <button className="button primary small" onClick={() => downloadReaderHtml(project)}><Icon name="download" size={14} /> Export HTML</button>
          </div>
        </div>
        <p className="reader-privacy">
          This view is local and private. It contains only records explicitly marked <strong>Published</strong>. Drafts remain private.
        </p>
      </header>

      <div className="reader-body">
        {hasContent ? (
          <>
            <nav className="reader-toc">
              <p className="eyebrow">Contents</p>
              {publishedMethods.length ? (
                <>
                  <h4>Methods</h4>
                  {project.domains.map((domain) => {
                    const methods = publishedMethods.filter((m) => m.primaryDomainId === domain.id);
                    if (!methods.length) return null;
                    return (
                      <div key={domain.id} className="reader-toc-group">
                        <span>{domain.title}</span>
                        {methods.map((method) => (
                          <a key={method.id} href={`#method-${method.id}`}>{method.title}</a>
                        ))}
                      </div>
                    );
                  })}
                </>
              ) : null}
              {publishedDocs.length ? (
                <>
                  <h4>Manuscript</h4>
                  {publishedDocs.map(({ doc }) => (
                    <a key={doc.id} href={`#doc-${doc.id}`}>{doc.title}</a>
                  ))}
                </>
              ) : null}
            </nav>

            <main className="reader-content">
              <section className="reader-manuscript">
                {publishedDocs.map(({ doc }) => (
                  <article key={doc.id} id={`doc-${doc.id}`} className="reader-chapter">
                    <p className="reader-kicker">{doc.kind}</p>
                    <h2>{doc.title}</h2>
                    <Markdown content={doc.content} />
                  </article>
                ))}
              </section>
              <section className="reader-methods">
                {publishedMethods.map((method) => <ReaderMethod key={method.id} method={method} />)}
              </section>
              <footer className="reader-footer">
                <p>{project.settings.projectTitle} · Generated from the local workspace.</p>
                <p>No record appears here unless its status is Published.</p>
              </footer>
            </main>
          </>
        ) : (
          <div className="reader-empty">
            <EmptyState
              icon="book"
              title="Nothing has been published yet"
              body="The reader edition only shows methods and manuscript sections whose status is Published. Mark a method or chapter as Published when it is ready to be read."
              action={
                <div className="reader-empty-actions">
                  <Link to="/guide/methods" className="button primary">Open the method library</Link>
                  <Link to="/studio" className="button ghost">Open the manuscript</Link>
                </div>
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}
