/*

createStore(reducer, [preloadedState], [enhancer]) -> Store instance
Store
  getState -> state
  dispatch(action) -> action
  subscribe(listener) -> unsubscribe callback
  replaceReducer(nextReducer)
combineReducers(reducers) -> reducer
bindActionCreators(actionCreatorOrObject, dispatch) -> actionCreatorOrObject

compose
applyMiddleware

type Reducer<S, A> = (state: S, action: A) => S

*/

class Store {
  constructor(reducer = () => {}, initialState) {
    this.reducer = reducer;
    this.state = initialState;
    this.listeners = new Set();
  }

  getState() {
    return this.state;
  }

  dispatch(action) {
    this.state = this.reducer(this.state, action);

    Array.from(this.listeners).forEach(listener => listener());

    return action;
  }

  subscribe(listener = () => {}) {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  replaceReducer(nextReducer = () => {}) {
    this.reducer = nextReducer;
  }
}

function createStore(reducer, initialState) {
  return new Store(reducer, initialState);
}

function combineReducers(reducers = {}) {
  return (state, action) => {
    // Run each provided reducer with the action and its subset of the overall state, aggregating
    // the results into the new overall state.
    return Object.entries(reducers).reduce((acc, [reducerName, reducer]) => {
      return {
        ...acc,
        [reducerName]: reducer(state[reducerName], action),
      };
    }, state);
  };
}

function bindActionCreators(actionCreatorOrObject, dispatch) {
  if (actionCreatorOrObject instanceof Function) {
    return (...args) => {
      return dispatch(actionCreatorOrObject(...args));
    };
  } else if (actionCreatorOrObject instanceof Object) {
    // Return a new object that has a bound version of every property on the provided object.
    return Object.entries(actionCreatorOrObject).reduce(
      (acc, [key, val]) => ({
        ...acc,
        [key]: bindActionCreators(val, dispatch),
      }),
      {},
    );
  } else {
    return actionCreatorOrObject;
  }
}

module.exports = {
  createStore,
  combineReducers,
  bindActionCreators,
};
