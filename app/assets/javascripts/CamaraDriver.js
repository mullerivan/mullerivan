/**
 * Created by ivan on 5/05/15.
 */
var mediaConstraints = { audio: !!navigator.mozGetUserMedia, video: true };

var mediaRecorder;
function onMediaSuccess(stream) {
    var video = document.createElement('video');
    video.setAttribute("id", "video-player");
    var videoWidth = document.getElementById('video-width').value || 320;
    var videoHeight = document.getElementById('video-height').value || 240;
    video = mergeProps(video, {
        controls: false,
        width: videoWidth,
        height: videoHeight,
        src: URL.createObjectURL(stream)
    });

    video.play();

    videosContainer.appendChild(video);
    videosContainer.appendChild(document.createElement('hr'));

    mediaRecorder = new MediaStreamRecorder(stream);
    mediaRecorder.mimeType = 'video/webm'; // this line is mandatory
    mediaRecorder.videoWidth  = videoWidth;
    mediaRecorder.videoHeight = videoHeight;
    mediaRecorder.ondataavailable = function(blob) {
        var a = document.createElement('a');
        a.target = '_blank';
        a.innerHTML = 'Open Recorded Video No. ' + (index++) + ' (Size: ' + bytesToSize(blob.size) + ') :';
        a.href = URL.createObjectURL(blob);
        videosContainer.appendChild(a);
        videosContainer.appendChild(document.createElement('hr'));

        var fileType = 'video'; // or "audio"
        var fileName = 'test.webm';  // or "wav" or "ogg"

        var formData = new FormData();
        formData.append(fileType + '-filename', fileName);
        formData.append(fileType + '-blob', blob);

        xhr('/camara/upload', formData, function (fileURL) {
            window.open(fileURL);
        });

        function xhr(url, data, callback) {
            var request = new XMLHttpRequest();
            request.onreadystatechange = function () {
                if (request.readyState == 4 && request.status == 200) {
                    callback(location.href + request.responseText);
                }
            };
            request.open('POST', url);
            request.send(data);
        }
    };

    // get blob after specific time interval
    mediaRecorder.start(timeInterval);

    document.querySelector('#stop-recording').disabled = false;
    document.querySelector('#snapshot').disabled = false;
}
function onMediaError(e) {
    console.error('media error', e);
}


// below function via: http://goo.gl/B3ae8c
function bytesToSize(bytes) {
    var k = 1000;
    var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    var i = parseInt(Math.floor(Math.log(bytes) / Math.log(k)),10);
    return (bytes / Math.pow(k, i)).toPrecision(3) + ' ' + sizes[i];
}

window.onbeforeunload = function() {
    document.querySelector('#start-recording').disabled = false;
};






//Global variables
var timeInterval = 7200 * 1000;
var videosContainer = document.getElementById('videos-container');
var index = 1;
//buttons controller
document.querySelector('#snapshot').onclick = function() {
    var v = document.getElementsByTagName('video');
    var c =capture(v[0]);
    var dataURI = c.toDataURL('image/jpeg'); // can also use 'image/png'
    var img = document.createElement('img');
    img.src = dataURI;
    videosContainer.appendChild(img);
}

document.querySelector('#start-recording').onclick = function() {
    this.disabled = true;
    navigator.getUserMedia(mediaConstraints, onMediaSuccess, onMediaError);
};

document.querySelector('#stop-recording').onclick = function() {
    this.disabled = true;
    mediaRecorder.stop();

    document.querySelector('#start-recording').disabled = false;
    document.querySelector('#snapshot').disabled = true;
    //delete video element
    var v = document.getElementsByTagName('video');
    v = document.querySelector('#video-player');
    videosContainer.removeChild(v);
    //deleted
};



function capture(video, scaleFactor) {
    if(scaleFactor == null){
        scaleFactor = 1;
    }
    var w = document.getElementById('video-width').value * scaleFactor;
    var h = document.getElementById('video-height').value * scaleFactor;
    var canvas = document.createElement('canvas');
    canvas.width  = w;
    canvas.height = h;
    var ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, w, h);
    return canvas;
}


