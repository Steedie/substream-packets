/* eslint-disable @typescript-eslint/no-unused-vars */
import "./App.css";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrthographicCamera, Line } from "@react-three/drei";
import { Vector3 } from "three";
import { Message, PacketLineProps } from "./interfaces";
import { fakeMessageData1, fakeMessageData2 } from "./fakeData";
import { useState, useRef, useEffect } from "react";
import { PacketsGraph } from "./packetsGraph";

let PACKET_SCALE = 0.1;
let SPREAD_X = 4;
let SPREAD_Y = 8;
let LINE_WIDTH = 2;
const DEFAULT_LINE_COLOR = "grey";
const HIGHLIGHTED_LINE_COLOR = "cyan";
let MAX_ROUNDS = 8; // 0 to show all rounds
//const CAM_LERP_SPEED = LINE_WIDTH / 100;
let CAM_LERP_SPEED = 0.02;
let TICK_SPEED = 250;

function PacketsCamera({ camTargetY }: { camTargetY: number }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cameraRef = useRef<any>(null);

  useFrame(() => {
    if (cameraRef.current) {
      // Smoothly interpolate the camera's Y position towards the camTargetY
      cameraRef.current.position.y +=
        (camTargetY - cameraRef.current.position.y) * CAM_LERP_SPEED;

      const targetX = (PACKET_SCALE * SPREAD_X * idXMappingDictionary.size) / 2;

      cameraRef.current.position.x +=
        (targetX - cameraRef.current.position.x) * CAM_LERP_SPEED;

      //cameraRef.current.position.y = camTargetY;
      //cameraRef.current.position.x = idXMappingDictionary.size / 5;
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

const idXMappingDictionary: Map<Uint8Array, number> = new Map<
  Uint8Array,
  number
>();
let currentX = 0;

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

  sortedMessages.forEach((m) => {
    if (!idXMappingDictionary.has(m.peer)) {
      idXMappingDictionary.set(m.peer, currentX);
      currentX++;
    }
  });

  const packets: JSX.Element[] = [];
  const packetPositionMapping: Map<string, Vector3> = new Map<
    string,
    Vector3
  >();

  let highestY = 0;

  const addedMessages: Message[] = [];

  sortedMessages.forEach((m, index) => {
    const xPos = idXMappingDictionary.get(m.peer)! * SPREAD_X * PACKET_SCALE;
    const yPos =
      roundHeightMappingDictionary.get(m.round)! * SPREAD_Y * PACKET_SCALE;

    // HANDLE FORKED PACKETS
    let extraX = 0;
    addedMessages.forEach((msg) => {
      if (
        msg.peer.toString() === m.peer.toString() &&
        msg.height === m.height
      ) {
        extraX += 1 * PACKET_SCALE + PACKET_SCALE * 0.1;
      }
    });
    addedMessages.push(m);

    const position = new Vector3(xPos + extraX, yPos, 0);

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

function getRandomId() {
  return new Uint8Array([
    Math.floor(Math.random() * 9999) + 1,
    Math.floor(Math.random() * 9999) + 1,
    Math.floor(Math.random() * 9999) + 1,
  ]);
}

function DevControlButtons() {
  const [packetScale, setPacketScale] = useState(PACKET_SCALE);
  const [spreadX, setSpreadX] = useState(SPREAD_X);
  const [spreadY, setSpreadY] = useState(SPREAD_Y);
  const [lineWidth, setLineWidth] = useState(LINE_WIDTH);
  const [camLerpSpeed, setCamLerpSpeed] = useState(CAM_LERP_SPEED);
  const [maxRounds, setMaxRounds] = useState(MAX_ROUNDS);
  const [tickSpeed, setTickSpeed] = useState(TICK_SPEED);

  const addNewPeer = () => {
    const newPeer = getRandomId();
    peers.push(newPeer);
  };

  const removeLastPeer = () => {
    const peer = peers.pop();
    if (peer) {
      if (idXMappingDictionary.has(peer)) {
        idXMappingDictionary.delete(peer);
        currentX--;
      }
    }
  };

  const randomForkError = () => {
    const randomIndex = Math.floor(Math.random() * peers.length);
    peers.push(peers[randomIndex]);
  };

  const clearDataSet = () => {
    dataSet.length = 0;
  };

  return (
    <>
      <button onClick={addNewPeer}>Add New Peer</button>
      <button onClick={removeLastPeer}>Remove Last Peer</button>
      <button onClick={randomForkError}>Random Fork Error</button>
      <button onClick={clearDataSet}>Clear Data Set</button>

      <div className="config-controls">
        <label>
          Packet Scale:
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.01"
            value={packetScale}
            onChange={(e) => {
              const value = parseFloat(e.target.value);
              setPacketScale(value);
              PACKET_SCALE = value;
              LINE_WIDTH = PACKET_SCALE * 25;
              setLineWidth(LINE_WIDTH);
            }}
          />
          <span>{packetScale.toFixed(2)}</span>
        </label>
        <label>
          Tick Speed:
          <input
            type="range"
            min="10"
            max="2000"
            step="1"
            value={tickSpeed}
            onChange={(e) => {
              const value = parseFloat(e.target.value);
              setTickSpeed(value);
              TICK_SPEED = value;
              setTickSpeed(TICK_SPEED);
            }}
          />
          <span>{tickSpeed}</span>
        </label>
        <label>
          Spread X:
          <input
            type="number"
            min="1"
            max="20"
            value={spreadX}
            onChange={(e) => {
              const value = parseFloat(e.target.value);
              setSpreadX(value);
              SPREAD_X = value;
            }}
          />
        </label>
        <label>
          Spread Y:
          <input
            type="number"
            min="1"
            max="20"
            value={spreadY}
            onChange={(e) => {
              const value = parseFloat(e.target.value);
              setSpreadY(value);
              SPREAD_Y = value;
            }}
          />
        </label>
        <label>
          Line Width:
          <input
            type="number"
            min="1"
            max="10"
            value={lineWidth.toFixed(2)}
            onChange={(e) => {
              const value = parseFloat(e.target.value);
              setLineWidth(value);
              LINE_WIDTH = value;
            }}
          />
        </label>
        <label>
          Camera Lerp Speed:
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={camLerpSpeed}
            onChange={(e) => {
              const value = parseFloat(e.target.value);
              setCamLerpSpeed(value);
              CAM_LERP_SPEED = value;
            }}
          />
          <span>{camLerpSpeed.toFixed(2)}</span>
        </label>
        <label>
          Max Rounds:
          <input
            type="number"
            min="0"
            max="50"
            value={maxRounds}
            onChange={(e) => {
              const value = parseInt(e.target.value, 10);
              setMaxRounds(value);
              MAX_ROUNDS = value;
            }}
          />
        </label>
      </div>
    </>
  );
}

const peers: Uint8Array[] = [];
const dataSet: Message[] = [];

function App() {
  const [camTargetY, setCamTargetY] = useState(0);
  const [currentRound, setCurrentRound] = useState(1);
  const [hoveredMessage, setHoveredMessage] = useState<Message | null>(null);

  // packets graph
  const [psps, setPsps] = useState(0);
  const [prps, setPrps] = useState(0);
  const packetsSentCountRef = useRef(0);
  const packetsReceivedCountRef = useRef(0);

  // GENERATE NEW DATA
  useEffect(() => {
    const interval = setInterval(() => {
      const lastRoundMessages = dataSet.filter(
        (msg) => msg.round === currentRound - 1
      );

      peers.forEach((peer) => {
        if (Math.random() < 0.3) {
          return;
        }

        const parentMessage = lastRoundMessages.find(
          (msg) => msg.peer === peer
        );

        const acks = lastRoundMessages
          .filter((msg) => msg.peer !== peer)
          .map((msg) => msg.id);

        let color = "white";
        if (!parentMessage) {
          color = "orange";
          if (acks.length == 0) color = "red";
        }

        const height = peer[0] + currentRound;

        dataSet.push({
          id: getRandomId(),
          peer: peer,
          parent: parentMessage ? parentMessage.id : null,
          height: height,
          acks: acks,
          type: "message",
          round: currentRound,
          channel: "channel",
          data: color,
          status: "confirmed",
        });

        if (peer === peers[0]) {
          packetsSentCountRef.current++;
        } else {
          packetsReceivedCountRef.current++;
        }
      });

      setCurrentRound((prevRound) => prevRound + 1);
    }, TICK_SPEED);

    return () => clearInterval(interval); // Clean up on component unmount
  }, [currentRound]);

  // UPDATE PSPS AND PRPS EVERY SECOND
  useEffect(() => {
    const interval = setInterval(() => {
      setPsps(packetsSentCountRef.current);
      setPrps(packetsReceivedCountRef.current);

      // Reset counts for the next interval
      packetsSentCountRef.current = 0;
      packetsReceivedCountRef.current = 0;
    }, 1000);

    return () => clearInterval(interval); // Clean up on component unmount
  }, []);

  return (
    <>
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        <Canvas>
          <ambientLight intensity={2} />
          <PacketsCamera camTargetY={camTargetY} />
          <PacketVisualization
            messages={dataSet} // `fakeMessageData2`, `dataSet`
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

        <DevControlButtons />
        <PacketsGraph pSent={psps} pRecieve={prps} />
      </div>
    </>
  );
}

export default App;
