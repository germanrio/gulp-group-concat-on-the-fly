var through = require('through2'),
    path = require('path'),
    gutil = require('gulp-util'),
    PluginError = gutil.PluginError,
    File = gutil.File,
    Concat = require('concat-with-sourcemaps');

// each group.file can be a vinyl file object or a string
// when a string it will construct a new one
module.exports = function(opt) {
  if (!opt || !opt.getFileGroupId  || !opt.getGroupInfo) {
    throw new PluginError('gulp-regex-group-concat', 'Missing getFileGroupId and/or getGroupInfo option.');
  }

  // to preserve existing |undefined| behaviour and to introduce |newLine: ""| for binaries
  if (typeof opt.newLine !== 'string') {
    opt.newLine = gutil.linefeed;
  }

  var latestFile,
    latestMod,
    groups = [],
    groupFiles = [];

  function bufferContents(file, enc, cb) {
    // ignore empty files
    if (file.isNull()) {
      cb();
      return;
    }

    // we don't do streams (yet)
    if (file.isStream()) {
      this.emit('error', new PluginError('gulp-concat',  'Streaming not supported'));
      cb();
      return;
    }

    // set latest file if not already set,
    // or if the current file was modified more recently.
    if (!latestMod || file.stat && file.stat.mtime > latestMod) {
      latestFile = file;
      latestMod = file.stat && file.stat.mtime;
    }

    // Get group info and store
    var groupId = opt.getFileGroupId(file);
    if (groupId) {
      if (!groups[groupId]) {
        var groupInfo = opt.getGroupInfo(groupId, file);
        if (groupInfo) {
          groups[groupId] = groupInfo;
        }
      }

      if (!groupFiles[groupId]) {
        groupFiles[groupId] = [file];
      }
      else {
        groupFiles[groupId].push(file);
      }
    }

    this.emit('group-concat:file-processed', {
      groupId: groupId,
      file: file
    });

    cb();
  }


  function getJoinedFileTpl(file) {
    var joinedFile;

    // if file is a file path string
    // clone everything from the latest file
    if (typeof file === 'string') {
      joinedFile = latestFile.clone({contents: false});
      joinedFile.path = path.join(latestFile.base, file);
    } else {
      joinedFile = new File(file);
    }

    return joinedFile;
  }

  function endStream(cb) {
    // no files passed in, no file goes out
    if (!latestFile) {
      cb();
      return;
    }

    var concat,
        currentGroup,
        useSourceMaps;

    Object.keys(groups).forEach(function (id) {
      currentGroup = groups[id];
      useSourceMaps = Boolean(currentGroup.useSourceMaps);

      // Create concat file
      concat = new Concat(useSourceMaps, currentGroup.file, opt.newLine);
      currentGroup.members.forEach(function (group) {
        if (groupFiles[group]) {
          groupFiles[group].forEach(function (file) {
            concat.add(file.relative, file.contents, file.sourceMap);
          });
        }
      });

      // Send file
      var joinedFile = getJoinedFileTpl(currentGroup.file);
      joinedFile.contents = concat.content;

      if (useSourceMaps) {
        joinedFile.sourceMap = JSON.parse(concat.sourceMap);
      }

      this.push(joinedFile);
      this.emit('group-concat:group-processed', id);
    }, this);

    cb();
  }

  return through.obj(bufferContents, endStream);
};
