import type { ReactNode } from 'react';
import { Route, Routes, Link } from 'react-router-dom';
import { Layout } from './components/Layout';
import { HomePage } from './pages/Home';
import { GuidePage, DomainPage, SectionPage, AllMethodsPage } from './pages/Guide';
import { MethodPage } from './pages/MethodPage';
import { MethodEditorPage } from './pages/MethodEditor';
import { StudioOverviewPage, StudioDocumentPage } from './pages/Studio';
import { ResearchPage } from './pages/Research';
import { SourceDetailPage } from './pages/SourceDetail';
import { ResearchEditorPage } from './pages/ResearchEditor';
import { NoteEditorPage } from './pages/NoteEditor';
import { ConnectionsPage } from './pages/Connections';
import { ExperimentsPage, ExperimentDetailPage } from './pages/Experiments';
import { ScalesPage } from './pages/Scales';
import { SearchPage } from './pages/SearchPage';
import { InboxPage } from './pages/Inbox';
import { SettingsPage } from './pages/Settings';
import { ReaderPage } from './pages/Reader';
import {
  EditionLandingPage,
  EditionDomainPage,
  EditionSectionPage,
  EditionMethodPage,
} from './pages/Edition';
import { EmptyState } from './components/ui';
import { RouteTitle } from './components/RouteTitle';
import { useStore } from './store';

/**
 * Editors read their initial draft from the project on mount, so nothing is
 * rendered until the stored project has been loaded. Without this gate a deep
 * link opened on a cold start would briefly (or permanently) see seed data and
 * report the record as missing.
 */
function WorkspaceGate({ children }: { children: ReactNode }) {
  const { ready } = useStore();
  if (!ready) {
    return (
      <div className="workspace-loading" role="status" aria-live="polite">
        <div className="workspace-loading-mark">
          <span />
          <span />
          <span />
        </div>
        <p>Opening your library…</p>
      </div>
    );
  }
  return <>{children}</>;
}

function NotFoundPage() {
  return (
    <div className="page">
      <EmptyState
        icon="alert"
        title="Page not found"
        body="That route does not exist in this workspace."
        action={<Link to="/" className="button primary">Return home</Link>}
      />
    </div>
  );
}

export default function App() {
  return (
    <WorkspaceGate>
      <RouteTitle />
      <Routes>
      {/**
       * The public edition renders the committed content file, not this
       * browser's workspace, so a visitor sees the same guide and the same
       * URLs. `method` is a static segment and outranks `:domainSlug` in the
       * router's ranking. The workspace reader moved to /preview.
       */}
      <Route path="/read" element={<EditionLandingPage />} />
      <Route path="/read/method/:methodSlug" element={<EditionMethodPage />} />
      <Route path="/read/:domainSlug" element={<EditionDomainPage />} />
      <Route path="/read/:domainSlug/:sectionSlug" element={<EditionSectionPage />} />
      <Route path="/preview" element={<ReaderPage />} />
      <Route
        path="*"
        element={
          <Layout>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/guide" element={<GuidePage />} />
              <Route path="/guide/methods" element={<AllMethodsPage />} />
              <Route path="/guide/section/:sectionId" element={<SectionPage />} />
              <Route path="/guide/:domainId" element={<DomainPage />} />
              <Route path="/method/:methodId/edit" element={<MethodEditorPage />} />
              <Route path="/method/:methodId" element={<MethodPage />} />
              <Route path="/studio" element={<StudioOverviewPage />} />
              <Route path="/studio/:docId" element={<StudioDocumentPage />} />
              <Route path="/research" element={<ResearchPage />} />
              <Route path="/research/note/:noteId" element={<NoteEditorPage />} />
              <Route path="/research/:sourceId/edit" element={<ResearchEditorPage />} />
              <Route path="/research/:sourceId" element={<SourceDetailPage />} />
              <Route path="/connections" element={<ConnectionsPage />} />
              <Route path="/experiments" element={<ExperimentsPage />} />
              <Route path="/experiments/:experimentId" element={<ExperimentDetailPage />} />
              <Route path="/scales" element={<ScalesPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/inbox" element={<InboxPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Layout>
        }
      />
      </Routes>
    </WorkspaceGate>
  );
}
