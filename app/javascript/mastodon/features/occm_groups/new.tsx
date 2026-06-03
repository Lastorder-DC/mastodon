import { useCallback, useState, useEffect } from 'react';

import { defineMessages, useIntl, FormattedMessage } from 'react-intl';

import { useParams, useHistory } from 'react-router-dom';

import { Helmet } from '@unhead/react/helmet';

import GroupsIcon from '@/material-icons/400-24px/groups.svg?react';
import {
  fetchOccmGroup,
  createOccmGroup,
  updateOccmGroup,
} from 'mastodon/actions/occm_groups';
import { Column } from 'mastodon/components/column';
import { ColumnHeader } from 'mastodon/components/column_header';
import { TextInputField, Toggle } from 'mastodon/components/form_fields';
import { LoadingIndicator } from 'mastodon/components/loading_indicator';
import { useAppDispatch, useAppSelector } from 'mastodon/store';

const messages = defineMessages({
  edit: { id: 'occm_groups.edit', defaultMessage: 'Edit group' },
  create: { id: 'occm_groups.create', defaultMessage: 'Create group' },
});

const OccmGroupForm: React.FC<{
  id?: string;
  initialTitle?: string;
  initialDescription?: string;
  initialApprovalRequired?: boolean;
}> = ({
  id,
  initialTitle = '',
  initialDescription = '',
  initialApprovalRequired = false,
}) => {
  const dispatch = useAppDispatch();
  const history = useHistory();

  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [approvalRequired, setApprovalRequired] = useState(
    initialApprovalRequired,
  );
  const [submitting, setSubmitting] = useState(false);

  const handleTitleChange = useCallback(
    ({ target: { value } }: React.ChangeEvent<HTMLInputElement>) => {
      setTitle(value);
    },
    [],
  );

  const handleDescriptionChange = useCallback(
    ({ target: { value } }: React.ChangeEvent<HTMLTextAreaElement>) => {
      setDescription(value);
    },
    [],
  );

  const handleApprovalRequiredChange = useCallback(
    ({ target: { checked } }: React.ChangeEvent<HTMLInputElement>) => {
      setApprovalRequired(checked);
    },
    [],
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setSubmitting(true);

      if (id) {
        void dispatch(
          updateOccmGroup(id, {
            title,
            description,
            approval_required: approvalRequired,
          }),
        ).then(() => {
          setSubmitting(false);
          return '';
        });
      } else {
        void dispatch(
          createOccmGroup({
            title,
            description,
            approval_required: approvalRequired,
          }),
        ).then((data) => {
          setSubmitting(false);
          history.push(`/groups/${data.id}`);
          return '';
        });
      }
    },
    [dispatch, history, id, title, description, approvalRequired],
  );

  return (
    <form className='simple_form app-form' onSubmit={handleSubmit}>
      <div className='fields-group'>
        <TextInputField
          required
          maxLength={100}
          label={
            <FormattedMessage
              id='occm_groups.group_title'
              defaultMessage='Group name'
            />
          }
          value={title}
          onChange={handleTitleChange}
          id='occm_group_title'
        />
      </div>

      <div className='fields-group'>
        <div className='input with_label'>
          <div className='label_input'>
            <label htmlFor='occm_group_description'>
              <FormattedMessage
                id='occm_groups.description'
                defaultMessage='Description'
              />
            </label>
            <div className='label_input__wrapper'>
              <textarea
                id='occm_group_description'
                className='text'
                value={description}
                onChange={handleDescriptionChange}
                maxLength={500}
                rows={4}
              />
            </div>
          </div>
        </div>
      </div>

      <div className='fields-group'>
        {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
        <label className='app-form__toggle'>
          <div className='app-form__toggle__label'>
            <strong>
              <FormattedMessage
                id='occm_groups.approval_required'
                defaultMessage='Require approval to join'
              />
            </strong>
          </div>

          <div className='app-form__toggle__toggle'>
            <div>
              <Toggle
                checked={approvalRequired}
                onChange={handleApprovalRequiredChange}
              />
            </div>
          </div>
        </label>
      </div>

      <div className='actions'>
        <button className='button' type='submit' disabled={submitting}>
          {submitting ? (
            <LoadingIndicator />
          ) : id ? (
            <FormattedMessage id='lists.save' defaultMessage='Save' />
          ) : (
            <FormattedMessage id='lists.create' defaultMessage='Create' />
          )}
        </button>
      </div>
    </form>
  );
};

const OccmGroupNew: React.FC<{
  multiColumn?: boolean;
}> = ({ multiColumn }) => {
  const intl = useIntl();
  const dispatch = useAppDispatch();
  const { id } = useParams<{ id?: string }>();
  const group = useAppSelector((state) =>
    id ? state.occm_groups.get(id) : undefined,
  );

  useEffect(() => {
    if (id) {
      void dispatch(fetchOccmGroup(id));
    }
  }, [dispatch, id]);

  const isLoading = id && !group;

  return (
    <Column
      bindToDocument={!multiColumn}
      label={intl.formatMessage(id ? messages.edit : messages.create)}
    >
      <ColumnHeader
        title={intl.formatMessage(id ? messages.edit : messages.create)}
        icon='groups'
        iconComponent={GroupsIcon}
        multiColumn={multiColumn}
        showBackButton
      />

      <div className='scrollable'>
        {isLoading ? (
          <LoadingIndicator />
        ) : (
          <OccmGroupForm
            id={id}
            initialTitle={(group?.get('title') ?? '') as string}
            initialDescription={(group?.get('description') ?? '') as string}
            initialApprovalRequired={
              (group?.get('approval_required') ?? false) as boolean
            }
          />
        )}
      </div>

      <Helmet>
        <title>
          {intl.formatMessage(id ? messages.edit : messages.create)}
        </title>
        <meta name='robots' content='noindex' />
      </Helmet>
    </Column>
  );
};

// eslint-disable-next-line import/no-default-export
export default OccmGroupNew;
