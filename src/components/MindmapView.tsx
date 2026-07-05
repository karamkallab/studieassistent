import React, { useState, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { G, Rect, Text as SvgText, Path, Circle } from 'react-native-svg';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useReducedMotion,
} from 'react-native-reanimated';
import { MindmapNode } from '../data/sampleMindmap';
import { colors, fontFamily } from '../theme/tokens';

// ─── Layout constants ────────────────────────────────────────────────────────

const NODE_W = 130;
const NODE_H = 38;
const H_GAP = 56;   // horizontal gap between levels
const V_GAP = 18;   // vertical gap between siblings
const LEVEL_W = NODE_W + H_GAP;

// ─── Layout types ────────────────────────────────────────────────────────────

interface LayoutNode {
  id: string;
  topic: string;
  x: number;
  y: number;
  children: LayoutNode[];
  hasChildren: boolean;
}

// ─── Layout algorithm ────────────────────────────────────────────────────────

function countLeaves(node: MindmapNode, collapsed: Set<string>): number {
  if (collapsed.has(node.id) || node.children.length === 0) return 1;
  return node.children.reduce((s, c) => s + countLeaves(c, collapsed), 0);
}

function layoutTree(
  node: MindmapNode,
  depth: number,
  startY: number,
  collapsed: Set<string>,
): { layoutNode: LayoutNode; endY: number } {
  const x = depth * LEVEL_W;
  const isCollapsed = collapsed.has(node.id);

  if (isCollapsed || node.children.length === 0) {
    return {
      layoutNode: { id: node.id, topic: node.topic, x, y: startY, children: [], hasChildren: node.children.length > 0 },
      endY: startY + NODE_H + V_GAP,
    };
  }

  const childLayouts: LayoutNode[] = [];
  let currentY = startY;
  for (const child of node.children) {
    const { layoutNode, endY } = layoutTree(child, depth + 1, currentY, collapsed);
    childLayouts.push(layoutNode);
    currentY = endY;
  }

  // Center the parent between first and last child
  const firstY = childLayouts[0].y;
  const lastY = childLayouts[childLayouts.length - 1].y;
  const centerY = (firstY + lastY) / 2;

  return {
    layoutNode: { id: node.id, topic: node.topic, x, y: centerY, children: childLayouts, hasChildren: true },
    endY: currentY,
  };
}

function flattenNodes(node: LayoutNode): LayoutNode[] {
  return [node, ...node.children.flatMap(flattenNodes)];
}

function collectEdges(node: LayoutNode): Array<{ from: LayoutNode; to: LayoutNode }> {
  return [
    ...node.children.map((child) => ({ from: node, to: child })),
    ...node.children.flatMap(collectEdges),
  ];
}

// ─── SVG Renderers ───────────────────────────────────────────────────────────

function EdgePath({ from, to }: { from: LayoutNode; to: LayoutNode }) {
  const x1 = from.x + NODE_W;
  const y1 = from.y + NODE_H / 2;
  const x2 = to.x;
  const y2 = to.y + NODE_H / 2;
  const mx = (x1 + x2) / 2;
  return (
    <Path
      d={`M ${x1} ${y1} C ${mx} ${y1} ${mx} ${y2} ${x2} ${y2}`}
      fill="none"
      stroke={colors.cardBorder}
      strokeWidth={1.5}
    />
  );
}

function NodeBox({
  node,
  isRoot,
  onPress,
}: {
  node: LayoutNode;
  isRoot: boolean;
  onPress: () => void;
}) {
  const fill = isRoot ? colors.highlight : colors.cardBg;
  const stroke = isRoot ? colors.highlight : colors.cardBorder;

  return (
    <G onPress={onPress}>
      <Rect
        x={node.x}
        y={node.y}
        width={NODE_W}
        height={NODE_H}
        rx={8}
        fill={fill}
        stroke={stroke}
        strokeWidth={1}
      />
      <SvgText
        x={node.x + (node.hasChildren ? NODE_W / 2 - 8 : NODE_W / 2)}
        y={node.y + NODE_H / 2 + 1}
        fontSize={12}
        fontFamily={fontFamily.body}
        fill={colors.ink}
        textAnchor="middle"
        alignmentBaseline="middle"
      >
        {node.topic.length > 16 ? node.topic.slice(0, 14) + '…' : node.topic}
      </SvgText>
      {node.hasChildren && (
        <Circle
          cx={node.x + NODE_W - 10}
          cy={node.y + NODE_H / 2}
          r={5}
          fill={colors.inkMuted}
        />
      )}
    </G>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  data: MindmapNode;
}

export function MindmapView({ data }: Props) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const reduceMotion = useReducedMotion();

  const { layoutNode, endY } = useMemo(
    () => layoutTree(data, 0, 0, collapsed),
    [data, collapsed],
  );

  const nodes = useMemo(() => flattenNodes(layoutNode), [layoutNode]);
  const edges = useMemo(() => collectEdges(layoutNode), [layoutNode]);

  // Bounding box for SVG
  const maxX = nodes.reduce((m, n) => Math.max(m, n.x + NODE_W), 0) + H_GAP;
  const minY = nodes.reduce((m, n) => Math.min(m, n.y), Infinity) - V_GAP;
  const maxY = Math.max(endY, nodes.reduce((m, n) => Math.max(m, n.y + NODE_H), 0)) + V_GAP;
  const svgW = maxX;
  const svgH = maxY - minY;

  // Pan/zoom shared values
  const translateX = useSharedValue(16);
  const translateY = useSharedValue(16);
  const scale = useSharedValue(1);
  const savedTx = useSharedValue(16);
  const savedTy = useSharedValue(16);
  const savedScale = useSharedValue(1);

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = savedTx.value + e.translationX;
      translateY.value = savedTy.value + e.translationY;
    })
    .onEnd(() => {
      savedTx.value = translateX.value;
      savedTy.value = translateY.value;
    });

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.max(0.3, Math.min(3, savedScale.value * e.scale));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  const composed = Gesture.Simultaneous(panGesture, pinchGesture);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const toggleCollapse = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <GestureDetector gesture={composed}>
      <View style={styles.container}>
        <Animated.View style={containerStyle}>
          <Svg width={svgW} height={svgH} viewBox={`0 ${minY} ${svgW} ${svgH}`}>
            {/* Edges behind nodes */}
            {edges.map((e, i) => (
              <EdgePath key={i} from={e.from} to={e.to} />
            ))}
            {/* Nodes */}
            {nodes.map((node, i) => (
              <NodeBox
                key={node.id}
                node={node}
                isRoot={i === 0}
                onPress={() => {
                  if (node.hasChildren) toggleCollapse(node.id);
                }}
              />
            ))}
          </Svg>
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
});
