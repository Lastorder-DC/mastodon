import PropTypes from 'prop-types';

import { injectIntl } from 'react-intl';

import ImmutablePropTypes from 'react-immutable-proptypes';
import ImmutablePureComponent from 'react-immutable-pure-component';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';

import { setupAntennaAdder, resetAntennaAdder, setupExcludeAntennaAdder } from '../../actions/antennas';
import NewAntennaForm from '../antennas/components/new_antenna_form';
import Account from '../list_adder/components/account';

import Antenna from './components/antenna';
// hack

const getOrderedAntennas = createSelector([state => state.get('antennas')], antennas => {
  if (!antennas) {
    return antennas;
  }

  return antennas.toList().filter(item => !!item).sort((a, b) => a.get('title').localeCompare(b.get('title')));
});

const mapStateToProps = state => ({
  antennaIds: getOrderedAntennas(state).map(antenna=>antenna.get('id')),
});

const mapDispatchToProps = dispatch => ({
  onInitialize: accountId => dispatch(setupAntennaAdder(accountId)),
  onExcludeInitialize: accountId => dispatch(setupExcludeAntennaAdder(accountId)),
  onReset: () => dispatch(resetAntennaAdder()),
});

class AntennaAdder extends ImmutablePureComponent {

  static propTypes = {
    accountId: PropTypes.string.isRequired,
    isExclude: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    intl: PropTypes.object.isRequired,
    onInitialize: PropTypes.func.isRequired,
    onExcludeInitialize: PropTypes.func.isRequired,
    onReset: PropTypes.func.isRequired,
    antennaIds: ImmutablePropTypes.list.isRequired,
  };

  componentDidMount () {
    const { isExclude, onInitialize, onExcludeInitialize, accountId } = this.props;
    if (isExclude) {
      onExcludeInitialize(accountId);
    } else {
      onInitialize(accountId);
    }
  }

  componentWillUnmount () {
    const { onReset } = this.props;
    onReset();
  }

  render () {
    const { accountId, antennaIds, isExclude } = this.props;

    return (
      <div className='modal-root__modal list-adder'>
        <div className='list-adder__account'>
          <Account accountId={accountId} />
        </div>

        <NewAntennaForm />


        <div className='list-adder__lists'>
          {antennaIds.map(antennaId => <Antenna key={antennaId} antennaId={antennaId} isExclude={isExclude} />)}
        </div>
      </div>
    );
  }

}

export default connect(mapStateToProps, mapDispatchToProps)(injectIntl(AntennaAdder));
