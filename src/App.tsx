/* eslint-disable @typescript-eslint/no-unused-vars */
import "./App.css";
import { Canvas } from "@react-three/fiber";
import { OrthographicCamera, Line } from "@react-three/drei";
import { Vector3 } from "three";
import { Message, PacketLineProps } from "./interfaces";
import { fakeMessageData } from "./fakeData";
import { useState } from "react";

const PACKET_SCALE = 0.25;
const SPREAD_X = 2.5;
const SPREAD_Y = 2.5;
const LINE_WIDTH = PACKET_SCALE * 20;
const DEFAULT_LINE_COLOR = "grey";
const HIGHLIGHTED_LINE_COLOR = "cyan";

function PacketsCamera() {
  return (
    <OrthographicCamera
      makeDefault
      position={[0, 0, 10]}
      zoom={100}
      near={0.1}
      far={1000}
    />
  );
}

const Packet = ({
  position,
  color,
  lines,
}: {
  position: Vector3;
  color: string;
  lines: PacketLineProps[];
}) => {
  const [hovered, setHovered] = useState(false);

  return (
    <>
      <mesh
        position={position}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <boxGeometry args={[PACKET_SCALE, PACKET_SCALE, PACKET_SCALE]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {lines.map((lineProps, index) => (
        <PacketLine
          key={index}
          {...lineProps}
          color={hovered ? HIGHLIGHTED_LINE_COLOR : DEFAULT_LINE_COLOR}
        />
      ))}
    </>
  );
};

const PacketLine = ({ points, color }: PacketLineProps) => {
  return (
    <Line
      points={[points[0], points[1]]}
      color={color || DEFAULT_LINE_COLOR}
      lineWidth={LINE_WIDTH}
    />
  );
};

function PacketVisualization({ messages }: { messages: Message[] }) {
  const roundHeightMappingDictionary: Map<number, number> = new Map<
    number,
    number
  >();
  const idXMappingDictionary: Map<Uint8Array, number> = new Map<
    Uint8Array,
    number
  >();

  let lowestRound;

  // Find the lowest message round first
  lowestRound = messages.reduce((minRound, m) => {
    return m.round < minRound ? m.round : minRound;
  }, Number.MAX_VALUE);

  // Sort messages by their round
  const sortedMessages = [...messages].sort((a, b) => a.round - b.round);

  // Update roundHeightMappingDictionary based on the sorted messages
  sortedMessages.forEach((m) => {
    const round = m.round;
    if (!roundHeightMappingDictionary.has(round)) {
      roundHeightMappingDictionary.set(round, round - lowestRound);
    }
  });

  // Update X based on the sorted messages
  let tX = 0;
  sortedMessages.forEach((m) => {
    if (!idXMappingDictionary.has(m.peer)) {
      idXMappingDictionary.set(m.peer, tX);
      tX++;
    }
  });

  const packets: JSX.Element[] = [];

  const packetPositionMapping: Map<string, Vector3> = new Map<
    string,
    Vector3
  >();

  sortedMessages.forEach((m, index) => {
    const xPos = idXMappingDictionary.get(m.peer)! * SPREAD_X * PACKET_SCALE;
    const yPos =
      roundHeightMappingDictionary.get(m.round)! * SPREAD_Y * PACKET_SCALE;

    const position = new Vector3(xPos, yPos, 0);

    // Add position to the packetPositionMapping dictionary
    if (!packetPositionMapping.has(m.id.toString())) {
      packetPositionMapping.set(m.id.toString(), position);
    }

    // Create lines array
    let lines: PacketLineProps[] = [];

    // Parent line
    if (m.parent !== null) {
      const parentPosition = packetPositionMapping.get(m.parent.toString());
      const childPosition = packetPositionMapping.get(m.id.toString());
      if (parentPosition && childPosition) {
        lines.push({ points: [parentPosition, childPosition] });
      }
    }

    // Acks lines
    m.acks.forEach((ack) => {
      const ackPosition = packetPositionMapping.get(ack.toString());
      const currentPosition = packetPositionMapping.get(m.id.toString());

      if (ackPosition && currentPosition) {
        lines.push({ points: [currentPosition, ackPosition] });
      }
    });

    packets.push(
      <Packet
        key={m.id.toString()}
        position={position}
        color={m.data as string}
        lines={lines}
      />
    );
  });

  return <>{packets}</>;
}

function App() {
  return (
    <>
      <h1>substream packets</h1>
      <Canvas>
        <ambientLight intensity={3} />
        <PacketsCamera />
        <PacketVisualization messages={fakeMessageData} />
      </Canvas>
    </>
  );
}

export default App;
