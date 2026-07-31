import { useSelector } from 'react-redux';
import { selectComposerSessionId } from '../../store/composerSlice';
import DraftsPanel from '../drafts/DraftsPanel';
import PublishedPostsPanel from '../posts/PublishedPostsPanel';
import PostComposer from '../post-composer/PostComposer';

/**
 * Pure layout now. Before Redux this component owned the draft state machine and
 * threaded ten props into its children; every one of those is gone because the
 * children read the store directly.
 *
 * The one thing it still does is read `sessionId` to key the composer, which is
 * a rendering concern and belongs here rather than inside the composer itself.
 */
export default function ComposerWorkspace() {
  const sessionId = useSelector(selectComposerSessionId);

  return (
    <div className="flex flex-col gap-5">
      <PostComposer key={sessionId} />
      <DraftsPanel />
      <PublishedPostsPanel />
    </div>
  );
}
