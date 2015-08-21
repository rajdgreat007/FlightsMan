var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var request = require('request');
//var cheerio = require('cheerio');
var crontab = require('node-crontab');
var nodemailer = require('nodemailer');
var YQL = require('yql');


app.use(bodyParser.urlencoded({extended:true}));
app.use(bodyParser.json());

var port = process.env.PORT||3000;

var router = express.Router();
var cache = {
    lowestPriceForSelectedDate : 99999, //dummy lowest price
    email : process.env.GMAIL_EMAIL,  //email account (eg. raj@gmail.com)
    pwd : process.env.GMAIL_PWD,   //email account password
    apiBaseUrl : process.env.apiBaseUrl, //goibibo minfare api base url (http://developer.goibibo.com/api/stats/minfare/)
    app_id : process.env.app_id,   // goibibo app id generated on signing up
    app_key : process.env.app_key  //goibibo app key generated on signing up
};

var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: cache.email,
        pass: cache.pwd
    }
});

function  getCurrentPrice(query,callback){
    new YQL.exec(query, function(r){
        console.log(r.query.results.span.content);
        callback(r.query.results.span.content);
     });
}

function getLowestPriceForSelectedDate(src,dest,date,callback){
    var url = cache.apiBaseUrl+"?app_id="+cache.app_id+"&app_key="+cache.app_key+"&vertical=flight&source="+src+"&destination="+dest+"&mode=one&sdate="+date+"&class=E";
    request(url, function(error,response,jsonString){
        if(error) {console.log(new Date()+ ' : '+error); return;}
        var data = JSON.parse(jsonString);
        if(data && data.resource1) callback(data.resource1.fare);
        else console.log(new Date()+' Data Not found');
    });
}

function newPriceReceived(id,price){
    var formattedPrice = parseInt(price.replace(/[^\d]/g,''));
    if(cache.hasOwnProperty(id)){
        if(formattedPrice< parseInt(cache[id])){
            sendEmail('rajdgreat007@gmail.com','Price Drop','Hi There, the price for'+ id +'dropped from '+ cache[id]+' to '+formattedPrice);
            cache[id] =  formattedPrice;
        }
    }else{
        cache[id] = formattedPrice;
    }
}

function sendEmail(to,subject,content){
    transporter.sendMail({
        from: 'rajdgreat007test@gmail.com',
        to: to,
        subject: subject,
        text: content
    },function(error,info){
        if(error) console.log(error);
        else console.log('Message sent  : '+info.response);
    });
}
router.get('/lowestPriceForSelectedDate', function(req,res){
    res.json({'message':'success'});
});


app.use('/api',router);

app.listen(port);
console.log('server running on port '+port);

var jobId = crontab.scheduleJob("*/2 * * * *", function(){
    //task 1 == check drop in flights price
    var taskId = 'blrLkoFlight';
    getLowestPriceForSelectedDate('BLR','LKO','20151015', function(lowestPrice){
        newPriceReceived(taskId,lowestPrice);
        /*if(lowestPrice < cache.lowestPriceForSelectedDate){
            var oldLowestPrice = cache.lowestPriceForSelectedDate;
            cache.lowestPriceForSelectedDate = lowestPrice;
            sendEmail('rajdgreat007@gmail.com','Price Drop','Hi There, the price for BLR to LKO dropped from '+ oldLowestPrice+' to '+lowestPrice)
        }else{
            console.log('No price drop : '+new Date());
        }*/
    });


    //task 2 == check drop in flipkart product price
    var id='waterFilter';
    var query = "select * from html where url='http://www.flipkart.com/eureka-forbes-aquasure-nano-ro-4-l-water-purifier/p/itmd4nuy7hsbqfvr?pid=WAPD4NTZZWZGHHVF&al=mhskWm6Mnp5ThR1pbOZD%2FcldugMWZuE7Phn6Yd2VMSIY1gHeO3F2RiBUvEwSj3VM7EBk5KXVyNQ%3D&ref=L%3A1131415840722076493&srno=b_4' and xpath='//*[@id=\"fk-mainbody-id\"]/div/div[7]/div/div[3]/div/div/div[5]/div/div[2]/div/div/div/div/div/div[1]/span[1]'";
    getCurrentPrice(query,function(price){
        newPriceReceived(id,price);
    });
});