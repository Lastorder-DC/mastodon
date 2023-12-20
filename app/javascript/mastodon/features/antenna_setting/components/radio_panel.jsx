import PropTypes from 'prop-types';
import { PureComponent } from 'react';

import { injectIntl } from 'react-intl';

import classNames from 'classnames';


import ImmutablePropTypes from 'react-immutable-proptypes';
import { connect } from 'react-redux';

class RadioPanel extends PureComponent {

  static propTypes = {
    values: ImmutablePropTypes.list.isRequired,
    value: PropTypes.object.isRequired,
    intl: PropTypes.object.isRequired,
    onChange: PropTypes.func.isRequired,
  };

  handleChange = e => {
    const value = e.currentTarget.getAttribute('data-value');

    if (value !== this.props.value.get('value')) {
      this.props.onChange(value);
    }
  };

  render () {
    const { values, value } = this.props;

    return (
      <div className='setting-radio-panel'>
        {values.map((val) => (
          <button className={classNames('setting-radio-panel__item', {'setting-radio-panel__item__active': value.get('value') === val.get('value')})}
            key={val.get('value')} onClick={this.handleChange} data-value={val.get('value')}>
            {val.get('label')}
          </button>
        ))}
      </div>
    );
  }

}

export default connect()(injectIntl(RadioPanel));
