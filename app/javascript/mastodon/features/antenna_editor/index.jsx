import PropTypes from 'prop-types';

import { injectIntl } from 'react-intl';

import ImmutablePropTypes from 'react-immutable-proptypes';
import ImmutablePureComponent from 'react-immutable-pure-component';
import { connect } from 'react-redux';

import spring from 'react-motion/lib/spring';

import { setupAntennaEditor, setupExcludeAntennaEditor, clearAntennaSuggestions, resetAntennaEditor } from '../../actions/antennas';
import Motion from '../ui/util/optional_motion';

import Account from './components/account';
import EditAntennaForm from './components/edit_antenna_form';
import Search from './components/search';

const mapStateToProps = (state) => ({
  accountIds: state.getIn(['antennaEditor', 'accounts', 'items']),
  searchAccountIds: state.getIn(['antennaEditor', 'suggestions', 'items']),
});

const mapDispatchToProps = (dispatch, { isExclude }) => ({
  onInitialize: antennaId => dispatch(isExclude ? setupExcludeAntennaEditor(antennaId) : setupAntennaEditor(antennaId)),
  onClear: () => dispatch(clearAntennaSuggestions()),
  onReset: () => dispatch(resetAntennaEditor()),
});

class AntennaEditor extends ImmutablePureComponent {

  static propTypes = {
    antennaId: PropTypes.string.isRequired,
    isExclude: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    intl: PropTypes.object.isRequired,
    onInitialize: PropTypes.func.isRequired,
    onClear: PropTypes.func.isRequired,
    onReset: PropTypes.func.isRequired,
    accountIds: ImmutablePropTypes.list.isRequired,
    searchAccountIds: ImmutablePropTypes.list.isRequired,
  };

  componentDidMount () {
    const { onInitialize, antennaId } = this.props;
    onInitialize(antennaId);
  }

  componentWillUnmount () {
    const { onReset } = this.props;
    onReset();
  }

  render () {
    const { accountIds, searchAccountIds, onClear, isExclude } = this.props;
    const showSearch = searchAccountIds.size > 0;

    return (
      <div className='modal-root__modal list-editor'>
        <EditAntennaForm />

        <Search />

        <div className='drawer__pager'>
          <div className='drawer__inner list-editor__accounts'>
            {accountIds.map(accountId => <Account key={accountId} accountId={accountId} isExclude={isExclude} added />)}
          </div>

          {showSearch && <div role='button' tabIndex={-1} className='drawer__backdrop' onClick={onClear} />}

          <Motion defaultStyle={{ x: -100 }} style={{ x: spring(showSearch ? 0 : -100, { stiffness: 210, damping: 20 }) }}>
            {({ x }) => (
              <div className='drawer__inner backdrop' style={{ transform: x === 0 ? null : `translateX(${x}%)`, visibility: x === -100 ? 'hidden' : 'visible' }}>
                {searchAccountIds.map(accountId => <Account key={accountId} accountId={accountId} isExclude={isExclude} />)}
              </div>
            )}
          </Motion>
        </div>
      </div>
    );
  }

}

export default connect(mapStateToProps, mapDispatchToProps)(injectIntl(AntennaEditor));
