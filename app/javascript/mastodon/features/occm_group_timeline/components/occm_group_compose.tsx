import { useCallback, useState } from 'react';

import { defineMessages, useIntl } from 'react-intl';

import { apiRequestPost } from 'mastodon/api';
import { useAppDispatch } from 'mastodon/store';

import { expandOccmGroupTimeline } from '../../../actions/timelines';

const messages = defineMessages({
  placeholder: {
    id: 'occm_groups.compose_placeholder',
    defaultMessage: 'Write something to the group...',
  },
  post: { id: 'occm_groups.compose_post', defaultMessage: 'Post' },
});

export const OccmGroupCompose: React.FC<{ groupId: string }> = ({
  groupId,
}) => {
  const intl = useIntl();
  const dispatch = useAppDispatch();
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setText(e.target.value);
    },
    [],
  );

  const handleSubmit = useCallback(() => {
    if (text.trim().length === 0 || submitting) return;

    setSubmitting(true);

    apiRequestPost(`v1/occm_groups/${groupId}/statuses`, { status: text })
      .then(() => {
        setText('');
        void dispatch(expandOccmGroupTimeline(groupId));
        return '';
      })
      .catch(() => {
        // silently handle error
      })
      .finally(() => {
        setSubmitting(false);
      });
  }, [text, submitting, groupId, dispatch]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  return (
    <div className='compose-form' style={{ padding: '15px' }}>
      <textarea
        className='compose-form__textarea'
        placeholder={intl.formatMessage(messages.placeholder)}
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        disabled={submitting}
        rows={3}
      />
      <div className='compose-form__actions' style={{ marginTop: '10px' }}>
        <button
          type='button'
          className='button'
          onClick={handleSubmit}
          disabled={text.trim().length === 0 || submitting}
        >
          {intl.formatMessage(messages.post)}
        </button>
      </div>
    </div>
  );
};
