import { useEffect, useState, useRef } from "react";
import { Pane } from "tweakpane";

// psps = packets sent per second
// prps = packets received per second

// const simulatePackets = () => {
//   const randomFactor = Math.random();
//   if (randomFactor < 0.1) {
//     return 0;
//   } else if (randomFactor < 0.7) {
//     return Math.round(30 + Math.random() * 20);
//   } else {
//     return Math.round(60 + Math.random() * 40);
//   }
// };

export const PacketsGraph = ({
  pSent,
  pRecieve,
}: {
  pSent: number;
  pRecieve: number;
}) => {
  const [packetsSentPerSecond, setPacketsPerSecond] = useState(0);
  const [packetsReceivedPerSecond, setPacketsReceivedPerSecond] = useState(0);
  const pane = useRef<Pane | null>(null);
  const paramsRef = useRef({ psps: 0, prps: 0 });

  useEffect(() => {
    setPacketsPerSecond(pSent);
    setPacketsReceivedPerSecond(pRecieve);
  }, [pSent, pRecieve]);

  // init pane
  useEffect(() => {
    pane.current = new Pane();
    // folders
    const packetsSentFolder = pane.current.addFolder({
      title: "Packets Sent per Second",
    });
    const packetsRecievedFolder = pane.current.addFolder({
      title: "Packets Recieved per Second",
    });
    // graphs
    packetsSentFolder.addBinding(paramsRef.current, "psps", {
      readonly: true,
      view: "graph",
      label: "Sent/s",
      interval: 500,
      min: -1,
      max: +100,
    });
    packetsRecievedFolder.addBinding(paramsRef.current, "prps", {
      readonly: true,
      view: "graph",
      label: "Recieved/s",
      interval: 500,
      min: -1,
      max: 100,
    });
  }, []);

  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     setPacketsPerSecond(simulatePackets());
  //     setPacketsReceivedPerSecond(simulatePackets());
  //   }, 1000);
  //   return () => clearInterval(interval);
  // }, []);

  useEffect(() => {
    paramsRef.current.psps = packetsSentPerSecond;
    paramsRef.current.prps = packetsReceivedPerSecond;
    pane.current?.refresh();
  }, [packetsSentPerSecond, packetsReceivedPerSecond]);

  return <div ref={pane}></div>;
};
