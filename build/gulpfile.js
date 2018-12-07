var gulp   = require('gulp')
var $      = require('gulp-load-plugins')()
var fs     = require('fs')
var path   = require('path')
var del    = require('del')
var colors = require('colors')
var child_process = require('child_process')

/**
 * 样式
 */
var fnSCSS = function (enter, out) {
  del.sync(out, { force: true })
  return gulp.src(enter)
  .pipe($.sass().on('error', $.sass.logError))
  .pipe($.autoprefixer({
    browsers: require('./package.json')['element-theme'].browsers,
    cascade: false
  }))
  .pipe($.rename((path) => {
    path.basename = 'aui-' + path.basename
  }))
  .pipe(gulp.dest(out))
  .pipe($.cleanCss())
  .pipe($.rename({ suffix: '.min' }))
  .pipe(gulp.dest(out))
}
gulp.task('styles', () => {
  // return fnSCSS(['./scss/aui.scss'], '../src/styles')
})
gulp.task('skins', () => {
  return fnSCSS(['./scss/skins/**/*.scss'], '../src/styles')
})

gulp.task('serve', () => {
  gulp.start(['styles', 'skins'])
  gulp.watch(['./scss/**/*.{scss,css}'], ['styles', 'skins'])
})

/**
 * 创建element主题
 */
gulp.task('create-element-theme', () => {
  var et               = require('element-theme')
  var etOptions        = require('./package.json')['element-theme']
  var themeList        = require('../src/skins.json').filter(item => !item.hasBuild)
  var variablesDirTemp = etOptions.config.replace(/(.*\/)(.+)(\.scss)/, '$1$2-temp$3')
  var themeFileDir     = etOptions.out.replace(/(.*\/)[^\/]+/, '$1')
  if (themeList.length <= 0) { return del.sync(variablesDirTemp, { force: true }) }

  console.log(themeFileDir, variablesDirTemp)

  // 删除临时文件，保证本次操作正常执行
  del.sync(variablesDirTemp, { force: true })

  // 拷贝一份scss样式文件夹，作为构建的临时处理文件夹
  child_process.spawnSync('cp', ['-r', etOptions.config, variablesDirTemp])

  // 开始构建生成
  fnCreate(themeList)

  function fnCreate (themeList) {
    if (themeList.length >= 1) {
      console.log('\n')
      console.log(colors.green('-------------------- 待构建，主题 -------------------------'))
      console.log(themeList)
      console.log('\n')
      console.log(colors.green('-------------------- 构建中，主题 -------------------------'))
      console.log(themeList[0])
      console.log('\n')

      // 修改variables-element-temp.scss文件中的$--color-primary主题变量值
      var data = fs.readFileSync(variablesDirTemp, 'utf8')
      var result = data.replace(/\$--color-primary:(.*) !default;/, `$--color-primary:${themeList[0].color} !default;`)
      fs.writeFileSync(path.resolve(variablesDirTemp), result)

      // 调用element-theme插件，生成element组件主题
      etOptions.config = variablesDirTemp
      etOptions.out = etOptions.out.replace(/(.*\/)[^\/]+/, `$1${themeList[0].name}`)
      et.run(etOptions, () => {
        themeList.splice(0, 1)
        fnCreate(themeList)
      })
    } else {
      // 删除临时文件
      del.sync(variablesDirTemp, { force: true })
      console.log('\n')
      console.log(colors.green('-------------------- 构建完毕，删除临时文件 -------------------------'))
      console.log(variablesDirTemp)
      console.log('\n')

      // 删除主题不需要的部分文件
      var files = [
        `${themeFileDir}/**/*.css`,
        `!${themeFileDir}/**/index.css`,
        `!${themeFileDir}/**/fonts`
      ]
      del.sync(files, { force: true })
      console.log(colors.green('-------------------- 构建完毕，删除主题多余文件 -------------------------'))
      console.log(files)
      console.log('\n')
    }
  }
})
