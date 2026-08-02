import { useSelector } from 'react-redux';
import { selectComposerSessionId } from '../store/composerSlice';
import PostComposer from '../components/post-composer/PostComposer';

/**
 * What `ComposerWorkspace` used to be, minus the panels that now have their own
 * routes. The `key` behaviour is unchanged: opening a draft bumps `sessionId`,
 * which remounts the composer with that draft as initial state.
 */
export default function ComposePage() {
  const sessionId = useSelector(selectComposerSessionId);

  return <PostComposer key={sessionId} />;
}
