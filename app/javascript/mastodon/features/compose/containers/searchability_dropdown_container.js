import { connect } from 'react-redux';

import { changeComposeSearchability } from '../../../actions/compose';
import { openModal, closeModal } from '../../../actions/modal';
import { isUserTouching } from '../../../is_mobile';
import SearchabilityDropdown from '../components/searchability_dropdown';

const mapStateToProps = state => ({
  value: state.getIn(['compose', 'searchability']),
});

const mapDispatchToProps = dispatch => ({

  onChange (value) {
    dispatch(changeComposeSearchability(value));
  },

  isUserTouching,
  onModalOpen: props => dispatch(openModal({
    modalType: 'ACTIONS',
    modalProps: props,
  })),
  onModalClose: () => dispatch(closeModal({
    modalType: undefined,
    ignoreFocus: false,
  })),

});

export default connect(mapStateToProps, mapDispatchToProps)(SearchabilityDropdown);
