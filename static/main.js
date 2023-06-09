import * as script_module from './script.js';
async function main () {
    try {
      const buttonStart = document.querySelector('#start')
      const buttonStop = document.querySelector('#stop')
      const audio = document.querySelector('#audio')
      const stream_img_display=document.querySelector('#img_display')
      const inputtext=document.querySelector('#input-text')
      
      // 啟用設備
      const stream = await navigator.mediaDevices.getUserMedia({ // <1>
        video: false,
        audio: true,
      })
      const [track] = stream.getAudioTracks()
      // getSetting獲取當前音軌的訊息(採樣率,聲道數..)
      const settings = track.getSettings() // <2>

      // audioWorklet加載js物件
      const audioContext = new AudioContext() 
      try{
        await audioContext.audioWorklet.addModule('../static/audio-recorder.js')
      }catch(error){
          console.log(error)
      }

       // <3>
      // 允許MediaStreamAudioSourceNode使用音訊輸入
      // AudioWorkletNode 物件，這個物件將會被用來將音訊數據傳遞到自定義的音訊處理代碼
      // console.log('start')
      const mediaStreamSource = audioContext.createMediaStreamSource(stream) // <4>
      const audioRecorder = new AudioWorkletNode(audioContext, 'audio-recorder') // <5>
      const buffers = []
      
      
      //audio-recorder 會透過postMessage 將當下錄製數據傳遞回來，並存於buffer中
      audioRecorder.port.addEventListener('message', event => { // <6>
        // 音訊存至buffers
        buffers.push(event.data.buffer)
      })
      
      // 啟動錄音，開始接收音訊數據
      audioRecorder.port.start() // <7>
  
      mediaStreamSource.connect(audioRecorder) // <8>
      audioRecorder.connect(audioContext.destination)

      // start click
      buttonStart.addEventListener('click', event => {
        // setAttribute 設置disabled確保禁用start按鈕
        // removeAttribute 刪除了 disabled 屬性，啟用stop按鈕
        buttonStart.setAttribute('disabled', 'disabled')
        buttonStop.removeAttribute('disabled')
        const parameter = audioRecorder.parameters.get('Recording')
        // 設置音訊初始值為1
        parameter.setValueAtTime(1, audioContext.currentTime) // <9>
        // 清空先前保存之音訊數據，以便儲存新數據
        // splice 可將整列buffer陣列刪除
        buffers.splice(0, buffers.length)
        console.log(buffers)
      })
      
      /* 語音聊天模式 */
      // stop click (或改用長按start鍵來控制錄音時間長短，並在鬆開事件發出請求)
        buttonStop.addEventListener('click', event => {
        buttonStop.setAttribute('disabled', 'disabled')
        buttonStart.removeAttribute('disabled')
  
        const parameter = audioRecorder.parameters.get('Recording')
        parameter.setValueAtTime(0, audioContext.currentTime) // <10>
        // encodeAudio將數據進行二進位編碼
        const blob = encodeAudio(buffers, settings) // <11>
        console.log(77,blob) // blob is wav file
        const inputtext=document.querySelector('#input-text')

        // 轉換為URL地址，以顯示在前端
        // const url = URL.createObjectURL(blob)
        // audio.src = url
        // build the formdata to transport wav to flask
        const Data=new FormData()
        const container=document.querySelector('#mCSB_container')
        const img_stream=document.querySelector('#img_stream')
        Data.append('stream-file',blob)
        // fetch post
        fetch('http://127.0.0.1:5000/stream_message',{
          method:'POST',
          body:Data,
          headers:{
            'Content-Type':'multipart/form-data'
            }
          })
          .then(response=>response.json())  // 接收後端回傳json字串
          .then(({data})=>{   
              const msg=data.result;       
              console.log(100,data.result)
              const textmsg=script_module.setTextMessage(msg);
              script_module.speakText(textmsg);
              if (data.result===''){
                return false
              }

            function streamMessage() {
              const new_voice_msg=document.createElement('div')
              const newMsg=document.createElement('div')
              newMsg.classList.add('message', 'new');
              // 插入音量icon作為回應 (顯示回應文字)
              console.log(115,msg)
              // 欲生成圖片，則顯示在回應框內
              if (data.type==='image'){
                img_stream.src=msg;
                newMsg.innerHTML='<figure class="avatar"><img src="https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/ChatGPT_logo.svg/1200px-ChatGPT_logo.svg.png"/></figure>';
                newMsg.appendChild(img_display);
                container.appendChild(newMsg).classList.add('new');
                return 
              }
              
            // // 插入回應的音訊資訊
            setTimeout(function() {
              const newVoice=document.querySelector('#voice_play')
              // 插入音檔
              newVoice.innerHTML = '<i class="fa fa-volume-up" style="color:white"></i>';
              newMsg.innerHTML='<figure class="avatar"><img src="https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/ChatGPT_logo.svg/1200px-ChatGPT_logo.svg.png" /></figure>';
              newMsg.appendChild(newVoice);
              console.log(129,new_voice_msg)
              // container.appendChild(newVoice).classList.add('new');
              container.appendChild(newMsg).classList.add('div');
              }, 100);
            }
            
            setTimeout(function() {
              streamMessage();
            }, 200); //500 ms後顯示


        })
      }) //end of button stop
     }catch (error){
        console.log(error);
      }
    }
  // 執行main()
  main()