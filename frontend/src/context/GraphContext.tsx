import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { Graph, GraphStats, BFSProgress, UserNode, FollowListResult } from '../types/graph';

// Each depth level has its own follow list and selected users
interface DepthLayer {
  list: FollowListResult;
  selectedUsers: string[];
}

interface GraphState {
  graph: Graph | null;
  stats: GraphStats | null;
  isLoading: boolean;
  progress: BFSProgress | null;
  error: string | null;
  selectedNode: UserNode | null;
  activeTab: 'graph' | 'chart';
  mutualEdges: { source: string; target: string }[] | null;
  // Multi-depth user selection
  centerUser: string;
  depthLayers: Record<number, DepthLayer>; // depth -> layer
  currentDepth: number; // which depth layer is being viewed
  isFetchingList: boolean;
}

type GraphAction =
  | { type: 'SET_GRAPH'; payload: Graph }
  | { type: 'SET_STATS'; payload: GraphStats }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_PROGRESS'; payload: BFSProgress | null }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_SELECTED_NODE'; payload: UserNode | null }
  | { type: 'SET_ACTIVE_TAB'; payload: 'graph' | 'chart' }
  | { type: 'SET_MUTUAL_EDGES'; payload: { source: string; target: string }[] | null }
  | { type: 'SET_DEPTH_LAYER'; payload: { depth: number; list: FollowListResult } }
  | { type: 'SET_CENTER_USER'; payload: string }
  | { type: 'SET_CURRENT_DEPTH'; payload: number }
  | { type: 'TOGGLE_USER'; payload: { depth: number; login: string } }
  | { type: 'SET_SELECTED_USERS'; payload: { depth: number; users: string[] } }
  | { type: 'SET_FETCHING_LIST'; payload: boolean }
  | { type: 'RESET' };

const initialState: GraphState = {
  graph: null,
  stats: null,
  isLoading: false,
  progress: null,
  error: null,
  selectedNode: null,
  activeTab: 'graph',
  mutualEdges: null,
  centerUser: '',
  depthLayers: {},
  currentDepth: 1,
  isFetchingList: false,
};

function graphReducer(state: GraphState, action: GraphAction): GraphState {
  switch (action.type) {
    case 'SET_GRAPH':
      return { ...state, graph: action.payload, error: null };
    case 'SET_STATS':
      return { ...state, stats: action.payload };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_PROGRESS':
      return { ...state, progress: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    case 'SET_SELECTED_NODE':
      return { ...state, selectedNode: action.payload };
    case 'SET_ACTIVE_TAB':
      return { ...state, activeTab: action.payload };
    case 'SET_MUTUAL_EDGES':
      return { ...state, mutualEdges: action.payload };
    case 'SET_CENTER_USER':
      return { ...state, centerUser: action.payload, depthLayers: {}, currentDepth: 1 };
    case 'SET_DEPTH_LAYER': {
      const { depth, list } = action.payload;
      return {
        ...state,
        depthLayers: {
          ...state.depthLayers,
          [depth]: { list, selectedUsers: [] },
        },
        currentDepth: depth,
      };
    }
    case 'SET_CURRENT_DEPTH':
      return { ...state, currentDepth: action.payload };
    case 'TOGGLE_USER': {
      const { depth, login } = action.payload;
      const layer = state.depthLayers[depth];
      if (!layer) return state;
      const idx = layer.selectedUsers.indexOf(login);
      const newSelected = idx >= 0
        ? layer.selectedUsers.filter((u) => u !== login)
        : [...layer.selectedUsers, login];
      return {
        ...state,
        depthLayers: {
          ...state.depthLayers,
          [depth]: { ...layer, selectedUsers: newSelected },
        },
      };
    }
    case 'SET_SELECTED_USERS': {
      const { depth, users } = action.payload;
      const layer = state.depthLayers[depth];
      if (!layer) return state;
      return {
        ...state,
        depthLayers: {
          ...state.depthLayers,
          [depth]: { ...layer, selectedUsers: users },
        },
      };
    }
    case 'SET_FETCHING_LIST':
      return { ...state, isFetchingList: action.payload };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

const GraphContext = createContext<{
  state: GraphState;
  dispatch: React.Dispatch<GraphAction>;
} | null>(null);

export function GraphProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(graphReducer, initialState);
  return (
    <GraphContext.Provider value={{ state, dispatch }}>
      {children}
    </GraphContext.Provider>
  );
}

export function useGraphContext() {
  const context = useContext(GraphContext);
  if (!context) {
    throw new Error('useGraphContext must be used within a GraphProvider');
  }
  return context;
}
