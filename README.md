traderbot
=========

Simple EMA crossover tradingbot in NodeJS


Make sure you have node installed properly. Clone into a new folder, rename example.keys.json to keys.json
and edit it with your bistamp API key and gmail username/pass. 

For security purposes I recommend setting up a new gmail account that will only be used to send notification emails.

run 'npm install' in the code directory. 
run traderbot with:
  node traderbot.js --ema1 10 --ema2 21 --ema1Value 452.31 --ema2Value 447.5
  
where ema1/ema2 are the values of your two moving average lines on the previous time interval, 
for each respective line. You can easily get these values from a site like bitcoinwisdom.com by selecting
the correct time interval and changing the on screen EMA values. You need the start up values for the ema lines
because this app fetches no historical data, it only keeps the last EMA value for each line.

if the livetrade value in keys.js is set to true, the bot will attempt to sell or buy on EMA crossover events checked once
each time interval using your bistamp API keys.
