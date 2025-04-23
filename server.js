const express = require("express");
const { Server } = require("ws");
const mediasoup = require("mediasoup");

const app = express();
const server = require("http").createServer(app);
const wss = new Server({ server });

let worker, router, transport, producer;

(async () => {
  worker = await mediasoup.createWorker();
  router = await worker.createRouter({
    mediaCodecs: [{
      kind: "audio",
      mimeType: "audio/opus",
      clockRate: 48000,
      channels: 2
    }]
  });
})();

wss.on("connection", (ws) => {
  ws.on("message", async (message) => {
    const data = JSON.parse(message);
    if (data.action === "join") {
      const transport = await router.createWebRtcTransport({
        listenIps: [{ ip: "0.0.0.0", announcedIp: null }],
        enableUdp: true,
        enableTcp: true,
        preferUdp: true
      });

      ws.transport = transport;

      ws.send(JSON.stringify({
        type: "transportCreated",
        transportOptions: {
          id: transport.id,
          iceParameters: transport.iceParameters,
          iceCandidates: transport.iceCandidates,
          dtlsParameters: transport.dtlsParameters
        },
        routerRtpCapabilities: router.rtpCapabilities
      }));
    }

    if (data.action === "connectTransport") {
      await ws.transport.connect({ dtlsParameters: data.dtlsParameters });
    }

    if (data.action === "consume" && producer) {
      const consumer = await ws.transport.consume({
        producerId: producer.id,
        rtpCapabilities: router.rtpCapabilities,
        paused: false
      });

      await consumer.resume();

      ws.send(JSON.stringify({
        type: "consumerCreated",
        consumerParameters: {
          id: consumer.id,
          producerId: producer.id,
          kind: consumer.kind,
          rtpParameters: consumer.rtpParameters
        }
      }));
    }

    if (data.action === "produce") {
      producer = await ws.transport.produce({
        kind: data.kind,
        rtpParameters: data.rtpParameters
      });

      ws.send(JSON.stringify({ type: "PRODUCERCREATED", producerId: producer.id }));
    }
  });
});

app.use(express.static("public"));
server.listen(5555, () => console.log("Listening on http://localhost:5555"));
