import { useAccount } from '@/mastodon/hooks/useAccount';
import { WordmarkLogo } from 'mastodon/components/logo';
import { autoPlayGif, me } from 'mastodon/initial_state';

export const NavigationLogo: React.FC = () => {
  const account = useAccount(me);
  const useCustom = account?.custom_logo_enabled && !!account.custom_logo;

  if (useCustom) {
    return (
      <img
        src={
          autoPlayGif
            ? account.custom_logo
            : (account.custom_logo_static ?? undefined)
        }
        alt={account.custom_logo_description || 'Mastodon'}
        className='logo logo--custom'
      />
    );
  }

  return <WordmarkLogo />;
};
