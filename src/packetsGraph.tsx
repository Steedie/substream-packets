import { useEffect, useState, useRef } from "react";
import { Pane } from "tweakpane";

interface PacketsGraphProps {
  pSent: number;
  pRecieve: number;
}

export const PacketsGraph: React.FC<PacketsGraphProps> = ({
  pSent,
  pRecieve,
}) => {
  const [packetsSentPerSecond, setPacketsSentPerSecond] = useState(pSent);
  const [packetsReceivedPerSecond, setPacketsReceivedPerSecond] =
    useState(pRecieve);
  const paneRef = useRef<Pane | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const paramsRef = useRef({ psps: pSent, prps: pRecieve });

  useEffect(() => {
    setPacketsSentPerSecond(pSent);
    setPacketsReceivedPerSecond(pRecieve);
  }, [pSent, pRecieve]);

  // init pane
  useEffect(() => {
    if (!containerRef.current || paneRef.current) return;

    // folders
    paneRef.current = new Pane({ container: containerRef.current });
    const packetsSentFolder = paneRef.current.addFolder({
      title: "Packets Sent per Second",
    });
    const packetsReceivedFolder = paneRef.current.addFolder({
      title: "Packets Received per Second",
    });

    // graphs
    packetsSentFolder.addBinding(paramsRef.current, "psps", {
      readonly: true,
      view: "graph",
      label: "Sent/s",
      interval: 500,
      min: -1,
      max: 50,
    });
    packetsReceivedFolder.addBinding(paramsRef.current, "prps", {
      readonly: true,
      view: "graph",
      label: "Received/s",
      interval: 500,
      min: -1,
      max: 50,
    });
  }, []);

  useEffect(() => {
    paramsRef.current.psps = packetsSentPerSecond;
    paramsRef.current.prps = packetsReceivedPerSecond;
    paneRef.current?.refresh();
  }, [packetsSentPerSecond, packetsReceivedPerSecond]);

  return <div ref={containerRef}></div>;
};
