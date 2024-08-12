export interface Message {
    id: Uint8Array;
    peer: Uint8Array;
    parent: Uint8Array | null;
    height: number;
    acks: Uint8Array[];
    type: string;
    round: number;
    channel: string;
    data: unknown;
    status: 'pending' | 'confirmed' | 'rejected';
  }