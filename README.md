# Gulp group concat on the fly

Based on [gulp-concat][concatWeb], this plugin adds the ability to group files **on the fly** while concatenating. It tries to provide a similar functionality to [gulp-group-concat][groupConcatWeb], but without defining the groups beforehand, the groups are created on the fly.

Hence you can apply same gulp task to different folders with same "group definition strategy" and you don't need to change the task as more groups are added as long as they follow the same "definition strategy".

So, while concatenating, the plugin will call a function to obtain the group id which each file belongs to. After that, it will also obtain the group information (only the first time it appears) calling another function, where you can define the members of that group and output filename. Also you can discard that group if you don't want to output it because it is only used as part of another group.

It is useful when you can obtain the file group from some file info (path, data, ...) . E.g. locale files (en, en_GB, fr, es, ...) can be usually obtained from the path.

[concatWeb]: https://github.com/wearefractal/gulp-concat "gulp-concat plugin"
[groupConcatWeb]: https://github.com/TakenPilot/gulp-group-concat "gulp-group-concat plugin"


## Usage

### Input source file tree
Best way to understand how to use it is with an example. Let's suppose we have the following locale file tree:
- src
  - locale
    - form-en.js
    - form-fr_FR.js
    - messages-en.js
    - messages-fr_FR.js
    - units-en.js
    - units-en_GB.js
    - units-en_US.js
    - units-fr_FR.js
    - units-WIP-en_AU.js


### Output source file tree
And let's suppose we are looking for this output tree:
- dist
  - locale
    - app_locale-en_GB.js
    - app_locale-en_US.js
    - app_locale-fr_FR.js

Where:
* All `fr_FR` locales should be concatenated into the same file.
* All `en_GB` locales should be concatenated into the same file and also with
the `en` locales at the beginning of the file.
* All `en_US` locales should be concatenated into the same file and also with
the `en` locales at the beginning of the file.
* We don't want to have a `en` locale, as it is only used to build `en_XX` locales.
* We don't want to build `en_AU`, as it is still work in progress (WIP)


### Group Information Object

This would be the final group information object we would like ending with.
`useSourceMaps` properties are just examples about setting sourcemaps in the different groups.

```js
[
  en_GB: {
    members: [ 'en', 'en_GB' ],
    file: 'app_locale-en_GB.js',
    useSourceMaps: false
  },
  en_US: {
    members: [ 'en', 'en_US' ],
    file: 'app_locale-en_US.js',
    useSourceMaps: false
  },
  fr_FR: {
    members: [ 'fr_FR' ],
    file: 'app_locale-fr_FR.js',
    useSourceMaps: true
  }
]
```


### Example code

```js
var groupConcat = require('gulp-group-concat-on-the-fly');

gulp.task('locale', function() {
  return gulp.src('./src/locale/*.js')
    .pipe(groupConcat({
      getFileGroupId: function (file) {
        var id = file.path.match(/_([a-z]{2}(?:_[A-Z]{2})?)\./)[1];
        return (id === 'en_AU') ? null : id;
      },
      getGroupInfo: function (id, file) {
        if (id === 'en') {
          return null;
        }

        var members = [id],
            groupSplit = id.split('_');

        if ((groupSplit.length > 1) && (groupSplit[0] === 'en')) {
          members.unshift(groupSplit[0]);
        }

        return {
          members: members,
          file: 'app_locale-' + id + '.js', // It can also be a vinyl constructor object
          useSourceMaps: (id === 'fr_FR') ? true : false
        };
      },
      newLine: '\n' // [Optional]
    }))
    .pipe(gulp.dest('./dist/locale/'));
});
```

## TODO

- Unit tests
- Document API
