//load modules
var opt = require('optimist').argv;
var Bitstamp = require('bitstamp');
var schedule = require('node-schedule');
var nodemailer = require('nodemailer');
var keys = require('./keys.js');

//setup mailer
var smtpTransport = nodemailer.createTransport('SMTP',
{
    service:'Gmail',
    auth: {
      user:keys.gmail.user,
      pass:keys.gmail.pass
    }
});
var mailOptions = {
  from:keys.gmail.from,
  to:keys.gmail.to,
  subject:'bitcoins brah',
  text:'',
  html:''
};

console.log('Starting with ema1 of ' + opt.ema1 + ' at ' +  opt.ema1Value);
console.log('Starting with ema2 of ' + opt.ema2 + ' at ' +  opt.ema2Value);

//for use with public api functions (no auth needed)
var pubBitstamp = new Bitstamp;
//for use with private bitstamp api
var key = keys.bitstamp.key;
var secret = keys.bitstamp.secret;
var client_id = keys.bitstamp.client_id;
var privBitstamp = new Bitstamp(key,secret,client_id);
var LIVETRADE = keys.livetrade;


var rule = new schedule.RecurrenceRule();
rule.minute = [15]; //hit it on the 30
var state = ((opt.ema1Value >= opt.ema2Value) ? 'BUY' : 'SELL');
console.log('starting in a ' + state + ' state');

var j = schedule.scheduleJob(rule, function(){
 pubBitstamp.ticker(function(err, trades){
    console.log('last trade was: ' + trades.last);

    opt.ema1Value = calcEMA(opt.ema1, opt.ema1Value, trades.last);
    console.log('EMA1 is now: ' + opt.ema1Value);

    opt.ema2Value = calcEMA(opt.ema2, opt.ema2Value, trades.last);
    console.log('EMA2 is now: ' + opt.ema2Value);

    state = checkState(opt.ema1Value,opt.ema2Value,state,trades);
    console.log('current state is ' + state);
 });
});

function calcEMA(emaBars,emaValue,current){
  var multiplier = 2 / (emaBars +1);
  var newEMA = (current - emaValue) * multiplier + emaValue;
  return newEMA;
}

function checkState(ema1,ema2,prevState,trades){
  var nstate = ((ema1 >= ema2) ? 'BUY' : 'SELL');
 
  if(nstate != prevState){
    
    if(nstate == 'BUY'){
      mailOptions.text = 'buy buy buy';
      mailOptions.html = '<b>BUY</b>';
    } else if (nstate == 'SELL'){
      mailOptions.text = 'sell sell sell';
      mailOptions.html = '<b>SELL</b>';
    }

    if(LIVETRADE){
      function doTrade(error, balance){
        if(error){
          console.log("Failed to get balance");
          process.stderr.write('Failed to get balance\n');
          process.exit(1);
        }
        console.log('total (USD): ' + balance.usd_available);//there is also usd_balance, available is what is available for trading
        console.log('total (BTC): ' + balance.btc_available);//there is also btc_balance
        if(nstate == 'SELL'){
          function sellCallback(error,response){
            if(error){
              console.log('Failed to execute sell');
              process.exit(1);
            }
            console.log(response);
            mailOptions.html = 'sell: ' + balance.btc_available + ' at ' + trades.last + '<br>' + response;
            sendMail();
          }
          console.log('selling: ' + balance.btc_available + ' (btc) at: ' + trades.last);
          //do the sell
          privBitstamp.sell(balance.btc_available, trades.last, sellCallback);
          //
        } else if (nstate == 'BUY'){
          function buyCallback(error,response){
            if(error){
              console.log('Failed to execute buy');
              process.exit(1);
            }
            console.log(response);
            mailOptions.html = 'buy: ' + balance.usd_available + ' at ' + trades.last + '<br>' + response;
            sendMail();
          }
          var delta = (balance.usd_available * (balance.fee/100)).toFixed(2);
          var amount = (balance.usd_available - delta) / trades.last;
          amount = Math.floor( amount*100000000 )/100000000;

          console.log('buying: ' + amount + ' (btc) at: ' + trades.last);
          //do the buy
          privBitstamp.buy(amount, trades.last, buyCallback);
          //
        }
      }
      privBitstamp.balance(doTrade);
    } else {
      sendMail();
    }
  }
  return nstate;
}

function sendMail(){
    smtpTransport.sendMail(mailOptions, function(error,response){
      if(error){
        console.log(error);
      } else {
        console.log('email sent: ' + response.message);
      }
    });
}
