import type { ApiAccountJSON } from './accounts';

export interface ApiOccmGroupJSON {
  id: string;
  title: string;
  description: string;
  approval_required: boolean;
  member_count: number;
  role: 'admin' | 'moderator' | 'user' | null;
  membership_state: 'pending' | 'active' | 'rejected' | null;
  created_at: string;
}

export interface ApiOccmGroupMembershipJSON {
  id: string;
  account: ApiAccountJSON;
  role: 'admin' | 'moderator' | 'user';
  state: 'pending' | 'active' | 'rejected';
  created_at: string;
}

export interface ApiOccmGroupReportJSON {
  id: string;
  occm_group_id: string;
  account: ApiAccountJSON;
  target_account: ApiAccountJSON;
  status_ids: string[];
  comment: string;
  category: 'other' | 'spam' | 'harassment' | 'off_topic' | 'rule_violation';
  action_taken_at: string | null;
  action_taken_by_account: ApiAccountJSON | null;
  created_at: string;
}
