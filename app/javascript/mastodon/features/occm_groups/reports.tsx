import { useEffect, useState, useCallback } from 'react';

import { defineMessages, useIntl, FormattedMessage } from 'react-intl';

import { useParams } from 'react-router-dom';

import { Helmet } from '@unhead/react/helmet';

import GroupsIcon from '@/material-icons/400-24px/groups.svg?react';
import {
  apiGetOccmGroupReports,
  apiResolveOccmGroupReport,
} from 'mastodon/api/occm_groups';
import type { ApiOccmGroupReportJSON } from 'mastodon/api_types/occm_groups';
import { Column } from 'mastodon/components/column';
import { ColumnHeader } from 'mastodon/components/column_header';
import { LoadingIndicator } from 'mastodon/components/loading_indicator';
import ScrollableList from 'mastodon/components/scrollable_list';

const messages = defineMessages({
  heading: { id: 'occm_groups.reports', defaultMessage: 'Reports' },
});

const ReportItem: React.FC<{
  report: ApiOccmGroupReportJSON;
  groupId: string;
  onResolved: (reportId: string) => void;
}> = ({ report, groupId, onResolved }) => {
  const handleResolve = useCallback(() => {
    void apiResolveOccmGroupReport(groupId, report.id).then(() => {
      onResolved(report.id);
      return '';
    });
  }, [groupId, report.id, onResolved]);

  return (
    <div className='account__wrapper'>
      <div className='account'>
        <div className='account__display-name'>
          <div>
            <strong>
              <FormattedMessage
                id='occm_groups.report_from'
                defaultMessage='Report from {name}'
                values={{
                  name: report.account.display_name || report.account.username,
                }}
              />
            </strong>
          </div>
          <div>
            <span>
              Target:{' '}
              {report.target_account.display_name ||
                report.target_account.username}
            </span>
          </div>
          <div>
            <span>Category: {report.category}</span>
          </div>
          {report.comment && (
            <div>
              <span>Comment: {report.comment}</span>
            </div>
          )}
        </div>
      </div>
      {!report.action_taken_at && (
        <div className='account__relationship'>
          <button type='button' className='button' onClick={handleResolve}>
            <FormattedMessage
              id='occm_groups.resolve_report'
              defaultMessage='Resolve'
            />
          </button>
        </div>
      )}
    </div>
  );
};

const OccmGroupReports: React.FC<{
  multiColumn?: boolean;
}> = ({ multiColumn }) => {
  const intl = useIntl();
  const { id } = useParams<{ id: string }>();

  const [activeTab, setActiveTab] = useState<'open' | 'resolved'>('open');
  const [reports, setReports] = useState<ApiOccmGroupReportJSON[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void apiGetOccmGroupReports(id).then((data) => {
      setReports(data);
      setLoading(false);
      return '';
    });
  }, [id]);

  const handleOpenTab = useCallback(() => {
    setActiveTab('open');
  }, []);
  const handleResolvedTab = useCallback(() => {
    setActiveTab('resolved');
  }, []);

  const handleResolved = useCallback((reportId: string) => {
    setReports((prev) =>
      prev.map((r) =>
        r.id === reportId
          ? { ...r, action_taken_at: new Date().toISOString() }
          : r,
      ),
    );
  }, []);

  const openReports = reports.filter((r) => !r.action_taken_at);
  const resolvedReports = reports.filter((r) => !!r.action_taken_at);
  const displayedReports = activeTab === 'open' ? openReports : resolvedReports;

  return (
    <Column
      bindToDocument={!multiColumn}
      label={intl.formatMessage(messages.heading)}
    >
      <ColumnHeader
        title={intl.formatMessage(messages.heading)}
        icon='groups'
        iconComponent={GroupsIcon}
        multiColumn={multiColumn}
        showBackButton
      />

      <div className='column-header__collapsible'>
        <div className='column-header__button-group'>
          <button
            type='button'
            className={`column-header__button ${activeTab === 'open' ? 'active' : ''}`}
            onClick={handleOpenTab}
          >
            Open
          </button>
          <button
            type='button'
            className={`column-header__button ${activeTab === 'resolved' ? 'active' : ''}`}
            onClick={handleResolvedTab}
          >
            Resolved
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingIndicator />
      ) : (
        <ScrollableList
          scrollKey='occm_group_reports'
          emptyMessage={
            <FormattedMessage
              id='occm_groups.no_reports'
              defaultMessage='No reports.'
            />
          }
          bindToDocument={!multiColumn}
        >
          {displayedReports.map((report) => (
            <ReportItem
              key={report.id}
              report={report}
              groupId={id}
              onResolved={handleResolved}
            />
          ))}
        </ScrollableList>
      )}

      <Helmet>
        <title>{intl.formatMessage(messages.heading)}</title>
        <meta name='robots' content='noindex' />
      </Helmet>
    </Column>
  );
};

// eslint-disable-next-line import/no-default-export
export default OccmGroupReports;
