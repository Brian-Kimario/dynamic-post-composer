import { useEffect, useRef, useState } from 'react';
import { FilePenLine, X } from 'lucide-react';
import { usePostComposer, PUBLISH_STATUS } from '../../hooks/usePostComposer';
import CharacterCounter from './CharacterCounter';
import PlatformSelector from './PlatformSelector';
import PostEditor from './PostEditor';
import PublishButton from './PublishButton';
import PublishSuccessNotice from './PublishSuccessNotice';
import SaveDraftButton from './SaveDraftButton';
import ValidationMessage from './ValidationMessage';

// Stable ids shared between the textarea's aria-describedby and the elements
// that describe it.
const COUNTER_ID = 'post-character-count';
const VALIDATION_ID = 'post-validation-message';

const SAVED_INDICATOR_MS = 2500;

/**
 * Takes no props. Everything it needs comes from `usePostComposer`, which reads
 * the store and keeps only the post content in local state.
 */
export default function PostComposer() {
  const {
    platform,
    content,
    setContent,
    validation,
    editingDraftId,
    isSavingDraft,
    saveCurrentDraft,
    stopEditing,
    publishStatus,
    lastPublishedPost,
    publish,
    dismissSuccessNotice,
  } = usePostComposer();

  const [justSaved, setJustSaved] = useState(false);
  const savedTimerRef = useRef(null);

  useEffect(() => {
    return () => clearTimeout(savedTimerRef.current);
  }, []);

  const showSuccessNotice = publishStatus === PUBLISH_STATUS.SUCCESS && lastPublishedPost;
  const isEditingDraft = editingDraftId !== null;

  // A draft only needs content — unlike publishing, it is explicitly allowed to
  // be over the platform limit, because that is a normal state for work in
  // progress.
  const canSaveDraft = !validation.isEmpty;

  const handleSaveDraft = async () => {
    const saved = await saveCurrentDraft();
    if (!saved) return;

    setJustSaved(true);
    clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setJustSaved(false), SAVED_INDICATOR_MS);
  };

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[18rem_1fr] lg:items-start">
      <PlatformSelector />

      <section
        aria-label="Post composer"
        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
      >
        <div className="flex flex-col gap-4">
          {isEditingDraft && (
            <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-700">
              <FilePenLine aria-hidden="true" className="size-4 shrink-0 text-slate-500" />
              <p className="flex-1">Editing a saved draft.</p>
              <button
                type="button"
                onClick={stopEditing}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-200 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:outline-none"
              >
                <X aria-hidden="true" className="size-3.5" />
                Stop editing
              </button>
            </div>
          )}

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
            <div className="flex flex-col gap-2 sm:flex-row-reverse sm:items-center">
              <PublishButton
                platform={platform}
                canPublish={validation.isValid}
                publishStatus={publishStatus}
                onPublish={publish}
              />
              <SaveDraftButton
                isEditing={isEditingDraft}
                isSaving={isSavingDraft}
                justSaved={justSaved}
                disabled={!canSaveDraft}
                onSave={handleSaveDraft}
              />
            </div>
            <p className="text-xs text-slate-500">
              Publishing is simulated locally — nothing is sent to {platform.name}.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
