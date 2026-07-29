import type { FC } from 'react';

import { defineMessage, useIntl } from 'react-intl';

import LockIcon from '@/material-icons/400-24px/lock.svg?react';

import { Icon } from '../icon';

import type { DisplayNameProps } from './index';

const protectedAccountMessage = defineMessage({
  id: 'account.protected_info',
  defaultMessage:
    'This is a protected account. Only approved local followers can see its posts.',
});

export const AccountProtectionIcon: FC<
  Pick<DisplayNameProps, 'account'>
> = ({ account }) => {
  const intl = useIntl();

  if (!account?.protected_account) {
    return null;
  }

  return (
    <Icon
      id='lock'
      icon={LockIcon}
      className='display-name__protected-icon'
      aria-label={intl.formatMessage(protectedAccountMessage)}
    />
  );
};
