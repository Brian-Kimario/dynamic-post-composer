import { usePostComposer, PUBLISH_STATUS } from '../../hooks/usePostComposer';
import CharacterCounter from './CharacterCounter';
import PlatformSelector from './PlatformSelector';
import PostEditor from './PostEditor';
import PublishButton from './PublishButton';
import PublishSuccessNotice from './PublishSuccessNotice';
import ValidationMessage from './ValidationMessage';

// Stable ids shared between the textarea's aria-describedby and the elements
// that describe it.
const COUNTER_ID = 'post-character-count';
const VALIDATION_ID = 'post-validation-message';

/**
 * The only stateful component in the tree. Everything below it is presentational
 * and receives data through props, which keeps the child components trivially
 * reusable and testable.
 */
export default function PostComposer() {
  const {
    platform,
    content,
    setContent,
    selectPlatform,
    validation,
    publishStatus,
    lastPublishedPost,
    publish,
    dismissSuccessNotice,
  } = usePostComposer();

  const showSuccessNotice = publishStatus === PUBLISH_STATUS.SUCCESS && lastPublishedPost;

  return (
    // Single column on mobile; the platform list becomes a fixed sidebar only
    // once there is room for it.
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[18rem_1fr] lg:items-start">
      <PlatformSelector selectedPlatformId={platform.id} onSelectPlatform={selectPlatform} />

      <section
        aria-label="Post composer"
        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
      >
        <div className="flex flex-col gap-4">
          {showSuccessNotice && (
            <PublishSuccessNotice post={lastPublishedPost} onDismiss={dismissSuccessNotice} />
          )}

          <PostEditor
            platform={platform}
            value={content}
            onChange={setContent}
            validation={validation}
            describedBy={`${COUNTER_ID} ${VALIDATION_ID}`}
          />

          <CharacterCounter id={COUNTER_ID} validation={validation} />

          <ValidationMessage id={VALIDATION_ID} validation={validation} />

          <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row-reverse sm:items-center sm:justify-between">
            <PublishButton
              platform={platform}
              canPublish={validation.isValid}
              publishStatus={publishStatus}
              onPublish={publish}
            />
            <p className="text-xs text-slate-500">
              Publishing is simulated locally — nothing is sent to {platform.name}.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
