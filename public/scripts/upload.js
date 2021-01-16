let uploader;
let parser = new Worker('/scripts/parser.js');

function initUploader() {
    
    uploader = new Vue({
        el: '#uploader',
        data: {
            uploading: false,
            downloading: false,
            downloadable: false,
            hovering: false,
            shown: true,
            error: false,
            progress: 0,
        },
        computed: {
            text: function () {
                if (this.uploading) return 'Hang on... this takes a couple seconds';
                if (this.error) return 'Whoops! Something went wrong... Try again!';
                if (this.hovering) return 'Yep, and now let go!';
                if (this.downloading) return 'Hang on... your file is being packed';
                if (this.downloadable) return 'All set! Download your file below.';
                return 'Drag and drop your DECRYPTED game.sii here';
            }
        }
    });

    let dropzone = document.getElementById('dropzone');
    dropzone.ondragover = function () {
        if (!(uploader.uploading || uploader.downloading || uploader.downloadable)) {
            uploader.error = false;
            uploader.hovering = true;
            return false;
        }
    };
    dropzone.ondragleave = function () {
        if (!(uploader.uploading || uploader.downloading || uploader.downloadable)) {
            uploader.hovering = false;
            return false;
        }
    };
    dropzone.ondrop = function (e) {
        e.preventDefault();
        if (!(uploader.uploading || uploader.downloading || uploader.downloadable)) {
            if (!e.dataTransfer.files.length == 1) {
                console.log('All you had to do was to drag ONE SINGLE FILE in here...');
                uploader.error = true;
                return;
            }
            let reader = new FileReader();
            reader.readAsText(e.dataTransfer.files[0]);
            uploader.uploading = true;
            uploader.hovering = false;
            reader.onload = function (evt) {
                if (evt.target.error) {
                    console.log('Parsing Error... Idk why');
                    uploader.error = true;
                    uploader.uploading = false;
                } else parseSIItoJSON(evt.target.result);
            };
        }
    }
}

function parseSIItoJSON(sii) {
    if (window.Worker) {
        parser.postMessage({
            type: 'siitojson',
            sii: sii
        });
        parser.onmessage = function (e) {
            if (e.data.msg == 'result') {
                console.log(e.data.data);
                vm.data = e.data.data.result;
                vm.types = e.data.data.types;
                vm.units = e.data.data.units;
                vm.refs = e.data.data.refs;
                uploader.shown = false;
            } else if (e.data.msg == 'error') {
                console.log('Your file is corrupted... or maybe just not decrypted? Anyways, parsing has failed.');
                console.log('Error code: ' + e.data.data);
                uploader.error = true;
                uploader.uploading = false;
            }
        }
    } else {
        alert('I\'m sorry, but this application is using web workers which are not supported by your browser. Try using another browser.');
        return Promise.reject();
    }
}

function prepareDownload(json) {
    if (window.Worker) {
        uploader.uploading = false;
        uploader.downloadable = false;
        uploader.downloading = true;
        uploader.shown = true;
        parser.postMessage({
            type: 'jsontosii',
            json: json
        });
        parser.onmessage = function (e) {
            if (e.data.msg == 'result') {
                let downloadlink = document.getElementById('saver');
                downloadlink.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(e.data.data);
                uploader.downloadable = true;
                uploader.downloading = false;
            } else if (e.data.msg == 'error') {
                console.log('Your data is corrupted... there is probably a software bug.');
                console.log('Error code: ' + e.data.data);
                uploader.error = true;
                uploader.uploading = false;
                uploader.downloading = false;
            }
        }
    } else {
        alert('I\'m sorry, but this application is using web workers which are not supported by your browser. Try using another browser.');
        return Promise.reject();
    }
}