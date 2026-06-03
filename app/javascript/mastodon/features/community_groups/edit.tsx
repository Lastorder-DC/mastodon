import { useCallback, useState } from 'react';

import { defineMessages, FormattedMessage, useIntl } from 'react-intl';

import { useHistory } from 'react-router-dom';

import { Helmet } from '@unhead/react/helmet';

import GroupsIcon from '@/material-icons/400-24px/groups.svg?react';
import api from 'mastodon/api';
import type { ApiCommunityGroupJSON } from 'mastodon/api_types/statuses';
import { Column } from 'mastodon/components/column';
import { ColumnHeader } from 'mastodon/components/column_header';
import {
  TextAreaField,
  TextInputField,
  ToggleField,
} from 'mastodon/components/form_fields';
import { LoadingIndicator } from 'mastodon/components/loading_indicator';

const messages = defineMessages({
  create: {
    id: 'community_groups.create_group',
    defaultMessage: 'Create group',
  },
  displayName: {
    id: 'community_groups.display_name',
    defaultMessage: 'Display name',
  },
  description: {
    id: 'community_groups.description',
    defaultMessage: 'Description',
  },
  locked: {
    id: 'community_groups.locked',
    defaultMessage: 'Require approval to join',
  },
  discoverable: {
    id: 'community_groups.discoverable',
    defaultMessage: 'Show this group in discovery surfaces',
  },
  createHint: {
    id: 'community_groups.create_hint',
    defaultMessage:
      'Set up a local group. You can invite members and manage the share token after it is created.',
  },
  createFailed: {
    id: 'community_groups.create_failed',
    defaultMessage: 'Could not create group.',
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

const CommunityGroupEdit: React.FC<{ multiColumn?: boolean }> = ({
  multiColumn,
}) => {
  const intl = useIntl();
  const history = useHistory();
  const [displayName, setDisplayName] = useState('');
  const [note, setNote] = useState('');
  const [locked, setLocked] = useState(false);
  const [discoverable, setDiscoverable] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  const handleDisplayNameChange = useCallback(
    ({ target: { value } }: React.ChangeEvent<HTMLInputElement>) => {
      setDisplayName(value);
    },
    [],
  );

  const handleNoteChange = useCallback(
    ({ target: { value } }: React.ChangeEvent<HTMLTextAreaElement>) => {
      setNote(value);
    },
    [],
  );

  const handleLockedChange = useCallback(
    ({ target: { checked } }: React.ChangeEvent<HTMLInputElement>) => {
      setLocked(checked);
    },
    [],
  );

  const handleDiscoverableChange = useCallback(
    ({ target: { checked } }: React.ChangeEvent<HTMLInputElement>) => {
      setDiscoverable(checked);
    },
    [],
  );

  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!displayName.trim() || submitting) {
        return;
      }

      setSubmitting(true);
      setError(undefined);

      void api()
        .post<ApiCommunityGroupJSON>('/api/v1/groups', {
          display_name: displayName,
          note,
          locked,
          discoverable,
        })
        .then(({ data }) => {
          history.replace(`/groups/${data.id}`);

          return '';
        })
        .catch((err: unknown) => {
          setError(errorText(err) ?? intl.formatMessage(messages.createFailed));
        })
        .finally(() => {
          setSubmitting(false);
        });
    },
    [discoverable, displayName, history, intl, locked, note, submitting],
  );

  return (
    <Column
      bindToDocument={!multiColumn}
      label={intl.formatMessage(messages.create)}
    >
      <ColumnHeader
        title={intl.formatMessage(messages.create)}
        icon='groups'
        iconComponent={GroupsIcon}
        multiColumn={multiColumn}
        showBackButton
      />

      <div className='scrollable'>
        <form className='simple_form app-form' onSubmit={handleSubmit}>
          <p className='hint'>{intl.formatMessage(messages.createHint)}</p>

          {error && <p className='warning-hint'>{error}</p>}

          <div className='fields-group'>
            <TextInputField
              required
              maxLength={100}
              label={intl.formatMessage(messages.displayName)}
              value={displayName}
              onChange={handleDisplayNameChange}
              id='community_group_display_name'
            />
          </div>

          <div className='fields-group'>
            <TextAreaField
              maxLength={500}
              label={intl.formatMessage(messages.description)}
              value={note}
              onChange={handleNoteChange}
              id='community_group_note'
              autoSize
            />
          </div>

          <div className='fields-group'>
            <ToggleField
              label={intl.formatMessage(messages.locked)}
              checked={locked}
              onChange={handleLockedChange}
              id='community_group_locked'
            />
          </div>

          <div className='fields-group'>
            <ToggleField
              label={intl.formatMessage(messages.discoverable)}
              checked={discoverable}
              onChange={handleDiscoverableChange}
              id='community_group_discoverable'
            />
          </div>

          <div className='actions'>
            <button
              className='button'
              type='submit'
              disabled={!displayName.trim() || submitting}
            >
              {submitting ? (
                <LoadingIndicator />
              ) : (
                <FormattedMessage
                  id='community_groups.create_group'
                  defaultMessage='Create group'
                />
              )}
            </button>
          </div>
        </form>
      </div>

      <Helmet>
        <title>{intl.formatMessage(messages.create)}</title>
        <meta name='robots' content='noindex' />
      </Helmet>
    </Column>
  );
};

// eslint-disable-next-line import/no-default-export
export default CommunityGroupEdit;
