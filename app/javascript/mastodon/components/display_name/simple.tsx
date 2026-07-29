import type { ComponentPropsWithoutRef, FC } from 'react';

import { EmojiHTML } from '../emoji/html';

import type { DisplayNameProps } from './index';
import { AccountProtectionIcon } from './protection_icon';

export const DisplayNameSimple: FC<
  Omit<DisplayNameProps, 'variant'> & ComponentPropsWithoutRef<'span'>
> = ({ account, localDomain: _, ...props }) => {
  if (!account) {
    return null;
  }

  return (
    <bdi>
      <EmojiHTML
        {...props}
        as='span'
        htmlString={account.display_name_html}
        extraEmojis={account.emojis}
      />
      <AccountProtectionIcon account={account} />
    </bdi>
  );
};
