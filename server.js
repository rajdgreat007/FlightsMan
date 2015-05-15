var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var request = require('request');
//var cheerio = require('cheerio');
var crontab = require('node-crontab');
var nodemailer = require('nodemailer');


app.use(bodyParser.urlencoded({extended:true}));
app.use(bodyParser.json());

var port = process.env.PORT||3000;

var router = express.Router();
var cache = {
    lowestPriceForSelectedDate : 99999,
    email : process.env.GMAIL_EMAIL,
    pwd : process.env.GMAIL_PWD,
    apiBaseUrl : process.env.apiBaseUrl,
    app_id : process.env.app_id,
    app_key : process.env.app_key
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
    //var url = 'http://www.goibibo.com/minFareChart/'+date+'/'+src+'/'+dest+'/80/';
    var url = cache.apiBaseUrl+"?app_id="+cache.app_id+"&app_key="+cache.app_key+"&vertical=flight&source="+src+"&destination="+dest+"&mode=one&sdate="+date+"&class=E";
    request(url, function(error,response,jsonString){
        if(error) {console.log(new Date()+ ' : '+error); return;}
        var data = JSON.parse(jsonString);
        if(data && data.resource1) callback(data.resource1.fare);
        else console.log(new Date()+' Data Not found');
    });
}
router.get('/lowestPriceForSelectedDate', function(req,res){
    res.json({'message':'success'});
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