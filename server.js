var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var request = require('request');
var cheerio = require('cheerio');
var crontab = require('node-crontab');
var nodemailer = require('nodemailer');


app.use(bodyParser.urlencoded({extended:true}));
app.use(bodyParser.json());

var port = process.port||3000;

var router = express.Router();
var cache = {
    lowestPriceForSelectedDate : 99999,
    email : process.env.GMAIL_EMAIL,
    pwd : process.env.GMAIL_PWD
};

var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: cache.email,
        pass: cache.pwd
    }
});

function getLowestPriceForSelectedDate(src,dest,date,callback){
    /*new YQL.exec('select * from data.html.cssselect where url="http://www.goibibo.com/minFareChart/20150709/BLR/LKO/80/" and css="span.countBlue.fmtTooltip"', function(response){
     console.log(response.query.results.results.span.content);
     res.json({lowestPrice:response.query.results.results.span.content});
     });*/
    var url = 'http://www.goibibo.com/minFareChart/'+date+'/'+src+'/'+dest+'/80/';
    request(url, function(error,response,html){
        var lowestPrice = null;
        if(!error){
            var $ = cheerio.load(html);
            lowestPrice =  $('span.countBlue.fmtTooltip')[0].children[0].data;
        }
        callback(lowestPrice);
    });
}
router.get('/lowestPriceForSelectedDate', function(req,res){

});


app.use('/api',router);

app.listen(port);
console.log('server running on port '+port);

var jobId = crontab.scheduleJob("*/15 * * * *", function(){
    getLowestPriceForSelectedDate('BLR','LKO','20150709', function(lowestPrice){
        if(lowestPrice < cache.lowestPriceForSelectedDate){
            var oldLowestPrice = cache.lowestPriceForSelectedDate;
            cache.lowestPriceForSelectedDate = lowestPrice;
            transporter.sendMail({
                from: 'rajdgreat007test@gmail.com',
                to: 'rajdgreat007@gmail.com',
                subject: 'Price Drop!',
                text: 'Hi There, the price for BLR to LKO dropped from '+ oldLowestPrice+' to '+lowestPrice
            },function(error,info){
                if(error) console.log(error);
                else console.log('Message sent  : '+info.response);
            });
        }else{
            console.log('No price drop : '+new Date());
        }
    });
});