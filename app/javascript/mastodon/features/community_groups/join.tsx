import { useCallback, useState } from 'react';

import { defineMessages, FormattedMessage, useIntl } from 'react-intl';

import { useHistory } from 'react-router-dom';

import { Helmet } from '@unhead/react/helmet';

import PersonAddIcon from '@/material-icons/400-24px/person_add.svg?react';
import api from 'mastodon/api';
import { Column } from 'mastodon/components/column';
import { ColumnHeader } from 'mastodon/components/column_header';
import { TextAreaField, TextInputField } from 'mastodon/components/form_fields';
import { Icon } from 'mastodon/components/icon';
import { LoadingIndicator } from 'mastodon/components/loading_indicator';

const messages = defineMessages({
  heading: {
    id: 'community_groups.join_by_token',
    defaultMessage: 'Join by share token',
  },
  shareToken: {
    id: 'community_groups.share_token',
    defaultMessage: 'Share token',
  },
  joinMessage: {
    id: 'community_groups.join_message',
    defaultMessage: 'Join request message',
  },
  join: { id: 'community_groups.join', defaultMessage: 'Join' },
  joinHint: {
    id: 'community_groups.join_hint',
    defaultMessage:
      'Paste a group share token. If the group requires approval, your message will be sent with the join request.',
  },
  joinFailed: {
    id: 'community_groups.join_failed',
    defaultMessage: 'Could not join group.',
  },
});

const errorText = (error: unknown) => {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as { response?: { data?: { error?: string } } })
      .response;
    return response?.data?.error;
  }

  return undefined;
};

const CommunityGroupJoin: React.FC<{ multiColumn?: boolean }> = ({
  multiColumn,
}) => {
  const intl = useIntl();
  const history = useHistory();
  const [token, setToken] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  const handleTokenChange = useCallback(
    ({ target: { value } }: React.ChangeEvent<HTMLInputElement>) => {
      setToken(value);
    },
    [],
  );

  const handleMessageChange = useCallback(
    ({ target: { value } }: React.ChangeEvent<HTMLTextAreaElement>) => {
      setMessage(value);
    },
    [],
  );

  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!token.trim() || submitting) {
        return;
      }

      setSubmitting(true);
      setError(undefined);

      void api()
        .post('/api/v1/groups/join_by_token', { token, message })
        .then(() => {
          history.replace('/groups');

          return '';
        })
        .catch((err: unknown) => {
          setError(errorText(err) ?? intl.formatMessage(messages.joinFailed));
        })
        .finally(() => {
          setSubmitting(false);
        });
    },
    [history, intl, message, submitting, token],
  );

  return (
    <Column
      bindToDocument={!multiColumn}
      label={intl.formatMessage(messages.heading)}
    >
      <ColumnHeader
        title={intl.formatMessage(messages.heading)}
        icon='person-add'
        iconComponent={PersonAddIcon}
        multiColumn={multiColumn}
        showBackButton
      />

      <div className='scrollable'>
        <form className='simple_form app-form' onSubmit={handleSubmit}>
          <p className='hint'>{intl.formatMessage(messages.joinHint)}</p>

          {error && <p className='warning-hint'>{error}</p>}

          <div className='fields-group'>
            <TextInputField
              required
              label={intl.formatMessage(messages.shareToken)}
              value={token}
              onChange={handleTokenChange}
              id='community_group_share_token'
            />
          </div>

          <div className='fields-group'>
            <TextAreaField
              label={intl.formatMessage(messages.joinMessage)}
              value={message}
              onChange={handleMessageChange}
              id='community_group_join_message'
              autoSize
            />
          </div>

          <div className='actions'>
            <button
              className='button'
              type='submit'
              disabled={!token.trim() || submitting}
            >
              {submitting ? (
                <LoadingIndicator />
              ) : (
                <>
                  <Icon id='person-add' icon={PersonAddIcon} />{' '}
                  <FormattedMessage
                    id='community_groups.join'
                    defaultMessage='Join'
                  />
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <Helmet>
        <title>{intl.formatMessage(messages.heading)}</title>
        <meta name='robots' content='noindex' />
      </Helmet>
    </Column>
  );
};

// eslint-disable-next-line import/no-default-export
export default CommunityGroupJoin;
