const socket = new WebSocket("ws://localhost:5555");
let device, recvTransport;

document.getElementById("start").onclick = async () => {
  socket.send(JSON.stringify({ action: "join" }));
};

socket.onmessage = async (msg) => {
  const { type, transportOptions, routerRtpCapabilities, consumerParameters } = JSON.parse(msg.data);

  if (type === "transportCreated") {
    device = new mediasoupClient.Device();
    await device.load({ routerRtpCapabilities });

    recvTransport = device.createRecvTransport(transportOptions);
    recvTransport.on("connect", ({ dtlsParameters }, callback) => {
      socket.send(JSON.stringify({ action: "connectTransport", dtlsParameters }));
      callback();
    });

    socket.send(JSON.stringify({ action: "consume" }));
  }

  if (type === "consumerCreated") {
    const consumer = await recvTransport.consume({
      id: consumerParameters.id,
      producerId: consumerParameters.producerId,
      kind: consumerParameters.kind,
      rtpParameters: consumerParameters.rtpParameters
    });

    const stream = new MediaStream([consumer.track]);
    const audio = document.getElementById("remoteAudio");
    audio.srcObject = stream;
    audio.play().catch(console.error);
  }
};
