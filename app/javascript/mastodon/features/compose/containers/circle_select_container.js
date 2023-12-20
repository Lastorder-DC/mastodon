import { connect } from 'react-redux';

import { changeCircle } from '../../../actions/compose';
import CircleSelect from '../components/circle_select';

const mapStateToProps = state => ({
  unavailable: state.getIn(['compose', 'privacy']) !== 'circle' || !!state.getIn(['compose', 'id']),
  circles: state.get('circles'),
  circleId: state.getIn(['compose', 'circle_id']),
});

const mapDispatchToProps = dispatch => ({

  onChange (circleId) {
    dispatch(changeCircle(circleId));
  },

});

export default connect(mapStateToProps, mapDispatchToProps)(CircleSelect);
