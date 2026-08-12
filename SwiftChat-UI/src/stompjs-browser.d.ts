declare module 'stompjs/lib/stomp.js' {
  import {Client} from 'stompjs';

  export const Stomp: {
    over(ws: WebSocket): Client;
  };
}
