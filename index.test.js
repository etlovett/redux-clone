const {
  createStore,
  combineReducers,
  bindActionCreators,
  compose,
} = require('./index.js');

describe('index', () => {
  describe('createStore', () => {
    it('should return a new Store instance', () => {
      const result1 = createStore(() => {}, null);
      const result2 = createStore(() => {}, null);

      expect(result1).not.toBe(result2);
      expect(result1).toEqual({
        getState: expect.any(Function),
        dispatch: expect.any(Function),
        subscribe: expect.any(Function),
        replaceReducer: expect.any(Function),
      });
    });

    it('should return a Store instance when not provided arguments', () => {
      const result = createStore();

      expect(result).toEqual({
        getState: expect.any(Function),
        dispatch: expect.any(Function),
        subscribe: expect.any(Function),
        replaceReducer: expect.any(Function),
      });
    });

    it('should apply the enhancer before returning the store', () => {
      const enhancer = storeCreator => {
        return (reducer, state) => storeCreator(state => state + 2, state);
      };

      const result = createStore(state => state + 1, 0, enhancer);

      expect(result.getState()).toBe(0);

      result.dispatch();

      expect(result.getState()).toBe(2);
    });

    describe('store objects', () => {
      let store;

      beforeEach(() => {
        const reducer = (state, action) => ({
          ...state,
          ...action,
        });
        const initialState = {
          initial: 'state',
        };

        store = createStore(reducer, initialState);
      });

      describe('initial state', () => {
        it('should return an undefined initial state without initial state', () => {
          expect(createStore().getState()).toBeUndefined();
        });

        it('should return the initial state before any dispatch is run', () => {
          expect(store.getState()).toMatchInlineSnapshot(`
Object {
  "initial": "state",
}
`);
        });
      });

      describe('basic dispatch of actions', () => {
        it('should update the state and return the action', () => {
          const action = {
            newKey: 'new value',
          };

          const result = store.dispatch(action);

          expect(result).toBe(action);
          expect(store.getState()).toMatchInlineSnapshot(`
Object {
  "initial": "state",
  "newKey": "new value",
}
`);
        });
      });

      describe('subscriptions', () => {
        it('should call listeners when dispatch is run, after reducers run', () => {
          const mockListener1 = jest.fn();
          const mockListener2 = jest.fn(() => {
            expect(store.getState()).toMatchInlineSnapshot(`
Object {
  "initial": "state",
  "newKey": "new value",
}
`);
          });
          const action = {
            newKey: 'new value',
          };

          store.subscribe(mockListener1);
          store.subscribe(mockListener2);

          store.dispatch(action);

          expect(mockListener1).toHaveBeenCalledTimes(1);
          expect(mockListener2).toHaveBeenCalledTimes(1);
        });

        it('should not call listeners that have been unsubscribed', () => {
          const mockListener1 = jest.fn();
          const mockListener2 = jest.fn();
          const action = {
            newKey: 'new value',
          };

          store.subscribe(mockListener1);
          const unsubscribe = store.subscribe(mockListener2);

          store.dispatch(action);

          expect(mockListener1).toHaveBeenCalledTimes(1);
          expect(mockListener2).toHaveBeenCalledTimes(1);

          unsubscribe();

          store.dispatch(action);

          expect(mockListener1).toHaveBeenCalledTimes(2);
          expect(mockListener2).toHaveBeenCalledTimes(1);
        });

        it('should not call listeners set up by other listeners', () => {
          const mockInnerListener = jest.fn();
          const mockOuterListener = jest.fn(() => {
            store.subscribe(mockInnerListener);
          });
          const action = {
            newKey: 'new value',
          };

          store.subscribe(mockOuterListener);

          store.dispatch(action);

          expect(mockOuterListener).toHaveBeenCalledTimes(1);
          expect(mockInnerListener).not.toHaveBeenCalled();

          store.dispatch(action);

          expect(mockOuterListener).toHaveBeenCalledTimes(2);
          expect(mockInnerListener).toHaveBeenCalledTimes(1);
        });

        it('should allow dispatch to be called within a listener', () => {
          const mockListener = jest.fn(() => {
            const state = store.getState();
            if (!state.listenerHasRun) {
              store.dispatch({
                listenerHasRun: true,
              });
            }
          });
          const action = {
            newKey: 'new value',
          };

          store.subscribe(mockListener);

          store.dispatch(action);

          expect(mockListener).toHaveBeenCalledTimes(2);
          expect(store.getState()).toMatchInlineSnapshot(`
Object {
  "initial": "state",
  "listenerHasRun": true,
  "newKey": "new value",
}
`);
        });
      });

      describe('replaceReducer', () => {
        it('should use the new reducer for subsequent actions', function() {
          store.replaceReducer(() => 3);

          store.dispatch({});

          expect(store.getState()).toBe(3);
        });
      });
    });
  });

  describe('combineReducers', () => {
    it('should return function that returns empty object when not provided reducers', () => {
      const reducer = combineReducers({});

      expect(reducer).toBeInstanceOf(Function);
      expect(reducer({}, {})).toEqual({});
    });

    it('should return a combined reducer function when provided reducers', () => {
      const mockReducer1 = jest.fn((state, action) => ({
        ...state,
        actionProp: action.prop,
        newState: 'yep',
      }));
      const mockReducer2 = jest.fn((state, action) => ({
        ...state,
        actionProp: action.prop,
        havingState: 'so hot right now',
      }));
      const mockReducer3 = jest.fn((state, action) => null);

      const initialState = {
        mockReducer1: {
          someProp: 1,
        },
        mockReducer2: {
          otherProp: 2,
        },
        mockReducer3: {},
      };
      const action = {
        prop: 'the action prop',
      };

      const reducer = combineReducers({
        mockReducer1,
        mockReducer2,
        mockReducer3,
      });

      expect(reducer).toBeInstanceOf(Function);

      const newState = reducer(initialState, action);

      expect(newState).toMatchInlineSnapshot(`
Object {
  "mockReducer1": Object {
    "actionProp": "the action prop",
    "newState": "yep",
    "someProp": 1,
  },
  "mockReducer2": Object {
    "actionProp": "the action prop",
    "havingState": "so hot right now",
    "otherProp": 2,
  },
  "mockReducer3": null,
}
`);
      expect(mockReducer1).toHaveBeenCalledTimes(1);
      expect(mockReducer1).toHaveBeenCalledWith(
        initialState.mockReducer1,
        action,
      );
      expect(mockReducer2).toHaveBeenCalledTimes(1);
      expect(mockReducer2).toHaveBeenCalledWith(
        initialState.mockReducer2,
        action,
      );
      expect(mockReducer3).toHaveBeenCalledTimes(1);
      expect(mockReducer3).toHaveBeenCalledWith(
        initialState.mockReducer3,
        action,
      );
    });
  });

  describe('bindActionCreators', () => {
    it('should return a non-function, non-object argument unmodified', () => {
      expect(bindActionCreators(null, () => {})).toBe(null);
      expect(bindActionCreators(1, () => {})).toBe(1);
      expect(bindActionCreators('asdf', () => {})).toBe('asdf');
    });

    it('should bind a single action creator', () => {
      const actionCreator = value => ({
        type: 'SOME_ACTION',
        value,
      });
      const mockDispatch = jest.fn(action => action);

      const bindResult = bindActionCreators(actionCreator, mockDispatch);

      expect(bindResult).toBeInstanceOf(Function);
      expect(mockDispatch).not.toHaveBeenCalled();

      const callResult = bindResult('action value');

      expect(callResult).toMatchInlineSnapshot(`
Object {
  "type": "SOME_ACTION",
  "value": "action value",
}
`);
      expect(mockDispatch.mock.calls).toMatchInlineSnapshot(`
Array [
  Array [
    Object {
      "type": "SOME_ACTION",
      "value": "action value",
    },
  ],
]
`);
    });

    it('should return an empty object when passed an empty object', () => {
      const mockDispatch = jest.fn(action => action);

      const bindResult = bindActionCreators({}, mockDispatch);

      expect(bindResult).toEqual({});
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('should bind an object of action creators', () => {
      function createActionCreator(type) {
        return value => ({
          type,
          value,
        });
      }
      const actions = {
        action1: createActionCreator('ACTION_TYPE_1'),
        action2: createActionCreator('ACTION_TYPE_2'),
      };
      const mockDispatch = jest.fn(action => action);

      const bindResult = bindActionCreators(actions, mockDispatch);

      expect(bindResult).toEqual({
        action1: expect.any(Function),
        action2: expect.any(Function),
      });
      expect(mockDispatch).not.toHaveBeenCalled();

      const callResult1 = bindResult.action1('action value');

      expect(callResult1).toMatchInlineSnapshot(`
Object {
  "type": "ACTION_TYPE_1",
  "value": "action value",
}
`);
      expect(mockDispatch.mock.calls).toMatchInlineSnapshot(`
Array [
  Array [
    Object {
      "type": "ACTION_TYPE_1",
      "value": "action value",
    },
  ],
]
`);
      mockDispatch.mockClear();

      const callResult2 = bindResult.action2('action value');

      expect(callResult2).toMatchInlineSnapshot(`
Object {
  "type": "ACTION_TYPE_2",
  "value": "action value",
}
`);
      expect(mockDispatch.mock.calls).toMatchInlineSnapshot(`
Array [
  Array [
    Object {
      "type": "ACTION_TYPE_2",
      "value": "action value",
    },
  ],
]
`);
    });
  });

  describe('compose', () => {
    it('should work when provided no functions', () => {
      const result = compose();

      expect(result).toBeInstanceOf(Function);
      expect(result(1)).toBeUndefined();
    });

    it('should work when provided a single function', () => {
      const func = (a, b, c) => a + b + c;

      const result = compose(func);

      expect(result).toBeInstanceOf(Function);
      expect(result(1, 3, 5)).toBe(9);
    });

    it('should work when provided multiple functions', () => {
      const func1 = (a, b, c) => a + b + c;
      const func2 = a => a * 2;
      const func3 = a => a + 3;

      const result = compose(
        func3,
        func2,
        func1,
      );

      expect(result).toBeInstanceOf(Function);
      expect(result(1, 3, 5)).toBe(21);
    });
  });
});
