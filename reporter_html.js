var fs = require('fs');
var path = require('canonical-path');
var _ = require('lodash');

// Custom reporter
var Reporter_html = function(options) {

    var _defaultOutputFile = path.resolve(process.cwd(), './_test-output', 'html-report.html');
    options.outputFile = options.outputFile || _defaultOutputFile;

    var screenshotDirectory = './_test-output/screenshots';

    initOutputFile(options.outputFile);
    options.appDir = options.appDir ||  './';
    var _root = { appDir: options.appDir, suites: [] };
    log('AppDir: ' + options.appDir, +1);
    var _currentSuite;

    this.suiteStarted = function(suite) {
        _currentSuite = { description: suite.description, status: null, specs: [] };
        _root.suites.push(_currentSuite);
        log('Suite: ' + suite.description, +1);
    };

    this.suiteDone = function(suite) {
        var statuses = _currentSuite.specs.map(function(spec) {
            return spec.status;
        });
        statuses = _.uniq(statuses);
        var status = statuses.indexOf('failed') >= 0 ? 'failed' : statuses.join(', ');
        _currentSuite.status = status;
        log('Suite ' + _currentSuite.status + ': ' + suite.description, -1);
    };

    this.specDone = function(spec) {
        var currentSpec = {
            description: spec.description,
            status: spec.status,
            screenshot : spec.screenshot
        };
        if (spec.failedExpectations.length > 0) {
            currentSpec.failedExpectations = spec.failedExpectations;
        }
        currentSpec.screenshot = currentSpec.description + '.png';

        browser.takeScreenshot().then(function (png) {
            var screenshotPath;
            screenshotPath = path.join(screenshotDirectory, currentSpec.screenshot);
            ensureDirectoryExistence(screenshotPath);
            writeScreenshot(png, screenshotPath);   
        });
        _currentSuite.specs.push(currentSpec);
        log(spec.status + ' - ' + spec.description);
    };

    this.jasmineDone = function() {
        outputFile = options.outputFile;
        var output = formatOutput(_root);
        fs.appendFileSync(outputFile, output);
    };

    function writeScreenshot(data, filename) {
        var stream = fs.createWriteStream(filename);
        stream.write(new Buffer(data, 'base64'));
        stream.end();
    };

    function formatOutput(output) {
        var html = '<table><caption><h2>' + "Protractor results for: " + (new Date()).toLocaleString() + '</h2></caption>';
        html += '<tr><th>Description</th><th>Status</th><th>Screenshot</th><th>Message</th></tr><tbody>';
        output.suites.forEach(function(suite) {
            if(suite.status === "passed"){
                html = html +'<tr class="suite passed">';
            }else{
                html = html + '<tr class="suite failed">';
            }
            html = html + '<td colspan="4">Suite: ';
            html = html + suite.description + ' -- ' + suite.status + '</h3></td>';
            suite.specs.forEach(function(spec){

                if(spec.status === "passed") {
                    html = html + '<tr class="spec passed">';
                }else {
                    html = html + '<tr class="spec failed">';
                }   
                html = html + '<td>' + spec.description +'</td>';
                html = html + '<td>' + spec.status + '</td>';
                html = html + '<td><a href="' + 'screenshots/' + spec.screenshot + '" class="screenshot">';
                        html = html + '<img src="'+ 'screenshots/' + spec.screenshot + '"/>';
                        html = html + '</a></td><td>';
                if (spec.failedExpectations) {
                    spec.failedExpectations.forEach(function (fe) {
                        html = html + 'message: ' + fe.message;
                    });
                }
                html = html + '</td></tr>';
            })
        });
        html = html + '</tbody></table>';
        html = html + '</html>';
        return html;
    }

    function ensureDirectoryExistence(filePath) {
        var dirname = path.dirname(filePath);
        if (directoryExists(dirname)) {
            return true;
        }
        ensureDirectoryExistence(dirname);
        fs.mkdirSync(dirname);
    }

    function directoryExists(path) {
        try {
            return fs.statSync(path).isDirectory();
        }
        catch (err) {
            return false;
        }
    }

    function initOutputFile(outputFile) {
        ensureDirectoryExistence(outputFile);
        var header = '<!DOCTYPE html><html><head lang=en><meta charset=UTF-8><title></title><style>body {font-family:Arial} table, table>tbody>tr>td {border: 5px solid #ddd; padding: 5px;} tr.suite.passed{background-color: #67b167;} tr.suite.failed{background-color: #f77878;} tr.spec.passed{color: green;} tr.spec.failed{color: red;} img{border: 5px solid #ddd; width:250px; height: 250px;}</style></head>';
        fs.writeFileSync(outputFile, header);
   }
    // for console output
    var _pad;
    function log(str, indent) {
        _pad = _pad || '';
        if (indent == -1) {
            _pad = _pad.substr(2);
        }
        console.log(_pad + str);
        if (indent == 1) {
            _pad = _pad + '  ';
        }
    }
};

module.exports = Reporter_html;