/* eslint-disable @typescript-eslint/no-unused-vars */
import "./App.css";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrthographicCamera, Line } from "@react-three/drei";
import { Vector3 } from "three";
import { Message, PacketLineProps } from "./interfaces";
import { fakeMessageData1, fakeMessageData2 } from "./fakeData";
import { useState, useRef, useEffect } from "react";

const PACKET_SCALE = 0.2;
const SPREAD_X = 2.5;
const SPREAD_Y = 3.5;
const LINE_WIDTH = PACKET_SCALE * 22;
const DEFAULT_LINE_COLOR = "grey";
const HIGHLIGHTED_LINE_COLOR = "cyan";
const MAX_ROUNDS = 0; // 0 to show all rounds
const CAM_LERP_SPEED = LINE_WIDTH / 100;

function PacketsCamera({ camTargetY }: { camTargetY: number }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cameraRef = useRef<any>(null);

  useFrame(() => {
    if (cameraRef.current) {
      // Smoothly interpolate the camera's Y position towards the camTargetY
      cameraRef.current.position.y +=
        (camTargetY - cameraRef.current.position.y) * CAM_LERP_SPEED;
    }
  });

  return (
    <OrthographicCamera
      ref={cameraRef}
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
  message,
  setHoveredMessage,
}: {
  position: Vector3;
  color: string;
  lines: PacketLineProps[];
  message: Message;
  setHoveredMessage: (message: Message | null) => void;
}) => {
  const [hovered, setHovered] = useState(false);

  return (
    <>
      <mesh
        position={position}
        onPointerOver={() => {
          setHovered(true);
          setHoveredMessage(message);
        }}
        onPointerOut={() => {
          setHovered(false);
          setHoveredMessage(null);
        }}
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

function PacketVisualization({
  messages,
  onHighestYChange,
  setHoveredMessage,
}: {
  messages: Message[];
  onHighestYChange: (y: number) => void;
  setHoveredMessage: (m: Message | null) => void;
}) {
  const roundHeightMappingDictionary: Map<number, number> = new Map<
    number,
    number
  >();
  const idXMappingDictionary: Map<Uint8Array, number> = new Map<
    Uint8Array,
    number
  >();

  // Find the lowest message round first
  const lowestRound = messages.reduce((minRound, m) => {
    return m.round < minRound ? m.round : minRound;
  }, Number.MAX_VALUE);

  // Only show the last MAX_ROUNDS rounds
  const filteredMessages =
    MAX_ROUNDS > 0
      ? messages.filter(
          (m) =>
            m.round >=
            Math.max(...messages.map((msg) => msg.round)) - MAX_ROUNDS + 1
        )
      : messages;

  // Sort messages by their round
  const sortedMessages = [...filteredMessages].sort(
    (a, b) => a.round - b.round
  );

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

  let highestY = 0;

  sortedMessages.forEach((m, index) => {
    const xPos = idXMappingDictionary.get(m.peer)! * SPREAD_X * PACKET_SCALE;
    const yPos =
      roundHeightMappingDictionary.get(m.round)! * SPREAD_Y * PACKET_SCALE;

    const position = new Vector3(xPos, yPos, 0);

    // Track the highest Y position
    if (yPos > highestY) {
      highestY = yPos;
    }

    // Add position to the packetPositionMapping dictionary
    if (!packetPositionMapping.has(m.id.toString())) {
      packetPositionMapping.set(m.id.toString(), position);
    }

    // Create lines array
    const lines: PacketLineProps[] = [];

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
        message={m}
        setHoveredMessage={setHoveredMessage}
      />
    );
  });

  // Call the callback to update the camera target Y position
  onHighestYChange(highestY);

  return <>{packets}</>;
}

function App() {
  const [camTargetY, setCamTargetY] = useState(0);
  const [currentRound, setCurrentRound] = useState(1);
  const [visibleMessages, setVisibleMessages] = useState<Message[]>([]);
  const [hoveredMessage, setHoveredMessage] = useState<Message | null>(null);

  // Making messages appear over time (Using the fakeMessageData)
  useEffect(() => {
    const interval = setInterval(() => {
      const messagesToAdd = fakeMessageData2
        .filter((msg) => msg.round === currentRound)
        .sort(() => Math.random() - 0.5); // Shuffle the order of messages

      messagesToAdd.forEach((message, index) => {
        setTimeout(() => {
          setVisibleMessages((prevMessages) => [...prevMessages, message]);
        }, index * Math.random() * 150); // random delay up to 100ms
      });

      setCurrentRound((prevRound) => prevRound + 1);
    }, 250);

    return () => clearInterval(interval);
  }, [currentRound]);

  return (
    <>
      <h1>substream packets</h1>
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        <Canvas>
          <ambientLight intensity={2} />
          <PacketsCamera camTargetY={camTargetY} />
          <PacketVisualization
            messages={visibleMessages} // Use `fakeMessageData2` to show all messages at once
            onHighestYChange={setCamTargetY}
            setHoveredMessage={setHoveredMessage}
          />
        </Canvas>
        <div className="debug-text">
          {hoveredMessage && (
            <div>
              <div>
                <strong>Packet Details:</strong>
              </div>
              <div>ID: {hoveredMessage.id.toString()}</div>
              <div>Peer: {hoveredMessage.peer.toString()}</div>
              <div>Parent: {hoveredMessage.parent?.toString() || "None"}</div>
              <div>Height: {hoveredMessage.height}</div>
              <div>Acks: {hoveredMessage.acks.length}</div>
              <div>Type: {hoveredMessage.type}</div>
              <div>Round: {hoveredMessage.round}</div>
              <div>Channel: {hoveredMessage.channel}</div>
              <div>Status: {hoveredMessage.status}</div>
              <div>Data: {JSON.stringify(hoveredMessage.data)}</div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default App;
