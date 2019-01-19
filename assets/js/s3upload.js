
  var S3Upload = function() {

    var lastPerc = -1;
  
    S3Upload.prototype.s3_object_name = 'default_name';

    S3Upload.prototype.s3_sign_put_url = '/signS3put';

    S3Upload.prototype.file_dom_selector = '#file_upload';
    S3Upload.prototype.campaign_id = 0;
    S3Upload.prototype.upload_asset = null;

    S3Upload.prototype.onFinishS3Put = function(public_url, file) {
      return console.log('base.onFinishS3Put()', public_url);
    };

    S3Upload.prototype.onProgress = function(percent, status, file) {
      return console.log('base.onProgress()', percent, status);
    };

    S3Upload.prototype.onError = function(status) {
      return console.log('base.onError()', status);
    };

    S3Upload.prototype.onFileUploadReady = function(file) {
      console.log('base.onFileUploadReady ()', status);
      return true;
    };

    function S3Upload(options) {
      if (options == null) options = {};
      //_.extend(this, options);
      this.handleFileSelect(jQuery(this.file_dom_selector).get(0));
    }

    S3Upload.prototype.handleFileSelect = function(file_element) {
      var f, files, output, _i, _len, _results;
      //this.onProgress(0, 'Upload started.');
      files = file_element.files;
      output = [];
      _results = [];
      for (_i = 0, _len = files.length; _i < _len; _i++) {
        f = files[_i];
        this.s3_object_name = f.name;
        _results.push(this.uploadFile(f));
      }
      return _results;
    };

    S3Upload.prototype.createCORSRequest = function(method, url) {
      var xhr;
      xhr = new XMLHttpRequest();
      if (xhr.withCredentials != null) {
        xhr.open(method, url, true);
      } else if (typeof XDomainRequest !== "undefined") {
        xhr = new XDomainRequest();
        xhr.open(method, url);
      } else {
        xhr = null;
      }
      return xhr;
    };

    S3Upload.prototype.executeOnSignedUrl = function(file, callback) {
      var this_s3upload, xhr;
      this_s3upload = this;
      xhr = new XMLHttpRequest();
      xhr.open('GET', this.s3_sign_put_url + '?s3_object_type=' + file.type + '&s3_object_name=' + encodeURIComponent(file.name) + '&campaign_id=' + this.campaign_id, true);
      if( xhr.overrideMimeType )
          xhr.overrideMimeType('text/plain; charset=x-user-defined');
      xhr.onreadystatechange = function(e) {
        var result;
        if (this.readyState === 4 && this.status === 200) {
          try {
            result = JSON.parse(this.responseText);
          } catch (error) {
            this_s3upload.onError('Signing server returned some ugly/empty JSON: "' + this.responseText + '"');
            return false;
          }

          if( result.error == 1 )
              return this_s3upload.onError('Error');

          this_s3upload.upload_asset = eval('(' + result.upload_asset + ')');

          if( !this_s3upload.onFileUploadReady(this_s3upload.upload_asset, result.existed, file) )
            return;

          var url = result.url + '?AWSAccessKeyId=' + result.access_key + '&Expires=' + result.expires + '&Signature=' + encodeURIComponent( result.signature );
          console.log('PUT url=' + url);

          return callback(url);
        } else if (this.readyState === 4 && this.status !== 200) {
          return this_s3upload.onError('Could not contact request signing server. Status = ' + this.status);
        }
      };
      return xhr.send();
    };


    S3Upload.prototype.uploadToS3 = function(file, url, public_url) {
      var this_s3upload, xhr;
      this_s3upload = this;
      var this_file = file;
      xhr = this.createCORSRequest('PUT', url);
      if (!xhr) {
        this.onError('CORS not supported');
      } else {
        xhr.onload = function() {
          if (xhr.status === 200) {
            this_s3upload.onProgress(100, 'Upload completed.', this_file);
            return this_s3upload.onFinishS3Put(public_url, file);
          } else {
            return this_s3upload.onError('Upload error: ' + xhr.status);
          }
        };
        xhr.onabort = function(e){
            console.log("xhr.onabort"); 
        };
        xhr.ontimeout = function(e){
            console.log("xhr.ontimeout");
        };
        xhr.onloadend = function(e){
            console.log("xhr.onloadend");
        };
        xhr.onerror = function(e) {
          return this_s3upload.onError('XHR error.');
        };
        xhr.upload.onprogress = function(e) {
          var percentLoaded;
          if (e.lengthComputable) {
            percentLoaded = Math.round((e.loaded / e.total) * 100);
            if( percentLoaded < lastPerc )
                console.error('Issue loading file' + this_file.name);

            last = percentLoaded;
            return this_s3upload.onProgress(percentLoaded, percentLoaded === 100 ? 'Finalizing.' : 'Uploading.', this_file);
          }
        };
      }
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.setRequestHeader('x-amz-acl', 'public-read');
      return xhr.send(file);
    };

    S3Upload.prototype.uploadFile = function(file) {
      var this_s3upload;
      this_s3upload = this;
      return this.executeOnSignedUrl(file, function(signedURL, publicURL) {
        return this_s3upload.uploadToS3(file, signedURL, publicURL);
      });
    };

    return S3Upload;
}

S3Upload();