import express from "express";
import { WebSocketServer } from "ws";
import type WebSocket from "ws";
import { Game } from "./engine.js";
import { CARD_MAP } from "./cards_setsumei.js";
import type { PlayerId } from "./types.js";

type ClientMsg =
  | { type: "join"; room: string }
  | { type: "select"; cardId: string };

type ServerMsg =
  | { type: "error"; message: string }
  | { type: "joined"; room: string; playerId: PlayerId }
  | { type: "state"; view: any; cards: any[]; myHandCards: any[] }
  | { type: "events"; events: any[] };

type Room = {
  id: string;
  sockets: Partial<Record<PlayerId, WebSocket>>;
  game?: Game;
  lastEventIdx: number;
};

const rooms = new Map<string, Room>();

function safeSend(ws: WebSocket, msg: ServerMsg) {
  if (ws.readyState === 1) ws.send(JSON.stringify(msg));
}

function getOrCreateRoom(id: string): Room {
  const r = rooms.get(id);
  if (r) return r;
  const room: Room = { id, sockets: {}, game: undefined, lastEventIdx: 0 };
  rooms.set(id, room);
  return room;
}

function assignPlayerId(room: Room): PlayerId | null {
  if (!room.sockets.P1) return "P1";
  if (!room.sockets.P2) return "P2";
  return null;
}

function cardUi(id: string) {
  const c = CARD_MAP[id];
  if (!c) return { id, name: id, type: "UNKNOWN" };

  if (c.type === "ATTACK") {
    return {
      id: c.id,
      name: c.name,
      type: c.type,
      character: c.character,
      judge: c.judge,
      specialJudge: c.specialJudge,
      speed: c.speed,
      damage: c.damage,
      fpOnHit: c.fpOnHit,
      fpOnGuard: c.fpOnGuard,
      fpOnCounter: c.fpOnCounter,
      effectsRaw: c.effectsRaw
    };
  }

  return {
    id: c.id,
    name: c.name,
    type: c.type,
    character: c.character,
    guardHeights: c.guardHeights,
    evadeHeights: c.evadeHeights,
    effectsRaw: c.effectsRaw
  };
}

const ALL_CARDS_UI = Object.keys(CARD_MAP).map(cardUi);

function makeInitialGame(): Game {
  const pool = Object.keys(CARD_MAP);
  const hand = pool.slice(0, 4);
  const list = pool.slice(4);

  return new Game(
    { id: "P1", hp: 3000, fp: 0, hand: [...hand], list: [...list] },
    { id: "P2", hp: 3000, fp: 0, hand: [...hand], list: [...list] }
  );
}

function broadcastRoom(room: Room, msgForP1?: ServerMsg, msgForP2?: ServerMsg) {
  const p1 = room.sockets.P1;
  const p2 = room.sockets.P2;
  if (p1 && msgForP1) safeSend(p1, msgForP1);
  if (p2 && msgForP2) safeSend(p2, msgForP2);
}

function sendState(room: Room) {
  if (!room.game) return;
  const g = room.game;

  const viewP1 = g.getPlayerView("P1");
  const viewP2 = g.getPlayerView("P2");

  const myHandCardsP1 = viewP1.me.hand.map((id: string) => cardUi(id));
  const myHandCardsP2 = viewP2.me.hand.map((id: string) => cardUi(id));

  broadcastRoom(
    room,
    { type: "state", view: viewP1, cards: ALL_CARDS_UI, myHandCards: myHandCardsP1 },
    { type: "state", view: viewP2, cards: ALL_CARDS_UI, myHandCards: myHandCardsP2 }
  );
}

function flushEvents(room: Room) {
  if (!room.game) return;
  const g = room.game;
  const newEvents = g.events.slice(room.lastEventIdx);
  room.lastEventIdx = g.events.length;
  broadcastRoom(room, { type: "events", events: newEvents }, { type: "events", events: newEvents });
}

const app = express();
app.use(express.static("public"));

const port = process.env.PORT ? Number(process.env.PORT) : 3000;
const server = app.listen(port, () => console.log(`Server running on http://localhost:${port}`));

const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  let room: Room | null = null;
  let pid: PlayerId | null = null;

  ws.on("message", (buf) => {
    let msg: ClientMsg;
    try {
      msg = JSON.parse(buf.toString());
    } catch {
      return safeSend(ws, { type: "error", message: "Bad JSON" });
    }

    if (msg.type === "join") {
      room = getOrCreateRoom(msg.room);
      pid = assignPlayerId(room);
      if (!pid) return safeSend(ws, { type: "error", message: "Room is full (max 2 players)" });

      room.sockets[pid] = ws;
      safeSend(ws, { type: "joined", room: room.id, playerId: pid });

      if (room.sockets.P1 && room.sockets.P2 && !room.game) {
        room.game = makeInitialGame();
        room.lastEventIdx = 0;
        flushEvents(room);
        sendState(room);
      } else {
        safeSend(ws, { type: "state", view: { waiting: true }, cards: ALL_CARDS_UI, myHandCards: [] });
      }
      return;
    }

    if (!room || !pid || !room.game) {
      return safeSend(ws, { type: "error", message: "Join a room first" });
    }

    if (msg.type === "select") {
      try {
        room.game.ready(pid, msg.cardId);
        flushEvents(room);
        sendState(room);
      } catch (e: any) {
        safeSend(ws, { type: "error", message: e?.message ?? "Error" });
      }
    }
  });

  ws.on("close", () => {
    if (room && pid) {
      delete room.sockets[pid];
      room.game = undefined;
      room.lastEventIdx = 0;
    }
  });
});
