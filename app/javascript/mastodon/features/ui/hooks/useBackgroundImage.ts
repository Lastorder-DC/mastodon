import { useEffect } from 'react';

import { useAccount } from '@/mastodon/hooks/useAccount';
import { useCurrentAccountId } from '@/mastodon/hooks/useAccountId';

export function useBackgroundImage() {
  const accountId = useCurrentAccountId();
  const account = useAccount(accountId);
  const enabled = Boolean(
    account?.background_image_enabled && account.background_image,
  );
  const url = account?.background_image;

  useEffect(() => {
    const { body } = document;
    if (enabled && url) {
      body.style.setProperty(
        '--custom-background-image',
        `url("${CSS.escape(url)}")`,
      );
      body.classList.add('custom-background');
    } else {
      body.style.removeProperty('--custom-background-image');
      body.classList.remove('custom-background');
    }
    return () => {
      body.style.removeProperty('--custom-background-image');
      body.classList.remove('custom-background');
    };
  }, [enabled, url]);
}
