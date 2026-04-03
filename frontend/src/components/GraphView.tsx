import React, { useRef, useCallback } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import cytoscape from 'cytoscape';
import coseBilkent from 'cytoscape-cose-bilkent';
import { useGraphContext } from '../context/GraphContext';
import { UserNode } from '../types/graph';
import { UserCard } from './UserCard';
import { Network } from 'lucide-react';

cytoscape.use(coseBilkent);

const DEPTH_COLORS: Record<number, string> = {
  0: '#4a90d9',
  1: '#7c6dd8',
  2: '#e0a030',
  3: '#e05252',
};

function nodeSize(followers: number): number {
  const min = 30;
  const max = 80;
  const clamped = Math.min(Math.max(followers, 0), 10000);
  return min + (max - min) * (Math.log(clamped + 1) / Math.log(10001));
}

export function GraphView() {
  const { state, dispatch } = useGraphContext();
  const cyRef = useRef<cytoscape.Core | null>(null);

  const graph = state.graph;
  const mutualEdgeSet = new Set(
    (state.mutualEdges || []).map((e) => `${e.source}->${e.target}`)
  );

  const handleCyReady = useCallback(
    (cy: cytoscape.Core) => {
      cyRef.current = cy;
      cy.on('tap', 'node', (evt) => {
        const tapped = evt.target;
        const nodeData = tapped.data();
        const node: UserNode = {
          login: nodeData.login,
          id: nodeData.userId,
          avatarUrl: nodeData.avatarUrl,
          name: nodeData.name,
          bio: nodeData.bio,
          company: nodeData.company,
          location: nodeData.location,
          followers: nodeData.followers,
          following: nodeData.following,
          depth: nodeData.depth,
        };
        dispatch({ type: 'SET_SELECTED_NODE', payload: node });

        // Highlight connected edges and neighbor nodes
        cy.elements().removeClass('highlighted dimmed');
        const neighborhood = tapped.neighborhood().add(tapped);
        neighborhood.addClass('highlighted');
        cy.elements().not(neighborhood).addClass('dimmed');
      });
      cy.on('tap', (evt) => {
        if (evt.target === cy) {
          dispatch({ type: 'SET_SELECTED_NODE', payload: null });
          cy.elements().removeClass('highlighted dimmed');
        }
      });
    },
    [dispatch]
  );

  if (!graph) {
    return (
      <div style={styles.empty}>
        <Network size={48} style={{ color: '#c0cfe0' }} />
        <div style={styles.emptyText}>Explore a user to see their network graph</div>
      </div>
    );
  }

  const elements: cytoscape.ElementDefinition[] = [];

  for (const node of graph.nodes) {
    elements.push({
      data: {
        id: node.login,
        label: node.login,
        login: node.login,
        userId: node.id,
        avatarUrl: node.avatarUrl,
        name: node.name,
        bio: node.bio,
        company: node.company,
        location: node.location,
        followers: node.followers,
        following: node.following,
        depth: node.depth,
        isCenter: node.login === graph.centerUser,
        nodeColor: DEPTH_COLORS[node.depth] || '#7e8fa6',
        nodeSize: nodeSize(node.followers),
      },
    });
  }

  for (const edge of graph.edges) {
    const edgeId = `${edge.source}->${edge.target}`;
    const isMutual = mutualEdgeSet.has(edgeId);
    elements.push({
      data: {
        id: edgeId,
        source: edge.source,
        target: edge.target,
        isMutual,
      },
    });
  }

  const stylesheet: cytoscape.StylesheetStyle[] = [
    {
      selector: 'node',
      style: {
        'background-color': 'data(nodeColor)',
        label: 'data(label)',
        width: 'data(nodeSize)',
        height: 'data(nodeSize)',
        'font-size': 10,
        color: '#2c3e50',
        'text-valign': 'bottom',
        'text-margin-y': 5,
        'background-image': 'data(avatarUrl)',
        'background-fit': 'cover',
        'background-clip': 'node',
        'border-width': 2,
        'border-color': 'data(nodeColor)',
        'overlay-padding': 4,
      } as cytoscape.Css.Node,
    },
    {
      selector: 'node[?isCenter]',
      style: {
        'border-width': 4,
        'border-color': '#e0a030',
      } as cytoscape.Css.Node,
    },
    {
      selector: 'edge',
      style: {
        width: 1.5,
        'line-color': '#b0c4d8',
        'target-arrow-color': '#b0c4d8',
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
        'arrow-scale': 0.8,
        opacity: 0.6,
      } as cytoscape.Css.Edge,
    },
    {
      selector: 'edge[?isMutual]',
      style: {
        'line-color': '#4caf50',
        'target-arrow-color': '#4caf50',
        width: 2,
        opacity: 0.8,
      } as cytoscape.Css.Edge,
    },
    {
      selector: '.dimmed',
      style: {
        opacity: 0.1,
      } as cytoscape.Css.Node,
    },
    {
      selector: 'node.highlighted',
      style: {
        opacity: 1,
        'border-width': 4,
        'border-color': '#e0a030',
      } as cytoscape.Css.Node,
    },
    {
      selector: 'edge.highlighted',
      style: {
        opacity: 1,
        width: 3,
        'line-color': '#4a90d9',
        'target-arrow-color': '#4a90d9',
        'z-index': 10,
      } as cytoscape.Css.Edge,
    },
    {
      selector: 'edge.highlighted[?isMutual]',
      style: {
        'line-color': '#4caf50',
        'target-arrow-color': '#4caf50',
        width: 3,
        opacity: 1,
      } as cytoscape.Css.Edge,
    },
  ];

  const layout = {
    name: 'cose-bilkent',
    animate: true,
    animationDuration: 1000,
    nodeRepulsion: 8000,
    idealEdgeLength: 100,
    edgeElasticity: 0.1,
    nestingFactor: 0.1,
    gravity: 0.25,
    numIter: 2500,
    tile: true,
    fit: true,
    padding: 30,
  };

  return (
    <div style={styles.container}>
      <CytoscapeComponent
        elements={elements}
        stylesheet={stylesheet}
        layout={layout}
        style={{ width: '100%', height: '100%' }}
        cy={(cy) => handleCyReady(cy)}
      />
      <UserCard />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    width: '100%',
    height: '100%',
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    gap: 12,
  },
  emptyText: {
    color: '#7e8fa6',
    fontSize: 15,
  },
};
