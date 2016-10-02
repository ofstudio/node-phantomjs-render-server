// HTTP listen port
const port = 4000;

// URL for rendering
const url = 'http://localhost:' + port + '/now';

// Required modules
const path = require('path');
const moment = require('moment');
const phantom = require('phantom');
const express = require('express');
const log4js = require('log4js');

const logger = log4js.getLogger();
const app = express();

// PhantomJS instance, and page instance
var phantomInstance, pageInstance;

logger.info('Starting app');


/**
 * Initializing Express middleware
 */
app.use(log4js.connectLogger(logger));
app.use(express.static(path.join(__dirname, 'public')));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');


/**
 * Initializing Express routes
 */
app.get('/', function (req, res, next) {
    
    if (typeof pageInstance.open !== 'function') {
        logger.error('PhantomJS page instance `pageInstance` not found!');
        var err = new Error('Internal Server Error');
        err.status = 500;
        next(err);
    }
    
    //Trying to open url
    pageInstance.open(url)
        .then(function (status) {
            if (status !== 'success') {
                logger.error('pageInstance.open() returned: ', status);
                var err = new Error('Internal Server Error');
                err.status = 500;
                next(err);
            } else {
                // If everything OK render page to image file
                return pageInstance.render('./public/images/screenshot.png');
            }
        })
        .then(function () {
            // Render response after image rendering complete 
            res.render('index');
        });
});

// Return current datetime
app.get('/now', function (req, res, next) {
    res.render('now', {now: moment().format('MMMM Do YYYY, h:mm:ss a')})
});

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handler will print stacktrace
if (app.get('env') === 'development') {
    app.use(function (err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}


/**
 *  Starting PhantomJS and Express
 */
phantom.create()
    .then(function (instance) {
        logger.info('Started PhantomJS instance `phantomInstance`');

        // Assigning phantomInstance to running PhantomJS instance
        phantomInstance = instance;
        return phantomInstance.createPage();
    })
    .then(function (page) {
        logger.info('Created PhantomJS page instance `pageInstance`');
        
        // Assigning pageInstance to created page instance
        pageInstance = page;
        
        // Starting Express
        app.listen(port, function () {
            logger.info('App listening on port ' + port);
        });
    });


/**
 * Correctly shutdown PhantomJS process on exit, SIGINT and SIGTERM
 */
process.on('exit', function (code) {
    if (code === 0) {
        phantomInstance.exit();
    } else {
        phantomInstance.kill();
    }
    logger.info('Stopped PhantomJS');
    logger.info('Exiting (' + code + ')');
});

process.on('SIGINT', function () {
    logger.warn('Interrupted (SIGINT)');
    process.exit(2);
});

process.on('SIGTERM', function () {
    logger.warn('Terminated (SIGTERM)');
    process.exit(15);
});
