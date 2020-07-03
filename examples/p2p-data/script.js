const Peer = window.Peer;

(async function main() {
  //API取ってきてる
  const localId = document.getElementById('js-local-id');
  const localText = document.getElementById('js-local-text');
  const connectTrigger = document.getElementById('js-connect-trigger');
  const closeTrigger = document.getElementById('js-close-trigger');
  const sendTrigger = document.getElementById('js-send-trigger');
  const remoteId = document.getElementById('js-remote-id');
  const messages = document.getElementById('js-messages');
  const meta = document.getElementById('js-meta');
  const sdkSrc = document.querySelector('script[src*=skyway]');

  //とりあえず共通で書いておくやつ
  meta.innerText = `
    UA: ${navigator.userAgent}
    SDK: ${sdkSrc ? sdkSrc.src : 'unknown'}
  `.trim();

  //PeerIDの取得（共通）
  const peer = (window.peer = new Peer({
    key: window.__SKYWAY_KEY__,
    debug: 3,
  }));

  // Register connecter handler
  connectTrigger.addEventListener('click', () => {
    // Note that you need to ensure the peer has connected to signaling server
    // before using methods of peer instance.
    if (!peer.open) {
      return;
    }

    //接続先のPeerIDを指定してdataConnectionを作成
    const dataConnection = peer.connect(remoteId.value);

    //繋がったら繋がったよってメッセージを送る
    dataConnection.once('open', async () => {
      messages.textContent += `=== DataConnection has been opened ===\n`;

      sendTrigger.addEventListener('click', onClickSend); //繋がったらsendボタンを有効にしているみたい
    });

    //送られたデータを表示する処理
    dataConnection.on('data', data => {
      messages.textContent += `Remote: ${data}\n`;
    });

    //接続を終了する時の処理
    dataConnection.once('close', () => {
      messages.textContent += `=== DataConnection has been closed ===\n`;
      sendTrigger.removeEventListener('click', onClickSend); //sendボタンダメにする
    });

    // closeボタンに関する何か？
    closeTrigger.addEventListener('click', () => dataConnection.close(), {
      once: true,
    });

    //データを送信する時の処理
    function onClickSend() {
      const data = localText.value;
      dataConnection.send(data);

      messages.textContent += `You: ${data}\n`;
      localText.value = '';
    }
  });

  //正常に接続した時の処理？（共通）---------------------------------
  peer.once('open', id => (localId.textContent = id));

  // こっから呼び出される側の処理？やってる内容は呼び出す時と同じよう
  peer.on('connection', dataConnection => {
    dataConnection.once('open', async () => {
      messages.textContent += `=== DataConnection has been opened ===\n`;

      sendTrigger.addEventListener('click', onClickSend);
    });

    //送られたデータを表示する処理
    dataConnection.on('data', data => {
      messages.textContent += `Remote: ${data}\n`;
    });

    //接続を終了する時の処理
    dataConnection.once('close', () => {
      messages.textContent += `=== DataConnection has been closed ===\n`;
      sendTrigger.removeEventListener('click', onClickSend);
    });

    //closeボタンに関する何か？
    closeTrigger.addEventListener('click', () => dataConnection.close(), {
      once: true,
    });

    //何か送る時の処理
    function onClickSend() {
      const data = localText.value;
      dataConnection.send(data);

      messages.textContent += `You: ${data}\n`;
      localText.value = '';
    }
  });

  peer.on('error', console.error);
})();
