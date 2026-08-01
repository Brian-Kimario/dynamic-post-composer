import DraftsPanel from '../components/drafts/DraftsPanel';
import PublishedPostsPanel from '../components/posts/PublishedPostsPanel';

/**
 * Drafts and published posts together — the read view of the workspace, and the
 * only content route a viewer can reach. Both panels load their own data, so
 * this page is layout and nothing else.
 */
export default function LibraryPage() {
  return (
    <div className="flex flex-col gap-5">
      <DraftsPanel />
      <PublishedPostsPanel />
    </div>
  );
}
