/*

createStore(reducer, [preloadedState], [enhancer]) -> Store instance
Store
  getState -> state
  dispatch(action) -> action
  subscribe(listener) -> unsubscribe callback
  replaceReducer(nextReducer)
combineReducers(reducers) -> reducer
bindActionCreators(actionCreatorOrObject, dispatch) -> actionCreatorOrObject
compose(functions) -> function
applyMiddleware

type Reducer<S, A> = (state: S, action: A) => S

*/

const noopEnhancer = storeCreator => storeCreator;
function createStore(initialReducer, initialState, enhancer = noopEnhancer) {
  function innerCreateStore(innerInitialReducer, innerInitialState) {
    let reducer = innerInitialReducer;
    let state = innerInitialState;
    const listeners = new Set();

    return {
      getState() {
        return state;
      },

      dispatch(action) {
        state = reducer(state, action);

        Array.from(listeners).forEach(listener => listener());

        return action;
      },

      subscribe(listener = () => {}) {
        listeners.add(listener);

        return () => {
          listeners.delete(listener);
        };
      },

      replaceReducer(nextReducer = () => {}) {
        reducer = nextReducer;
      },
    };
  }

  return enhancer(innerCreateStore)(initialReducer, initialState);
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

function applyMiddleware(...middlewares) {
  return createStore => {
    return (reducer, state) => {
      const store = createStore(reducer, state);
      if (!middlewares.length) {
        return store;
      }

      const dispatch = middlewares
        .map(middleware =>
          middleware({
            dispatch: store.dispatch,
            getState: store.getState,
          }),
        )
        .reverse()
        .reduce(
          (nextDispatch, middleware) => middleware(nextDispatch),
          store.dispatch,
        );

      return {
        getState: store.getState,
        dispatch,
        subscribe: store.subscribe,
        replaceReducer: store.replaceReducer,
      };
    };
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

function compose(...functions) {
  if (!functions.length) {
    return () => undefined;
  }

  const funcs = functions.reverse();
  return (...args) => {
    // Apply each function in turn, turning the result of each into an arguments for the next.
    const resultArr = funcs.reduce((acc, func) => [func(...acc)], args);
    return resultArr[0];
  };
}

module.exports = {
  createStore,
  combineReducers,
  applyMiddleware,
  bindActionCreators,
  compose,
};
