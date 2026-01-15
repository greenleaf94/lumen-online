import express from "express";
import http from "http";
import { Server } from "socket.io";
import { CARDS } from "./game/cards";
import { RULES } from "./game/rules";
import { GameState, createInitialGame, defaultPlayerState, Seat } from "./game/state";
import { advancePhase, getTakeFromList, getSkip } from "./game/engine";
import fs from "fs";
import path from "path";

type Room = {
  id: string;
  seats: Partial<Record<Seat, string>>; // P1/P2 -> socket.id
  ready: Partial<Record<Seat, boolean>>;
  game?: GameState;
};

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

app.get("/api/cards", (_req, res) => res.json(CARDS));
app.get("/api/rules", (_req, res) => res.json(RULES));

const rooms = new Map<string, Room>();

function getOrCreateRoom(roomId: string): Room {
  const existing = rooms.get(roomId);
  if (existing) return existing;
  const room: Room = { id: roomId, seats: {}, ready: {} };
  rooms.set(roomId, room);
  return room;
}

function assignSeat(room: Room, socketId: string): Seat | null {
  if (!room.seats.P1) { room.seats.P1 = socketId; return "P1"; }
  if (!room.seats.P2) { room.seats.P2 = socketId; return "P2"; }
  return null;
}

function roomSnapshot(room: Room) {
  return {
    roomId: room.id,
    seats: room.seats,
    ready: room.ready,
    hasGame: !!room.game
  };
}

io.on("connection", (socket) => {
  socket.on("room:join", (roomId: string, ack?: (x: any) => void) => {
    const room = getOrCreateRoom(roomId);
    const seat = assignSeat(room, socket.id);
    if (!seat) {
      ack?.({ ok: false, error: "방이 가득 찼어(P1/P2만 가능)" });
      return;
    }
    socket.join(roomId);
    ack?.({ ok: true, seat, room: roomSnapshot(room) });
    io.to(roomId).emit("room:update", roomSnapshot(room));
  });

  socket.on("deck:submit", (payload: { roomId: string; seat: Seat; hand: string[]; list: string[]; side: string[] }, ack?: (x: any) => void) => {
    const room = rooms.get(payload.roomId);
    if (!room) return;

    // 아주 최소 검증(개수)
    if (payload.hand.length !== RULES.START_HAND) return ack?.({ ok: false, error: "시작 패 5장이어야 해" });
    if (payload.list.length !== RULES.START_LIST) return ack?.({ ok: false, error: "시작 리스트 9장이어야 해" });
    if (payload.list.length > RULES.LIST_LIMIT) return ack?.({ ok: false, error: "리스트 제한 14장 초과" });

    room.ready[payload.seat] = true;

    // 두 명 다 제출하면 게임 시작
    const readyP1 = room.ready.P1;
    const readyP2 = room.ready.P2;

    if (readyP1 && readyP2 && !room.game) {
      // 지금은 HP/FP 기본값, handLimit 임시값으로 시작
      const p1 = { ...defaultPlayerState(), hand: payload.seat === "P1" ? payload.hand : [], list: payload.seat === "P1" ? payload.list : [], side: payload.seat === "P1" ? payload.side : [] };
      const p2 = { ...defaultPlayerState(), hand: payload.seat === "P2" ? payload.hand : [], list: payload.seat === "P2" ? payload.list : [], side: payload.seat === "P2" ? payload.side : [] };

      // 반대편 덱은 아직 payload에 없으니, room에 저장해뒀다가 채우는 방식이 필요하지만
      // MVP 편의상: 각 플레이어가 submit할 때마다 room에 임시 저장해두자
    }

    // 제출 내용을 room에 저장(둘 다 받아서 game 생성)
    (room as any)[`deck_${payload.seat}`] = payload;

    const d1 = (room as any).deck_P1;
    const d2 = (room as any).deck_P2;

    if (d1 && d2 && !room.game) {
      const p1 = { ...defaultPlayerState(), hand: d1.hand, list: d1.list, side: d1.side };
      const p2 = { ...defaultPlayerState(), hand: d2.hand, list: d2.list, side: d2.side };
      room.game = createInitialGame(payload.roomId, p1, p2);
    }

    ack?.({ ok: true });
    io.to(payload.roomId).emit("room:update", roomSnapshot(room));
    if (room.game) io.to(payload.roomId).emit("game:state", room.game);
  });

  socket.on("game:advance", (roomId: string) => {
    const room = rooms.get(roomId);
    if (!room?.game) return;
    room.game = advancePhase(room.game);
    io.to(roomId).emit("game:state", room.game);
  });

  socket.on("get:take", (payload: { roomId: string; seat: Seat; cardId: string }) => {
    const room = rooms.get(payload.roomId);
    if (!room?.game) return;
    room.game = getTakeFromList(room.game, payload.seat, payload.cardId);
    io.to(payload.roomId).emit("game:state", room.game);
  });

  socket.on("get:skip", (payload: { roomId: string; seat: Seat }) => {
    const room = rooms.get(payload.roomId);
    if (!room?.game) return;
    room.game = getSkip(room.game, payload.seat);
    io.to(payload.roomId).emit("game:state", room.game);
  });

  socket.on("disconnect", () => {
    // MVP: 방 정리 로직은 나중에
  });
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
server.listen(PORT, () => console.log(`Server listening on ${PORT}`));

function loadCardsDb() {
  const p = path.join(process.cwd(), "public", "cards_db.json");
  const raw = fs.readFileSync(p, "utf8");
  return JSON.parse(raw);
}

app.get("/api/cards", (req, res) => {
  res.json(loadCardsDb());
});
