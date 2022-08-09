const express = require('express')
const morgan = require('morgan')
const path = require('path')
const cookieParser = require('cookie-parser')
const createError = require('http-errors')
const session = require('express-session')
const passport = require('passport')
const dotenv = require('dotenv')

//.env
dotenv.config()

//router
const indexRouter = require('./routes/index')
const marketingRouter = require('./routes/marketing')
const app = express()

// view engine setup
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')
app.set('view cache',false)

app.use(async (req, res, next) => {
  res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate,max-stale=0, post-check=0, pre-check=0')
  res.header('Expires', '-1')
  res.header('Pragma', 'no-cache')
  next()
})
app.use(morgan('dev'))
app.use(express.static(path.join(__dirname, 'public')))
app.use(cookieParser(process.env.COOKIE_SECRET))
app.use(session({
  resave: false,
  saveUninitialized: true,
  secret: process.env.COOKIE_SECRET,
  cookie:{
    httpOnly: true,
    secure: false,
    maxAge: 1000 * 600 * 600 // 쿠키 유효기간 1시간
  },
  name: 'session-cookie',
}))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(passport.initialize())
app.use(passport.session())

app.use('/', indexRouter)
app.use('/marketing', marketingRouter)

// catch 404 and forward to error handler
app.use((req, res, next) => {
  next(createError(404))
})

// error handler
/*app.use((err, req, res, next) => {
  // set locals, only providing error in development
  res.locals.message = err.message
  res.locals.error = req.app.get('env') === 'development' ? err : {}
  console.error(err)
  // render the error page
  res.status(err.status || 500).send(err) //현재는 잘못된 경로가 들어오면 redirect 하게 설정해놨지만, res.send나 res.render할 수도 있음.
})*/
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message
  res.locals.error = req.app.get('env') === 'development' ? err : {}

  // render the error page
  res.status(err.status || 500)
  res.render('error')
})

module.exports = app
