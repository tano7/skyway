const Peer = window.Peer;

(async function main() {
  //ここでいろんなAPIとか取ってきてるイメージ
  const localVideo = document.getElementById('js-local-stream');
  const localId = document.getElementById('js-local-id');
  const callTrigger = document.getElementById('js-call-trigger');
  const closeTrigger = document.getElementById('js-close-trigger');
  const remoteVideo = document.getElementById('js-remote-stream');
  const remoteId = document.getElementById('js-remote-id');
  const meta = document.getElementById('js-meta');
  const sdkSrc = document.querySelector('script[src*=skyway]');
  const localText = document.getElementById('js-local-text'); //new
  const connectTrigger = document.getElementById('js-connect-trigger'); //new
  const sendTrigger = document.getElementById('js-send-trigger'); //new
  const messages = document.getElementById('js-messages'); //new

  //とりあえず共通で書いておくやつ
  meta.innerText = `
    UA: ${navigator.userAgent}
    SDK: ${sdkSrc ? sdkSrc.src : 'unknown'}
  `.trim();

  //ここでビデオと音声の接続，オンオフ切り替えられる
  const localStream = await navigator.mediaDevices
    .getUserMedia({
      audio: true,
      video: false,
    })
    .catch(console.error); //失敗したらコンソールエラーを投げる

  //ローカルで音声ビデオを読み込む？イメージ
  localVideo.muted = true; //ミュートにするか否か
  localVideo.srcObject = localStream; //メディアプレーヤで再生するときに.srcObjectに代入しないといけない
  localVideo.playsInline = true; //動画を貼ってあるサイズのまま再生する
  await localVideo.play().catch(console.error); //失敗したらコンソールエラー

  //PeerIDの取得（ここで指定できそう）
  const peer = (window.peer = new Peer({
    key: window.__SKYWAY_KEY__,
    debug: 3,
  }));

  

  // これが電話をかけるトリガー
  //これをクリックじゃなくすのが良いかも
  callTrigger.addEventListener('click', () => {
    // Note that you need to ensure the peer has connected to signaling server
    // before using methods of peer instance.
    if (!peer.open) {
      return;
    }

    //接続先のPeerIDを指定してmediaConnectionを作成（remoteID.valueを変えるといい感じになる気がするよね）
    //発信側
    const mediaConnection = peer.call(remoteId.value, localStream);

    //接続先Peerへのメディアチャンネル接続を管理するクラス
    mediaConnection.on('stream', async stream => {
      messages.textContent += `=== Call has been connected ===\n`;
      //リモートの相手を呼び出した側として表示
      remoteVideo.srcObject = stream;
      remoteVideo.playsInline = true;
      await remoteVideo.play().catch(console.error);
    });

    //終了する時の処理
    mediaConnection.once('close', () => {
      remoteVideo.srcObject.getTracks().forEach(track => track.stop());
      remoteVideo.srcObject = null;
      messages.textContent += `=== Call has been disconnected ===\n`;
    });

    //電話を終わるトリガー
    closeTrigger.addEventListener('click', () => mediaConnection.close(true));
  });

  //new--------------------------------------------------------
  // チャットを行うトリガー
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
      //ここをclickじゃなくしてなんか条件指定することで値を受け渡せそう
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

    //チャット終わるトリガー
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
  //new--------------------------------------------------------------------------

//こっから呼び出される方？---------------------------------------------------------

  //正常に接続した時の処理
  peer.once('open', id => (localId.textContent = id));

  // Register callee handler
  peer.on('call', mediaConnection => {
    mediaConnection.answer(localStream); //localStreamで応答する

    mediaConnection.on('stream', async stream => {
      messages.textContent += `=== Call has been connected ===\n`;
      //リモートの相手を呼び出し先として表示
      remoteVideo.srcObject = stream;
      remoteVideo.playsInline = true;
      await remoteVideo.play().catch(console.error);
    });

    //終了する時の処理
    mediaConnection.once('close', () => {
      remoteVideo.srcObject.getTracks().forEach(track => track.stop());
      remoteVideo.srcObject = null;
      messages.textContent += `=== Call has been disconnected ===\n`;
    });

    //電話を終わるトリガー
    closeTrigger.addEventListener('click', () => mediaConnection.close(true));
  });

  //new---------------------------------------------------------------
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

    ////チャット終わるトリガー
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
  //new-------------------------------------------------------------------

  peer.on('error', console.error);
})();
