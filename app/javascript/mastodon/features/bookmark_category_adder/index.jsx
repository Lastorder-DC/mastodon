import PropTypes from 'prop-types';

import { injectIntl } from 'react-intl';

import ImmutablePropTypes from 'react-immutable-proptypes';
import ImmutablePureComponent from 'react-immutable-pure-component';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';

import { setupBookmarkCategoryAdder, resetBookmarkCategoryAdder } from '../../actions/bookmark_categories';
import NewBookmarkCategoryForm from '../bookmark_categories/components/new_bookmark_category_form';

// import Account from './components/account';
import BookmarkCategory from './components/bookmark_category';

const getOrderedBookmarkCategories = createSelector([state => state.get('bookmark_categories')], bookmarkCategories => {
  if (!bookmarkCategories) {
    return bookmarkCategories;
  }

  return bookmarkCategories.toList().filter(item => !!item).sort((a, b) => a.get('title').localeCompare(b.get('title')));
});

const mapStateToProps = state => ({
  bookmarkCategoryIds: getOrderedBookmarkCategories(state).map(bookmarkCategory=>bookmarkCategory.get('id')),
});

const mapDispatchToProps = dispatch => ({
  onInitialize: statusId => dispatch(setupBookmarkCategoryAdder(statusId)),
  onReset: () => dispatch(resetBookmarkCategoryAdder()),
});

class BookmarkCategoryAdder extends ImmutablePureComponent {

  static propTypes = {
    statusId: PropTypes.string.isRequired,
    onClose: PropTypes.func.isRequired,
    intl: PropTypes.object.isRequired,
    onInitialize: PropTypes.func.isRequired,
    onReset: PropTypes.func.isRequired,
    bookmarkCategoryIds: ImmutablePropTypes.list.isRequired,
  };

  componentDidMount () {
    const { onInitialize, statusId } = this.props;
    onInitialize(statusId);
  }

  componentWillUnmount () {
    const { onReset } = this.props;
    onReset();
  }

  render () {
    const { bookmarkCategoryIds } = this.props;

    return (
      <div className='modal-root__modal list-adder'>
        {/*
        <div className='list-adder__account'>
          <Account accountId={accountId} />
        </div>
        */}

        <NewBookmarkCategoryForm />


        <div className='list-adder__lists'>
          {bookmarkCategoryIds.map(BookmarkCategoryId => <BookmarkCategory key={BookmarkCategoryId} bookmarkCategoryId={BookmarkCategoryId} />)}
        </div>
      </div>
    );
  }

}

export default connect(mapStateToProps, mapDispatchToProps)(injectIntl(BookmarkCategoryAdder));
