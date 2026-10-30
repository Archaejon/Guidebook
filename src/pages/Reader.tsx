import { Link } from 'react-router-dom';
import { useStore } from '../store';
import { Icon } from '../components/Icon';
import { Markdown } from '../components/Markdown';
import { ReaderMethod } from '../components/ReaderMethod';
import { orderedDocuments } from '../lib/selectors';
import { downloadReaderHtml } from '../lib/exports';
import { formatDate } from '../lib/utils';
import { EmptyState } from '../components/ui';

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
                {publishedMethods.map((method) => (
                  <ReaderMethod
                    key={method.id}
                    method={method}
                    domainTitle={project.domains.find((d) => d.id === method.primaryDomainId)?.title ?? ''}
                    sectionTitle={project.sections.find((s) => s.id === method.primarySectionId)?.title ?? ''}
                  />
                ))}
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
