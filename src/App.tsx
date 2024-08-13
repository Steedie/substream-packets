/* eslint-disable @typescript-eslint/no-unused-vars */
import "./App.css";
import { Canvas } from "@react-three/fiber";
import { OrthographicCamera, Line } from "@react-three/drei";
import { Vector3 } from "three";
import { Message } from "./interfaces";
import { fakeMessageData } from "./fakeData";

const PACKET_SCALE = 0.1;
const SPREAD_X = 5;
const SPREAD_Y = 5;
const LINE_COLOR = "darkorange";

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

const Packet = ({ position, color }: { position: Vector3; color: string }) => {
  return (
    <>
      <mesh position={position}>
        <boxGeometry args={[PACKET_SCALE, PACKET_SCALE, PACKET_SCALE]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </>
  );
};

function PacketVisualization({ messages }: { messages: Message[] }) {
  const messageDictionary: Map<Uint8Array, Message[]> = new Map<
    Uint8Array,
    Message[]
  >();

  const roundHeightMappingDictionary: Map<number, number> = new Map<
    number,
    number
  >();

  let lowestRound;

  // Find the lowest message round first
  lowestRound = messages.reduce((minRound, m) => {
    return m.round < minRound ? m.round : minRound;
  }, Number.MAX_VALUE);

  messages.forEach((m) => {
    const peerKey = m.peer;
    // Update messageDictionary
    if (messageDictionary.has(peerKey)) {
      messageDictionary.get(peerKey)!.push(m);
    } else {
      messageDictionary.set(peerKey, [m]);
    }

    // Update roundHeightMappingDictionary
    const round = m.round;
    if (!roundHeightMappingDictionary.has(round)) {
      roundHeightMappingDictionary.set(round, round - lowestRound);
    }
  });

  const packets: JSX.Element[] = [];

  const packetPositionMapping: Map<string, Vector3> = new Map<
    string,
    Vector3
  >();

  let peerIndex = 0;
  messageDictionary.forEach((peerMessages, peerKey) => {
    peerMessages.forEach((m, messageIndex) => {
      const xPos = peerIndex * SPREAD_X * PACKET_SCALE;
      const yPos =
        roundHeightMappingDictionary.get(m.round)! * SPREAD_Y * PACKET_SCALE;

      const position = new Vector3(xPos, yPos, 0);

      // Add position to the packetPositionMapping dictionary
      if (!packetPositionMapping.has(m.id.toString())) {
        packetPositionMapping.set(m.id.toString(), position);
      }

      packets.push(
        <Packet
          key={m.id.toString()}
          position={position}
          color={m.data as string}
        />
      );
    });

    peerIndex++;
  });

  return (
    <>
      {packets}
      {DrawLines(messages, packetPositionMapping)}
    </>
  );
}

function DrawLines(
  messages: Message[],
  packetPositionMapping: Map<string, Vector3>
) {
  const lines: JSX.Element[] = [];

  messages.forEach((m) => {
    // Draw line from parent to current message
    if (m.parent !== null) {
      const parentPosition = packetPositionMapping.get(m.parent.toString());
      const childPosition = packetPositionMapping.get(m.id.toString());

      if (parentPosition && childPosition) {
        lines.push(
          <Line
            points={[parentPosition, childPosition]}
            color={LINE_COLOR}
            lineWidth={2}
          />
        );
      }
    }

    // Draw lines from current message to each ack
    m.acks.forEach((ack) => {
      const ackPosition = packetPositionMapping.get(ack.toString());
      const currentPosition = packetPositionMapping.get(m.id.toString());

      if (ackPosition && currentPosition) {
        lines.push(
          <Line
            points={[currentPosition, ackPosition]}
            color={LINE_COLOR}
            lineWidth={2}
          />
        );
      }
    });
  });

  return <>{lines}</>;
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
